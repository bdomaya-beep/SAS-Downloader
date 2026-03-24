const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const s3 = new S3Client({ region: process.env.AWS_REGION });

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

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
