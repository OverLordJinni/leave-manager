# Security Assessment — Leave Manager App
Generated: 2026-04-07

---

## CRITICAL

### SEC-01 — Token exposed in frontend bundle
**File:** frontend/.env → VITE_API_TOKEN
**Risk:** Any VITE_* variable is baked into the compiled JS bundle at build time.
Anyone who opens DevTools → Sources can read the token and call your API directly.
**Fix:** Remove token from frontend entirely. Use HttpOnly cookies or session-based
auth so the secret never leaves the server.

### SEC-02 — Timing attack on token comparison
**File:** backend/src/middleware/auth.js line 10
**Risk:** `token !== API_TOKEN` uses a non-constant-time string comparison.
An attacker can measure response time differences to brute-force the token byte by byte.
**Fix:** Use Node's `crypto.timingSafeEqual()` for all token comparisons.

### SEC-03 — CORS wildcard fallback
**File:** backend/src/index.js line 21
**Risk:** `origin: process.env.FRONTEND_URL || '*'` — if FRONTEND_URL is not set
in production, CORS is wide open to any origin.
**Fix:** Default to a strict deny, never '*' in production.

---

## HIGH

### SEC-04 — No request body size limit
**File:** backend/src/index.js line 25
**Risk:** `express.json()` with no limit accepts arbitrarily large payloads.
An attacker can send a huge JSON body to exhaust memory / cause DoS.
**Fix:** Set `express.json({ limit: '10kb' })`.

### SEC-05 — Input validation missing on all routes
**Files:** all routes
**Risk:** No type/format validation on inputs. e.g. `total` in leave types could
be -999, `startDate` could be "DROP TABLE", `color` could be a 10MB string,
`phone` could be arbitrary script.
**Fix:** Add a lightweight validator (express-validator or manual checks) on every
POST/PUT body field.

### SEC-06 — Error messages leak internal details
**Files:** all routes — `res.status(500).json({ error: err.message })`
**Risk:** Raw Prisma/DB error messages (table names, column names, stack traces)
returned to the client in production. Aids attackers in fingerprinting the stack.
**Fix:** Log full error server-side; return only a generic message to client.

### SEC-07 — No request ID tracking
**Risk:** Without correlation IDs, security incidents are impossible to trace
across logs.
**Fix:** Add a request ID header to every response.

### SEC-08 — Rate limiter only on /api, not on /health
**File:** backend/src/index.js
**Risk:** /health is unauthenticated and unthrottled — can be used for uptime
probing or as a side-channel.
**Fix:** Apply a separate tight rate limiter to /health as well.

---

## MEDIUM

### SEC-09 — Token sent in URL query string allowed
**File:** backend/src/middleware/auth.js line 9
**Risk:** `req.query.token` — tokens in URLs appear in server logs, browser history,
Referrer headers, and proxy logs in plaintext.
**Fix:** Accept token from header only, never from query string.

### SEC-10 — No date format validation — infinite loop risk
**File:** backend/src/routes/leave.js — countWeekdays()
**Risk:** If `startDate` or `endDate` is an invalid date string, `new Date()` returns
NaN and the while loop runs forever, hanging the process.
**Fix:** Validate ISO date format before processing; cap max days range.

### SEC-11 — Settings PUT accepts arbitrary keys
**File:** backend/src/routes/settings.js line 19
**Risk:** `Object.entries(req.body)` — a client can inject any key/value into the
settings table, including overwriting system keys or flooding the table.
**Fix:** Whitelist allowed setting keys.

### SEC-12 — No Content-Type enforcement on requests
**Risk:** Express parses JSON only if Content-Type is application/json, but a
malformed body can still reach routes and cause unexpected behavior.
**Fix:** Explicitly reject non-JSON content types on POST/PUT routes.

### SEC-13 — Redirect to user-supplied viber:// URL without validation
**File:** backend/src/routes/viber.js line 67
**Risk:** `res.redirect(302, viberUrl)` where viberUrl is constructed from DB data.
If a phone number stored in DB contains injection (e.g. `javascript:` scheme),
the redirect could be abused.
**Fix:** Strictly validate that the constructed URL starts with `viber://`.

### SEC-14 — VITE_API_TOKEN hardcoded placeholder in .env.example
**File:** frontend/.env.example
**Risk:** Developers copy .env.example as-is and deploy with the placeholder token.
**Fix:** Force token to be generated; document clearly; use a startup check.

---

## LOW

### SEC-15 — No security headers beyond Helmet defaults
**Risk:** Helmet's defaults are good but Content-Security-Policy needs tuning for
the Google Fonts import and Viber deep-links.
**Fix:** Configure CSP explicitly.

### SEC-16 — Console.error logs full stack traces
**Risk:** In a cloud environment logs are often accessible to anyone with dashboard
access. Stack traces reveal file paths and library versions.
**Fix:** Use structured logging with log levels; never log stack in production.

### SEC-17 — Missing HTTP Strict Transport Security enforcement check
**Risk:** Helmet sets HSTS but only if the connection is HTTPS. On Render's free
tier there's no way to enforce HTTPS at the app level.
**Fix:** Add a middleware that redirects HTTP to HTTPS.

---

## Summary Table

| ID | Severity | Fix effort |
|----|----------|------------|
| SEC-01 | CRITICAL | Medium |
| SEC-02 | CRITICAL | Low |
| SEC-03 | CRITICAL | Low |
| SEC-04 | HIGH | Low |
| SEC-05 | HIGH | Medium |
| SEC-06 | HIGH | Low |
| SEC-07 | HIGH | Low |
| SEC-08 | HIGH | Low |
| SEC-09 | MEDIUM | Low |
| SEC-10 | MEDIUM | Low |
| SEC-11 | MEDIUM | Low |
| SEC-12 | MEDIUM | Low |
| SEC-13 | MEDIUM | Low |
| SEC-14 | LOW | Low |
| SEC-15 | LOW | Low |
| SEC-16 | LOW | Low |
| SEC-17 | LOW | Low |
