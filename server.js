const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();
const OPEN_ADMIN_ACCESS = (process.env.OPEN_ADMIN_ACCESS || 'true').trim().toLowerCase() === 'true';
const DATA_FILE = path.join(__dirname, 'data', 'apps.json');
let runtimeAdminPassword = ADMIN_PASSWORD;

const sessions = new Map();

app.use(express.json({ limit: '2mb' }));

function issueToken() {
  return crypto.randomBytes(24).toString('hex');
}

function isValidSession(token) {
  const session = sessions.get(token);
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req, res, next) {
  if (OPEN_ADMIN_ACCESS) {
    next();
    return;
  }

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !isValidSession(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

async function readApps() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeApps(apps) {
  await fs.writeFile(DATA_FILE, JSON.stringify(apps, null, 2), 'utf8');
}

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

app.get('/api/admin/setup-status', (_, res) => {
  if (OPEN_ADMIN_ACCESS) {
    return res.json({ isSetup: true, managedBy: 'open' });
  }

  res.json({
    isSetup: !!runtimeAdminPassword,
    managedBy: ADMIN_PASSWORD ? 'env' : (runtimeAdminPassword ? 'runtime' : 'none')
  });
});

app.get('/api/downloads/files', async (_, res) => {
  try {
    const downloadsDir = path.join(__dirname, 'downloads');
    const entries = await fs.readdir(downloadsDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name !== 'files.json');

    if (files.length > 0) {
      return res.json(files);
    }

    try {
      const manifestRaw = await fs.readFile(path.join(downloadsDir, 'files.json'), 'utf8');
      const manifest = JSON.parse(manifestRaw);
      return res.json(Array.isArray(manifest) ? manifest : []);
    } catch {
      return res.json([]);
    }
  } catch {
    return res.json([]);
  }
});

app.post('/api/admin/setup', (req, res) => {
  if (OPEN_ADMIN_ACCESS) {
    return res.status(200).json({ ok: true, message: 'Open admin access is enabled.' });
  }

  if (ADMIN_PASSWORD) {
    return res.status(409).json({
      error: 'Admin password is managed by environment variable ADMIN_PASSWORD.'
    });
  }

  if (runtimeAdminPassword) {
    return res.status(409).json({ error: 'Admin password is already configured.' });
  }

  const { password, confirmPassword } = req.body || {};
  const first = String(password || '');
  const second = String(confirmPassword || '');

  if (first.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  if (first !== second) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  runtimeAdminPassword = first;
  res.status(201).json({ ok: true });
});

app.post('/api/admin/login', (req, res) => {
  if (OPEN_ADMIN_ACCESS) {
    const token = issueToken();
    sessions.set(token, { expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    return res.json({ token, mode: 'open' });
  }

  const { password } = req.body || {};
  const inputPassword = String(password || '');

  // Backward-compatible bootstrap for one-field login screen.
  if (!runtimeAdminPassword) {
    if (inputPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    runtimeAdminPassword = inputPassword;
  }

  if (!inputPassword || inputPassword !== runtimeAdminPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = issueToken();
  sessions.set(token, { expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
  res.json({ token });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/apps', async (_, res) => {
  const apps = await readApps();
  res.json(apps);
});

app.post('/api/apps/:id/download', async (req, res) => {
  const appId = Number(req.params.id);
  const apps = await readApps();
  const target = apps.find((a) => a.id === appId);
  if (!target) {
    return res.status(404).json({ error: 'App not found' });
  }

  target.downloads = (target.downloads || 0) + 1;
  await writeApps(apps);
  res.json({ ok: true, downloads: target.downloads });
});

app.post('/api/apps', requireAdmin, async (req, res) => {
  const body = req.body || {};
  if (!body.name || !body.version || !body.description || !body.fileName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apps = await readApps();
  const nextId = apps.length ? Math.max(...apps.map((a) => a.id || 0)) + 1 : 1;
  const appItem = {
    id: nextId,
    name: String(body.name).trim(),
    version: String(body.version).trim(),
    description: String(body.description).trim(),
    fileName: String(body.fileName).trim(),
    downloadUrl: body.downloadUrl || `/downloads/${String(body.fileName).trim()}`,
    changelog: Array.isArray(body.changelog) ? body.changelog : ['Initial release'],
    downloads: 0
  };

  apps.push(appItem);
  await writeApps(apps);
  res.status(201).json(appItem);
});

app.put('/api/apps/:id', requireAdmin, async (req, res) => {
  const appId = Number(req.params.id);
  const updates = req.body || {};

  const apps = await readApps();
  const index = apps.findIndex((a) => a.id === appId);
  if (index === -1) {
    return res.status(404).json({ error: 'App not found' });
  }

  const current = apps[index];
  const next = {
    ...current,
    ...updates,
    id: current.id,
    fileName: updates.fileName ? String(updates.fileName).trim() : current.fileName,
    downloadUrl: updates.fileName
      ? `/downloads/${String(updates.fileName).trim()}`
      : (updates.downloadUrl || current.downloadUrl)
  };

  apps[index] = next;
  await writeApps(apps);
  res.json(next);
});

app.delete('/api/apps/:id', requireAdmin, async (req, res) => {
  const appId = Number(req.params.id);
  const apps = await readApps();
  const index = apps.findIndex((a) => a.id === appId);
  if (index === -1) {
    return res.status(404).json({ error: 'App not found' });
  }

  apps.splice(index, 1);
  await writeApps(apps);
  res.json({ ok: true });
});

app.get('/admin', (_, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin-access', (_, res) => {
  res.sendFile(path.join(__dirname, 'admin-access.html'));
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Vitech SAS Downloader running on port ${PORT}`);
});
