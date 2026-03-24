const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
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
  if (req.method !== 'GET') return res.status(405).end();

  if (!process.env.S3_BUCKET || !process.env.AWS_REGION) {
    console.error('files: missing S3_BUCKET or AWS_REGION');
    return res.status(500).json({ error: 'Server misconfigured: S3_BUCKET or AWS_REGION missing' });
  }

  const indexKey = process.env.METADATA_KEY || 'files.json';
  try {
    const get = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: indexKey }));
    const text = await streamToString(get.Body);
    const items = JSON.parse(text || '[]');
    return res.json({ files: items.sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)) });
  } catch (err) {
    // if not found, return empty list
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return res.json({ files: [] });
    console.error('files error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Could not read files index' });
  }
};
