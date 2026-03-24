const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const streamToString = async (stream) => {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
};

const s3 = new S3Client({ region: process.env.AWS_REGION });
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body || {};
  // Verify Authorization Bearer token
  const auth = (req.headers.authorization || '').toString();
  const headerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  // fallback to cookie
  let cookieToken = null;
  const cookieHeader = req.headers.cookie || '';
  cookieHeader.split(';').map(c => c.trim()).forEach(pair => {
    if (pair.startsWith('admin_token=')) cookieToken = pair.slice('admin_token='.length);
  });
  const token = headerToken || cookieToken;
  if (!process.env.ADMIN_JWT_SECRET) return res.status(500).json({ error: 'Server misconfigured: ADMIN_JWT_SECRET missing' });
  try {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, process.env.ADMIN_JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { action, id, fields } = body;
  if (!action) return res.status(400).json({ error: 'Missing action' });

  const indexKey = process.env.METADATA_KEY || 'files.json';

  try {
    // read index
    let items = [];
    try {
      const get = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: indexKey }));
      const text = await streamToString(get.Body);
      items = JSON.parse(text || '[]');
    } catch (e) {
      items = [];
    }

    if (action === 'edit') {
      const idx = items.findIndex((it) => it.id === id);
      if (idx === -1) return res.status(404).json({ error: 'File not found' });
      // if version/description changed, append to history
      const prev = items[idx];
      if (fields?.version && fields.version !== prev.version) {
        prev.history = prev.history || [];
        prev.history.push({ when: new Date().toISOString(), by: 'admin', version: fields.version, note: fields.description || '' });
      }
      items[idx] = { ...items[idx], ...fields };
    } else if (action === 'markLatest') {
      // set isLatest on selected id, clear others
      items = items.map((it) => ({ ...it, isLatest: it.id === id }));
    } else if (action === 'delete') {
      const idx = items.findIndex((it) => it.id === id);
      if (idx === -1) return res.status(404).json({ error: 'File not found' });
      const [removed] = items.splice(idx, 1);
      // delete object from S3 if key present
      if (removed && removed.key) {
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: removed.key }));
      }
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

    // write updated index
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: indexKey, Body: JSON.stringify(items, null, 2), ContentType: 'application/json' }));

    return res.json({ ok: true, files: items });
  } catch (err) {
    console.error('admin error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Admin action failed' });
  }
};
