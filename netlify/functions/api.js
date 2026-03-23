const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();
const TOKEN_SECRET = process.env.ADMIN_JWT_SECRET || 'change-this-admin-jwt-secret';
const OPEN_ADMIN_ACCESS = (process.env.OPEN_ADMIN_ACCESS || 'true').trim().toLowerCase() === 'true';
const APPS_KEY = 'apps.json';
const ADMIN_PASSWORD_KEY = 'admin-password.json';
const store = getStore('vitech-sas-downloader');

const DEFAULT_APPS = [
  {
    id: 1,
    name: 'SAS Application Pro',
    version: '2.5.0',
    description: 'Advanced analytics and reporting tool for business intelligence.',
    fileName: 'SAS-App-Pro-2.5.0.exe',
    downloadUrl: '/downloads/SAS-App-Pro-2.5.0.exe',
    changelog: [
      'v2.5.0 - Added dark mode support',
      'v2.4.5 - Performance improvements',
      'v2.4.0 - New reporting features'
    ],
    downloads: 0
  },
  {
    id: 2,
    name: 'SAS Data Manager',
    version: '1.8.2',
    description: 'Manage and organize your data efficiently with advanced filtering and sorting.',
    fileName: 'SAS-Data-Manager-1.8.2.exe',
    downloadUrl: '/downloads/SAS-Data-Manager-1.8.2.exe',
    changelog: [
      'v1.8.2 - Bug fixes',
      'v1.8.0 - Added bulk operations',
      'v1.7.5 - Improved UI/UX'
    ],
    downloads: 0
  }
];

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function safeBase64UrlEncode(value) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function safeBase64UrlDecode(value) {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signToken(payload) {
  const encodedPayload = safeBase64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encodedPayload)
    .digest('hex');
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const expected = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(encodedPayload)
    .digest('hex');

  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(safeBase64UrlDecode(encodedPayload));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (!auth.startsWith('Bearer ')) return '';
  return auth.slice(7);
}

function isAuthorized(event) {
  if (OPEN_ADMIN_ACCESS) return true;
  const token = getBearerToken(event);
  return !!verifyToken(token);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

async function readStoredAdminAuth() {
  const raw = await store.get(ADMIN_PASSWORD_KEY, { consistency: 'strong' });
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.salt || !parsed.hash) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getAdminAuthStatus() {
  if (OPEN_ADMIN_ACCESS) {
    return { isSetup: true, managedBy: 'open' };
  }

  if (ADMIN_PASSWORD) {
    return { isSetup: true, managedBy: 'env' };
  }

  const stored = await readStoredAdminAuth();
  if (stored) {
    return { isSetup: true, managedBy: 'storage' };
  }

  return { isSetup: false, managedBy: 'none' };
}

async function verifyAdminPassword(password) {
  if (OPEN_ADMIN_ACCESS) return true;
  if (!password) return false;
  if (ADMIN_PASSWORD) return password === ADMIN_PASSWORD;

  const stored = await readStoredAdminAuth();
  if (!stored) return false;

  const hash = hashPassword(String(password), stored.salt);
  return hash === stored.hash;
}

async function setAdminPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  await store.set(
    ADMIN_PASSWORD_KEY,
    JSON.stringify({
      salt,
      hash,
      createdAt: Date.now()
    })
  );
}

async function readApps() {
  const raw = await store.get(APPS_KEY, { consistency: 'strong' });
  if (!raw) {
    await writeApps(DEFAULT_APPS);
    return [...DEFAULT_APPS];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await writeApps(DEFAULT_APPS);
    return [...DEFAULT_APPS];
  }
}

async function writeApps(apps) {
  await store.set(APPS_KEY, JSON.stringify(apps));
}

function getRoutePath(event) {
  const explicit = event.pathParameters && event.pathParameters.splat;
  if (explicit) return `/${explicit}`;

  const marker = '/.netlify/functions/api';
  const idx = event.path.indexOf(marker);
  if (idx === -1) return '/';
  const tail = event.path.slice(idx + marker.length);
  return tail || '/';
}

