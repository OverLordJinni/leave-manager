// src/index.js — LOCAL DEVELOPMENT entry point only.
// On Vercel the app is served by the serverless function in /api; this file is
// not used there. It loads .env and starts a normal HTTP listener for `npm run dev`.
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Leave Manager API (local) — http://localhost:${PORT}`);
});
