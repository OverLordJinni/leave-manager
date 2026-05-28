// Vercel serverless function — catch-all for /api/* (and /health via rewrite).
// An Express app is itself a (req, res) handler, so we just export it. Using a
// catch-all ([...path]) file means Vercel routes the full original URL here
// (e.g. /api/leave/types) and Express's own routing handles the rest.
module.exports = require('../backend/src/app');
