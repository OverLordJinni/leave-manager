// src/db/client.js
// Neon serverless Postgres client. `sql` is a tagged-template that parameterizes
// safely and returns an array of row objects:
//   const rows = await sql`SELECT * FROM leave_types WHERE user_id = ${userId}`;
const { neon } = require('@neondatabase/serverless');

const url = process.env.DATABASE_URL;
if (!url) throw new Error('FATAL: DATABASE_URL must be set');

const sql = neon(url);

module.exports = { sql };
