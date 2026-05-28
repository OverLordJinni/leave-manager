// Vercel serverless function for the API. All /api/* requests are rewritten to
// this single function (see vercel.json), and the Express app does its own
// sub-path routing. An Express app is a (req, res) handler, so we export it.
module.exports = require('../backend/src/app');
