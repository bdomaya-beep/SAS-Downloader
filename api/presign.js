const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

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

  // Basic env validation to provide clearer errors
  if (!process.env.S3_BUCKET || !process.env.AWS_REGION) {
    console.error('presign: missing S3_BUCKET or AWS_REGION');
    return res.status(500).json({ error: 'Server misconfigured: S3_BUCKET or AWS_REGION missing' });
  }

  const { name, contentType } = req.body || {};
  if (!name || !contentType) return res.status(400).json({ error: 'Missing name or contentType' });

  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${process.env.S3_PREFIX || 'uploads/'}${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safe}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  try {
    const expires = parseInt(process.env.PRESIGN_EXPIRES || '300', 10); // seconds
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expires });
    const publicUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return res.json({ uploadUrl, key, publicUrl });
  } catch (err) {
    console.error('presign error', err && err.message ? err.message : err);
    const msg = (err && err.message) ? `Could not create presigned URL: ${err.message}` : 'Could not create presigned URL';
    return res.status(500).json({ error: msg });
  }
};
