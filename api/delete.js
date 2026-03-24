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

module.exports = async (req, res) => {
  if (req.method !== 'DELETE') return res.status(405).end();
  const id = req.url.split('/').pop();
  if (!id) return res.status(400).json({ error: 'Missing id' });

  if (!process.env.S3_BUCKET || !process.env.AWS_REGION) {
    console.error('delete: missing S3_BUCKET or AWS_REGION');
    return res.status(500).json({ error: 'Server misconfigured: S3_BUCKET or AWS_REGION missing' });
  }

  const indexKey = process.env.METADATA_KEY || 'files.json';

  try {
    let items = [];
    try {
      const get = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: indexKey }));
      const text = await streamToString(get.Body);
      items = JSON.parse(text || '[]');
    } catch (e) {
      return res.status(404).json({ error: 'Index not found' });
    }

    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) return res.status(404).json({ error: 'File not found' });

    const [removed] = items.splice(idx, 1);

    // delete object from S3
    if (removed && removed.key) {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: removed.key }));
    }

    // update index
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: indexKey, Body: JSON.stringify(items, null, 2), ContentType: 'application/json', ACL: 'public-read' }));

    return res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('delete error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Delete failed' });
  }
};
