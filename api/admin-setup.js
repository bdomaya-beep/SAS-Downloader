const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
  try {
    if (req.method === 'GET') {
      // return whether admin is already configured (env var or stored)
      let configured = false;
      if (process.env.ADMIN_PASSWORD) configured = true;
      else {
        try {
          const get = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: ADMIN_KEY }));
          const text = await streamToString(get.Body);
          const obj = JSON.parse(text || '{}');
          if (obj && obj.hash) configured = true;
        } catch (e) {
          configured = false;
        }
      }
      return res.json({ configured });
    }

    if (req.method === 'POST') {
      // create initial admin password only if not configured
      const body = req.body || {};
      const password = body.password;
      if (!password || typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

      // check existing
      let already = false;
      if (process.env.ADMIN_PASSWORD) already = true;
      else {
        try {
          const get = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: ADMIN_KEY }));
          const text = await streamToString(get.Body);
          const obj = JSON.parse(text || '{}');
          if (obj && obj.hash) already = true;
        } catch (e) {
          already = false;
        }
      }
      if (already) return res.status(400).json({ error: 'Admin already configured' });

      // hash and store
      const hash = await bcrypt.hash(password, 10);
      const payload = { hash, createdAt: new Date().toISOString() };
      await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: ADMIN_KEY, Body: JSON.stringify(payload, null, 2), ContentType: 'application/json' }));

      // issue JWT and set cookie
      if (!process.env.ADMIN_JWT_SECRET) return res.status(500).json({ error: 'ADMIN_JWT_SECRET missing' });
      const token = jwt.sign({ role: 'admin' }, process.env.ADMIN_JWT_SECRET, { expiresIn: '12h' });
      const maxAge = 12 * 60 * 60;
      const cookieParts = [`admin_token=${token}`, `HttpOnly`, `Path=/`, `Max-Age=${maxAge}`, `SameSite=Strict`];
      if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
      res.setHeader('Set-Cookie', cookieParts.join('; '));

      return res.json({ ok: true, token });
    }

    return res.status(405).end();
  } catch (err) {
    console.error('admin-setup error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Server error' });
  }
};
