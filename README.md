# 📅 Leave Manager — Full Stack App

A personal leave balance manager with Viber notifications, auto-reset on contract renewal, and a mobile-first PWA interface.

---

## 🏗️ Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, PWA (installable on phone) |
| Backend | Node.js + Express |
| Database | SQLite (local) → PostgreSQL (production) |
| ORM | Prisma |
| Hosting (frontend) | Netlify — **Free** |
| Hosting (backend+DB) | Railway — **~$5/month** |
| Notifications | Viber deep-link (free, sends from your account) |

---

## 📁 Project Structure

```
leave-manager/
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── index.js
│   │   ├── db/seed.js
│   │   ├── middleware/auth.js
│   │   └── routes/
│   │       ├── leave.js
│   │       ├── settings.js
│   │       ├── recipients.js
│   │       └── viber.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    ├── .env.example
    └── package.json
```

---

## 🚀 Local Development

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/leave-manager.git
cd leave-manager

# Backend
cd backend
npm install
cp .env.example .env          # edit as needed

# Frontend
cd ../frontend
npm install
cp .env.example .env          # edit as needed
```

### 2. Set up the database (SQLite for local dev)

```bash
cd backend

# Make sure .env has:
# DATABASE_PROVIDER="sqlite"
# DATABASE_URL="file:./dev.db"

npx prisma generate
npx prisma db push            # creates dev.db with all tables
```

### 3. Run both servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# → Running on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → Running on http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## ☁️ Production Deployment

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/leave-manager.git
git push -u origin main
```

---

### Step 2 — Deploy Backend to Railway

Railway gives you Node.js + PostgreSQL for ~$5/month with always-on uptime.

1. Go to **railway.app** and sign up (free account)
2. Click **New Project → Deploy from GitHub repo**
3. Select your `leave-manager` repo
4. Set the **Root Directory** to `backend`
5. Railway will auto-detect Node.js

**Add PostgreSQL:**
6. In your Railway project → **+ New** → **Database** → **Add PostgreSQL**
7. Click the PostgreSQL service → **Variables** tab → copy `DATABASE_URL`

**Set environment variables** (Railway project → Variables tab):

```
DATABASE_PROVIDER   = postgresql
DATABASE_URL        = (paste from PostgreSQL service above)
API_TOKEN           = (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
FRONTEND_URL        = https://YOUR-APP.netlify.app
PORT                = 3001
```

**Run database migrations:**
8. Railway project → your backend service → **Deploy** tab → open a shell (or use Railway CLI):
```bash
npx prisma generate
npx prisma db push
```
Or add a post-deploy command in Railway settings:
```
npx prisma generate && npx prisma db push && node src/index.js
```

9. Your backend URL will be something like: `https://leave-manager-production.up.railway.app`

---

### Step 3 — Deploy Frontend to Netlify

Netlify is completely free for static sites.

1. Go to **netlify.com** and sign up
2. Click **Add new site → Import an existing project**
3. Connect GitHub → select `leave-manager` repo
4. Set build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
5. **Before deploying**, add environment variables (Site settings → Environment variables):

```
VITE_API_URL     = https://leave-manager-production.up.railway.app
VITE_API_TOKEN   = (same token you set on Railway)
```

6. Click **Deploy site**
7. Your app will be live at: `https://random-name.netlify.app`
8. (Optional) Add a custom domain in Netlify settings

---

### Step 4 — Update CORS on Backend

Go back to Railway → your backend service → Variables:
```
FRONTEND_URL = https://your-actual-netlify-url.netlify.app
```
Redeploy the backend service.

---

## 📱 Install as Mobile App (PWA)

Once deployed to Netlify:

**iPhone (Safari):**
1. Open your Netlify URL in Safari
2. Tap the Share button → **Add to Home Screen**
3. App appears on your home screen with an icon

**Android (Chrome):**
1. Open your Netlify URL in Chrome
2. Tap the three-dot menu → **Add to Home Screen** (or Chrome will prompt automatically)

The app loads instantly, works offline (cached), and feels like a native app.

---

## 🔐 Security

This app uses a **single shared API token** since it's designed for one user:
- Backend checks `x-api-token` header on every request
- Frontend sends the token from `VITE_API_TOKEN` env var
- Keep your token secret — don't commit `.env` files to GitHub
- Add `.env` to your `.gitignore`

```bash
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore
echo "frontend/.env" >> .gitignore
```

---

## 📲 Viber Integration

The app uses **Viber deep-links** — the free, personal approach:

- When you submit a leave request, the backend generates a `viber://chat?number=PHONE&draft=MESSAGE` URL
- Tapping the link on your phone opens Viber with the message pre-filled
- You tap **Send** once per recipient
- The message comes from **your personal Viber account** — more personal than a bot

**Why not a Viber Bot?**
As of February 2024, Viber requires a commercial contract + €100/month maintenance fee for new bots. For a personal single-user app, the deep-link approach is free, instant, and works perfectly.

---

## 💰 Monthly Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| Netlify | Free | $0 |
| Railway | Hobby (always-on) | ~$5 |
| **Total** | | **~$5/month** |

**Completely free alternative:**
- Frontend: Netlify (free) → $0
- Backend: Render (free tier — 50s cold start on first request) → $0
- Database: Render PostgreSQL free (90-day expiry, need to back up) → $0
- **Total: $0** (with cold-start trade-off)

---

## 🛠️ API Reference

All endpoints require `x-api-token` header.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (no auth) |
| GET | `/api/leave/types` | Get leave types + check reset |
| POST | `/api/leave/types` | Add leave type |
| PUT | `/api/leave/types/:id` | Update leave type |
| DELETE | `/api/leave/types/:id` | Delete leave type |
| GET | `/api/leave/history` | Get leave history |
| POST | `/api/leave/apply` | Apply for leave |
| DELETE | `/api/leave/history/:id` | Cancel leave (restores balance) |
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/recipients` | Get Viber recipients |
| POST | `/api/recipients` | Add recipient |
| DELETE | `/api/recipients/:id` | Remove recipient |
| POST | `/api/viber/links` | Get Viber deep-links for a leave entry |

---

## 🔄 Auto-Reset Logic

The contract renewal reset runs **server-side** on every `GET /api/leave/types` call:

1. Checks if `contractRenewal` date ≤ today
2. If yes: resets all `used` values to 0 in a database transaction
3. Advances `contractRenewal` by exactly 1 year
4. Records `lastResetDate`
5. Returns `resetOccurred: true` so the frontend shows the celebration banner

This means the reset happens automatically the first time you open the app after renewal — no cron jobs or scheduled tasks needed.

---

## 🐛 Troubleshooting

**"Cannot connect to backend"**
- Make sure `VITE_API_URL` points to your Railway URL (no trailing slash)
- Check Railway logs for errors
- Verify `API_TOKEN` matches in both Railway and Netlify env vars

**Viber link doesn't open Viber**
- Must be tapped on a mobile device with Viber installed
- Phone numbers must include country code (e.g. `+66812345678`)

**Database errors on Railway**
- Run `npx prisma db push` via Railway shell
- Check `DATABASE_URL` is set correctly

**PWA not installing**
- Must be served over HTTPS (Netlify handles this automatically)
- Try clearing browser cache and reloading
