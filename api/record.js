const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const streamToString = async (stream) => {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
};

const s3 = new S3Client({ region: process.env.AWS_REGION });

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.ADMIN_JWT_SECRET) return res.status(500).json({ error: 'Server misconfigured: ADMIN_JWT_SECRET missing' });

  const auth = (req.headers.authorization || '').toString();
  const headerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  let cookieToken = null;
  const cookieHeader = req.headers.cookie || '';
  cookieHeader.split(';').map(c => c.trim()).forEach(pair => {
    if (pair.startsWith('admin_token=')) cookieToken = pair.slice('admin_token='.length);
  });
  const token = headerToken || cookieToken;

  try {
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, process.env.ADMIN_JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (!process.env.S3_BUCKET || !process.env.AWS_REGION) {
    console.error('record: missing S3_BUCKET or AWS_REGION');
    return res.status(500).json({ error: 'Server misconfigured: S3_BUCKET or AWS_REGION missing' });
  }

  const body = req.body || {};
  const { key, originalName, size, mimeType, publicUrl } = body;
  if (!key || !originalName) return res.status(400).json({ error: 'Missing key or originalName' });

  const indexKey = process.env.METADATA_KEY || 'files.json';

  try {
    // read existing index
    let items = [];
    try {
      const get = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: indexKey }));
      const text = await streamToString(get.Body);
      items = JSON.parse(text || '[]');
    } catch (e) {
      // missing file is ok
      items = [];
    }

    const { description, version, releaseNotes } = body;
    const record = {
      id: cryptoId(),
      key,
      originalName,
      size: size || 0,
      mimeType: mimeType || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
      downloads: 0,
      publicUrl,
      description: description || '',
      version: version || '',
      releaseNotes: releaseNotes || '',
      history: []
    };
    if (record.version) {
      record.history.push({ when: record.uploadedAt, by: 'uploader', version: record.version, note: record.releaseNotes || record.description });
    }

    items.push(record);

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: indexKey,
      Body: JSON.stringify(items, null, 2),
      ContentType: 'application/json'
    }));

    return res.status(201).json({ record });
  } catch (err) {
    console.error('record error', err && err.message ? err.message : err);
    const msg = err && err.message ? `Could not save record: ${err.message}` : 'Could not save record';
    return res.status(500).json({ error: msg });
  }
};

function cryptoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10);
}
