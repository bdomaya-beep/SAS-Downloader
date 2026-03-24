const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const ADMIN_KEY = process.env.ADMIN_META_KEY || 'admin.json';

const streamToString = async (stream) => {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const body = req.body || {};
  const password = body.password;

  // first, check environment password
  if (process.env.ADMIN_PASSWORD) {
    if (!password || password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  } else {
    // fallback to stored admin.json in S3
    let stored = null;
    try {
      const get = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: ADMIN_KEY }));
      const text = await streamToString(get.Body);
      stored = JSON.parse(text || '{}');
    } catch (e) {
      // not configured
    }
    if (!stored || !stored.hash) return res.status(400).json({ error: 'Admin not configured' });
    const ok = await bcrypt.compare(password || '', stored.hash);
    if (!ok) return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.ADMIN_JWT_SECRET) return res.status(500).json({ error: 'Server misconfigured: ADMIN_JWT_SECRET missing' });

  const token = jwt.sign({ role: 'admin' }, process.env.ADMIN_JWT_SECRET, { expiresIn: '12h' });
  // Set an HttpOnly cookie so admin session is not accessible to JS
  try {
    const maxAge = 12 * 60 * 60; // 12 hours in seconds
    const cookieParts = [`admin_token=${token}`, `HttpOnly`, `Path=/`, `Max-Age=${maxAge}`, `SameSite=Strict`];
    if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
    res.setHeader('Set-Cookie', cookieParts.join('; '));
  } catch (e) {
    // ignore cookie set failures
  }
  return res.json({ token });
};
