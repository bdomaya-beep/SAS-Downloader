const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
// Allow hosting platforms to override storage paths (useful for /tmp on serverless)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT, 'uploads');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'files.json');

function ensureProjectStorage() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]', 'utf8');
}

function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDb(items) {
  fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2), 'utf8');
}

ensureProjectStorage();

app.use(express.json());
app.use(express.static(path.join(ROOT, 'public')));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `${unique}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 },
});

function toPublicFile(record, req) {
  const origin = `${req.protocol}://${req.get('host')}`;
  return {
    id: record.id,
    originalName: record.originalName,
    size: record.size,
    mimeType: record.mimeType,
    uploadedAt: record.uploadedAt,
    downloads: record.downloads,
    downloadUrl: `/download/${record.id}`,
    shareUrl: `${origin}/download/${record.id}`,
  };
}

app.get('/api/files', (req, res) => {
  const files = readDb()
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .map((file) => toPublicFile(file, req));

  res.json({ files });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const files = readDb();

  const newFile = {
    id: crypto.randomUUID(),
    storedName: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    downloads: 0,
  };

  files.push(newFile);
  writeDb(files);

  return res.status(201).json({
    message: 'Upload complete.',
    file: toPublicFile(newFile, req),
  });
});

app.get('/download/:id', (req, res) => {
  const files = readDb();
  const file = files.find((item) => item.id === req.params.id);

  if (!file) {
    return res.status(404).send('File not found.');
  }

  const fullPath = path.join(UPLOAD_DIR, file.storedName);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('Stored file is missing.');
  }

  file.downloads += 1;
  writeDb(files);

  return res.download(fullPath, file.originalName);
});

app.delete('/api/files/:id', (req, res) => {
  const files = readDb();
  const idx = files.findIndex((item) => item.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'File not found.' });
  }

  const [removed] = files.splice(idx, 1);
  writeDb(files);

  const fullPath = path.join(UPLOAD_DIR, removed.storedName);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }

  return res.json({ message: 'File deleted.' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
