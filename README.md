# 📅 Leave Manager — Full Stack App

A personal leave-balance manager with Viber notifications, auto-reset on contract
renewal, and a mobile-first PWA. Runs entirely on **Vercel** (static PWA + a
serverless Express API) backed by **Neon** serverless Postgres.

---

## 🏗️ Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, PWA (installable on phone) |
| Backend | Node.js + Express, deployed as a Vercel serverless function (`/api`) |
| Database | Neon serverless Postgres (Vercel Marketplace, free tier) |
| Auth | Email + password (bcrypt) with stateless signed-cookie sessions; WebAuthn passkeys |
| Hosting | **Vercel** — one project, one domain (Hobby free tier) |
| Notifications | Viber deep-link (free, sends from your account) |

Everything is same-origin: the PWA and the API share one Vercel domain, so session
cookies are simple `SameSite=Lax` cookies — no cross-origin proxy needed.

---

## 📁 Project Structure

```
leave-manager/
├── api/
│   └── [...path].js          # Vercel serverless function → exports the Express app
├── backend/
│   └── src/
│       ├── app.js            # builds & exports the Express app (no listen)
│       ├── index.js          # local dev entry (app.listen)
│       ├── db/
│       │   ├── client.js     # Neon serverless client (`sql` tagged-template)
│       │   └── schema.sql    # one-time DDL to run against Neon
│       ├── middleware/auth.js
│       └── routes/{leave,settings,recipients,viber}.js
├── frontend/
│   └── src/{App.jsx, api.js, main.jsx, tokens.css}
├── vercel.json               # build + routing + security headers
└── package.json              # serverless-function dependencies (root)
```

---

## 🚀 Local Development

```bash
# 1. Install
npm install                 # root (serverless function deps)
cd backend  && npm install  # local API deps
cd ../frontend && npm install

# 2. Configure
cp backend/.env.example  backend/.env     # set DATABASE_URL + COOKIE_SECRET
cp frontend/.env.example frontend/.env    # leave VITE_API_URL empty

# 3. Apply the schema to your Neon database (once)
psql "$DATABASE_URL" -f backend/src/db/schema.sql
# (or paste backend/src/db/schema.sql into the Neon SQL editor)
```

Run it one of two ways:

**A) Two processes (Vite proxies /api → localhost:3001):**
```bash
cd backend  && npm run dev      # → http://localhost:3001
cd frontend && npm run dev      # → http://localhost:5173
```

**B) Single origin (recommended — matches production, needed for passkey testing):**
```bash
npm i -g vercel
vercel dev                      # → http://localhost:3000  (serves PWA + /api together)
```

---

## ☁️ Deploy to Vercel

1. **Push to GitHub** and **Import the repo** at [vercel.com/new](https://vercel.com/new).
   Vercel reads `vercel.json` — no build settings to fill in.
2. **Add the database:** Vercel project → **Storage → Create Database → Neon**.
   This auto-injects `DATABASE_URL` into the project's environment.
3. **Apply the schema** once: copy `backend/src/db/schema.sql` into the Neon SQL
   editor (Storage → your Neon DB → Query) and run it.
4. **Set environment variables** (Project → Settings → Environment Variables):
   ```
   COOKIE_SECRET   = <64-char random hex>   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   FRONTEND_URL    = https://your-domain.com
   ADMIN_EMAIL     = you@example.com        # optional — locks signup to this email
   ```
   `DATABASE_URL` is added automatically by the Neon integration.
5. **Deploy.** Pushes to `main` auto-deploy; PRs get preview URLs.

### Custom domain

Project → **Settings → Domains → Add** your domain, then point DNS as Vercel
instructs (an `A`/`ALIAS` record, or switch the registrar's nameservers to
Vercel). Set `FRONTEND_URL` to the final domain and redeploy.

> ⚠️ **Passkeys are bound to the domain.** WebAuthn ties credentials to the
> relying-party ID (your domain's hostname). Register/test passkeys on the
> **final custom domain**, not on a `*.vercel.app` preview URL.

---

## 📱 Install as a Mobile App (PWA)

- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.
- **Android (Chrome):** menu → **Add to Home Screen** (or accept the prompt).

---

## 🔐 Security & Auth

- **Single-user by default:** the first account to sign up wins; further signups
  are blocked. Set `ADMIN_EMAIL` to restrict signup to one specific address.
- **Sessions** are stateless, HMAC-signed cookies (`COOKIE_SECRET`) — no server
  store, so they work on serverless. 30-day sliding expiry; logout clears the cookie.
- **Passkeys** use real server-side WebAuthn verification (`@simplewebauthn/server`):
  signature, challenge, origin, RP ID, and counter are all checked.
- Every database query is scoped by `user_id` in application code.

---

## 🛠️ API Reference

All `/api/*` routes (except auth) require a valid session cookie.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (no auth) |
| POST | `/api/auth/signup` · `/login` · `/logout` | Email + password auth |
| GET | `/api/auth/me` | Session check |
| POST | `/api/auth/forgot-password` | Create reset token (email sending is a TODO) |
| GET/POST | `/api/auth/passkey/*` | WebAuthn register/login challenge + verify |
| GET/POST/PUT/DELETE | `/api/leave/types[/:id]` | Leave types (auto-checks reset on GET) |
| GET/POST/DELETE | `/api/leave/history[/:id]` | Apply / list / cancel leave |
| GET/PUT | `/api/settings` | App settings |
| GET/POST/DELETE | `/api/recipients[/:id]` | Viber recipients |
| POST | `/api/viber/links` | Viber deep-links for a leave entry |

---

## 🔄 Auto-Reset on Contract Renewal

On every `GET /api/leave/types`, if `contractRenewal ≤ today` and it hasn't been
applied yet: all `used` values reset to 0, `contractRenewal` advances one year,
and `lastResetDate` is recorded. No cron jobs needed.

---

## 📲 Viber Integration

The app builds `viber://chat?number=PHONE&draft=MESSAGE` deep-links. Tapping one
on a phone opens Viber with the message pre-filled; you tap Send. The message
comes from your personal Viber account (no paid bot needed).

---

## 🐛 Troubleshooting

- **DB errors:** confirm `DATABASE_URL` is set and `schema.sql` has been applied
  to that exact database (use the **pooled** Neon connection string).
- **Passkey won't register/login:** make sure you're on the real custom domain
  (not a preview), over HTTPS, and that `FRONTEND_URL` matches the domain exactly.
- **Viber link doesn't open:** must be tapped on a device with Viber installed;
  phone numbers need a country code (E.164, e.g. `+9607712345`).
