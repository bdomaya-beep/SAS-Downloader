const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  if (!process.env.ADMIN_JWT_SECRET) return res.status(500).json({ error: 'Server misconfigured: ADMIN_JWT_SECRET missing' });

  const auth = (req.headers.authorization || '').toString();
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  // try cookie if no header
  let cookieToken = null;
  const cookieHeader = req.headers.cookie || '';
  cookieHeader.split(';').map(c => c.trim()).forEach(pair => {
    if (pair.startsWith('admin_token=')) cookieToken = pair.slice('admin_token='.length);
  });

  const finalToken = token || cookieToken;
  if (!finalToken) return res.status(401).json({ error: 'Unauthorized' });

  try {
    jwt.verify(finalToken, process.env.ADMIN_JWT_SECRET);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
