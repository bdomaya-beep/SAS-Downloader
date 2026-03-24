const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
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
  // Accept GET /api/download?id=ID or /api/download/ID
  const id = req.query?.id || (req.url && req.url.split('/').pop());
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const indexKey = process.env.METADATA_KEY || 'files.json';
  try {
    const get = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: indexKey }));
    const text = await streamToString(get.Body);
    const items = JSON.parse(text || '[]');
    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) return res.status(404).json({ error: 'File not found' });

    items[idx].downloads = (items[idx].downloads || 0) + 1;

    // write back index
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: indexKey, Body: JSON.stringify(items, null, 2), ContentType: 'application/json' }));

    const publicUrl = items[idx].publicUrl;
    if (!publicUrl) return res.status(500).json({ error: 'No public URL for file' });

    // Redirect browser to the S3 URL
    res.writeHead(302, { Location: publicUrl });
    return res.end();
  } catch (err) {
    console.error('download error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Could not process download' });
  }
};
