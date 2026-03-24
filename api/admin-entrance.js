const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  // Public entrance: simply redirect to admin UI. The admin UI will detect whether an admin is configured
  res.setHeader('Cache-Control', 'no-store');
  res.writeHead(302, { Location: '/admin.html' });
  res.end();
};