exports.handler = async (event) => {
  const method = event.httpMethod;
  const routePath = getRoutePath(event);

  try {
    if (method === 'GET' && routePath === '/health') {
      return json(200, { ok: true, runtime: 'netlify-function' });
    }

    if (method === 'GET' && routePath === '/admin/setup-status') {
      const status = await getAdminAuthStatus();
      return json(200, status);
    }

    if (method === 'POST' && routePath === '/admin/setup') {
      if (OPEN_ADMIN_ACCESS) {
        return json(200, { ok: true, message: 'Open admin access is enabled.' });
      }

      if (ADMIN_PASSWORD) {
        return json(409, {
          error: 'Admin password is managed by environment variable ADMIN_PASSWORD.'
        });
      }

      const status = await getAdminAuthStatus();
      if (status.isSetup) {
        return json(409, { error: 'Admin password is already configured.' });
      }

      const body = parseBody(event);
      const password = String(body.password || '');
      const confirmPassword = String(body.confirmPassword || '');

      if (password.length < 8) {
        return json(400, { error: 'Password must be at least 8 characters.' });
      }

      if (password !== confirmPassword) {
        return json(400, { error: 'Passwords do not match.' });
      }

      await setAdminPassword(password);
      return json(201, { ok: true });
    }

    if (method === 'POST' && routePath === '/admin/login') {
      if (OPEN_ADMIN_ACCESS) {
        const token = signToken({
          role: 'admin',
          exp: Date.now() + 8 * 60 * 60 * 1000
        });
        return json(200, { token, mode: 'open' });
      }

      const body = parseBody(event);
      const inputPassword = String(body.password || '');

      // Backward-compatible bootstrap: if no admin password exists yet,
      // first successful login attempt becomes the initial password setup.
      const status = await getAdminAuthStatus();
      if (!status.isSetup) {
        if (inputPassword.length < 8) {
          return json(400, { error: 'Password must be at least 8 characters.' });
        }

        await setAdminPassword(inputPassword);
      }

      const isValid = await verifyAdminPassword(body.password);
      if (!isValid) {
        return json(401, { error: 'Invalid credentials' });
      }

      const token = signToken({
        role: 'admin',
        exp: Date.now() + 8 * 60 * 60 * 1000
      });
      return json(200, { token });
    }

    if (method === 'POST' && routePath === '/admin/logout') {
      return json(200, { ok: true });
    }

    if (method === 'GET' && routePath === '/apps') {
      const apps = await readApps();
      return json(200, apps);
    }

    const downloadMatch = routePath.match(/^\/apps\/(\d+)\/download$/);
    if (method === 'POST' && downloadMatch) {
      const appId = Number(downloadMatch[1]);
      const apps = await readApps();
      const app = apps.find((item) => item.id === appId);

      if (!app) {
        return json(404, { error: 'App not found' });
      }

      app.downloads = (app.downloads || 0) + 1;
      await writeApps(apps);
      return json(200, { ok: true, downloads: app.downloads });
    }

    if (method === 'POST' && routePath === '/apps') {
      if (!isAuthorized(event)) {
        return json(401, { error: 'Unauthorized' });
      }

      const body = parseBody(event);
      if (!body.name || !body.version || !body.description || !body.fileName) {
        return json(400, { error: 'Missing required fields' });
      }

      const apps = await readApps();
      const nextId = apps.length ? Math.max(...apps.map((a) => a.id || 0)) + 1 : 1;
      const fileName = String(body.fileName).trim();

      const app = {
        id: nextId,
        name: String(body.name).trim(),
        version: String(body.version).trim(),
        description: String(body.description).trim(),
        fileName,
        downloadUrl: body.downloadUrl || `/downloads/${fileName}`,
        changelog: Array.isArray(body.changelog) ? body.changelog : ['Initial release'],
        downloads: 0
      };

      apps.push(app);
      await writeApps(apps);
      return json(201, app);
    }

    const appIdMatch = routePath.match(/^\/apps\/(\d+)$/);
    if (appIdMatch && method === 'PUT') {
      if (!isAuthorized(event)) {
        return json(401, { error: 'Unauthorized' });
      }

      const appId = Number(appIdMatch[1]);
      const updates = parseBody(event);
      const apps = await readApps();
      const index = apps.findIndex((item) => item.id === appId);

      if (index === -1) {
        return json(404, { error: 'App not found' });
      }

      const current = apps[index];
      const next = {
        ...current,
        ...updates,
        id: current.id
      };

      if (updates.fileName) {
        const fileName = String(updates.fileName).trim();
        next.fileName = fileName;
        next.downloadUrl = `/downloads/${fileName}`;
      }

      apps[index] = next;
      await writeApps(apps);
      return json(200, next);
    }

    if (appIdMatch && method === 'DELETE') {
      if (!isAuthorized(event)) {
        return json(401, { error: 'Unauthorized' });
      }

      const appId = Number(appIdMatch[1]);
      const apps = await readApps();
      const index = apps.findIndex((item) => item.id === appId);

      if (index === -1) {
        return json(404, { error: 'App not found' });
      }

      apps.splice(index, 1);
      await writeApps(apps);
      return json(200, { ok: true });
    }

    return json(404, { error: 'Route not found' });
  } catch (error) {
    return json(500, { error: 'Internal server error', detail: String(error.message || error) });
  }
};
