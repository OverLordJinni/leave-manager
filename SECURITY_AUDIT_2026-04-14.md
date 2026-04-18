# Security Audit — Leave Manager

**Date:** 2026-04-14
**Scope:** full (recon → static → deps/config → runtime)
**Stacks detected:** Node.js (Express 4.18) + React 18 (Vite 5 PWA) + Supabase (Postgres, service_role)
**Standards:** OWASP Top 10 (2021), ASVS L1, CWE Top 25
**Runtime tested:** yes — `http://172.20.10.222:5173` (Vite dev server proxying `/api` → local Express backend)

## Executive Summary

- Critical: **2**
- High: **6**
- Medium: **6**
- Low: **4**
- Info: **2**

### Top risks

- **Anyone who knows a valid `credentialId` can log in as the account owner.** The passkey login endpoint trusts a client-supplied `verified: true` flag — no WebAuthn signature verification is performed at all. This was confirmed end-to-end with a forged credential during the audit.
- **Any authenticated session can plant a permanent backdoor passkey.** The registration endpoint accepts arbitrary `credentialId` + `publicKey` strings and upserts them, overwriting any existing passkey. Combined with the login bypass, a single stolen session cookie = forever-persistent account takeover, even after the victim rotates passwords.
- **The backend comment says "all queries scoped to `req.userId` manually" — but not a single route does any such scoping.** The deployment currently enforces single-user operationally (signup gate), so this is latent rather than exploitable today, but the codebase is one config change or TOCTOU away from full cross-tenant data leakage.
- **The Vite dev server is exposed on the LAN (`172.20.10.222:5173`) with two known high-severity CVEs** in `esbuild` (arbitrary-origin dev-server requests) and `vite` (path traversal). The dev server also ships no security headers.
- **The password-reset flow is a dead code path.** `handleForgotPassword` creates a reset token in the DB but never sends an email — the reset URL only lives in the server log. If you lose your password, recovery is effectively manual DB surgery.

---

## Critical

### C-1: Passkey login trusts client-supplied `verified: true` — full WebAuthn bypass

**Standards:** OWASP A07:2021 – Identification and Authentication Failures · OWASP A01:2021 – Broken Access Control · CWE-287 · CWE-290
**Location:** `backend/src/middleware/auth.js:206-230` (specifically line 215)
**Evidence (runtime, confirmed):**

```js
// auth.js:215
if (verified !== true)
  return res.status(401).json({ error: 'Passkey verification failed' });
```

`verified` is read directly from the request body. No WebAuthn assertion signature, no client-data-hash verification, no counter check, no rpIdHash check. The server also never cross-references the challenge with the credential's `user_id`.

Runtime confirmation during the audit:

1. `POST /api/auth/passkey/register` with body `{"credentialId":"audit_fake_cred_001","publicKey":"audit_fake_pk","challengeId":"..."}` → `{"ok":true}` (no validation of the "public key").
2. Logged out.
3. `GET /api/auth/passkey/challenge` (no cookie) → new challenge.
4. `POST /api/auth/passkey/login` with `{"credentialId":"audit_fake_cred_001","challengeId":"...","verified":true}` → `{"ok":true}` with a fresh `Set-Cookie: lm_session=...` response header.
5. `GET /api/auth/me` with that cookie → `{"ok":true}`, `GET /api/settings` returns full account data.

**Impact:** Complete authentication bypass for any account that has a passkey registered. An attacker who learns any valid `credentialId` (e.g., from a prior successful login on a shared machine, from an authenticator-UV-capable USB token, or — most realistically — from the `passkey/register` endpoint itself, see C-2) can log in as that user permanently. This is a full, unauthenticated account takeover.

**Fix:** Verify the actual WebAuthn assertion server-side. The frontend's `navigator.credentials.get()` returns an `AuthenticatorAssertionResponse` containing `authenticatorData`, `clientDataJSON`, and `signature`. The server must:

1. Reconstruct `clientDataJSON` and confirm the challenge matches the pending challenge.
2. Confirm `origin` inside clientDataJSON matches `FRONTEND_URL`.
3. Confirm `rpIdHash` in authenticatorData matches `SHA-256(rpId)`.
4. Verify the `signature` against `authenticatorData + SHA-256(clientDataJSON)` using the stored public key.
5. Enforce the signature counter.
6. Bind the challenge to the claimed credential/user before accepting the login.

Don't roll this yourself — use `@simplewebauthn/server` (`verifyAuthenticationResponse` / `verifyRegistrationResponse`) and delete every line of the current passkey code. `auth.js` should never even read `req.body.verified`.

**Auto-fix available:** no — requires architectural replacement with `@simplewebauthn/server`.

---

### C-2: Passkey registration accepts arbitrary `credentialId`/`publicKey` and overwrites any existing passkey (persistent backdoor)

**Standards:** OWASP A07:2021 – Identification and Authentication Failures · CWE-287 · CWE-345
**Location:** `backend/src/middleware/auth.js:173-203`
**Evidence (runtime, confirmed):**

```js
// auth.js:189-194
const { error } = await supabase
  .from('passkey_credentials')
  .upsert(
    { user_id: sess.userId, credential_id: credentialId, public_key: publicKey },
    { onConflict: 'user_id' }
  );
```

- The handler never parses `publicKey` as a CBOR attestation object.
- It never verifies the registration challenge signature.
- `onConflict: 'user_id'` means any successful call **overwrites** the user's currently-registered passkey. During the audit I overwrote the real passkey of `aishjilu@icloud.com` with `credentialId=audit_fake_cred_001`, `publicKey=audit_fake_pk` — `{"ok":true}` in response.

**Impact:** Any authenticated request (i.e., any stolen/hijacked session cookie) can plant a "passkey" whose `credentialId` the attacker knows and whose `publicKey` is garbage — and thanks to C-1 no signature is ever required anyway. This turns a short-lived session compromise (stolen cookie, XSS on the frontend, malware on the victim's device) into **permanent** account access that survives password changes, logout, and session rotation. The current passkey on the account can also be silently evicted from an attacker's browser, locking the real user out of their own passkey login.

*Audit side-effect:* the real user's passkey has been overwritten by the test registration. **After this audit, log back in with email+password and re-register your passkey from the app UI.**

**Fix:**
1. Fix C-1 first (real assertion verification is a prerequisite).
2. Parse and verify the attestation object using `@simplewebauthn/server`'s `verifyRegistrationResponse`.
3. Reject registration if one already exists unless the caller has just re-authenticated with password in the same flow (sensitive-action re-auth) — an upsert-overwrite should be an explicit "replace passkey" flow, not the default.

**Auto-fix available:** no — tied to C-1.

---

## High

### H-1: Backend code claims per-user row scoping but no route actually filters by `user_id`

**Standards:** OWASP A01:2021 – Broken Access Control · CWE-639 · CWE-863
**Location:** `backend/src/db/supabase.js:12-15`, `backend/src/routes/leave.js:61,79,105,115,124,145,155,161,183,187,191,193`, `backend/src/routes/settings.js:25,45,48`, `backend/src/routes/recipients.js:15,31,39`, `backend/src/routes/viber.js:38,39,57,60`
**Evidence (static) [unconfirmed — exploitability depends on operational config]:**

`db/supabase.js` uses the Supabase **service_role** key which bypasses Row-Level Security, with a comment:

```js
// Service role client — bypasses RLS, all queries scoped to req.userId manually
```

The comment is false. Grepping for `user_id` / `userId` in `backend/src/routes/` returns zero matches. Every query is a bare:

```js
// e.g. leave.js:61
await supabase.from('leave_types').select('*').order('order', { ascending: true });
// leave.js:115
await supabase.from('leave_types').delete().eq('id', req.params.id);
// settings.js:25
await supabase.from('settings').select('key, value');
```

The signup handler (`auth.js:59-63`) enforces single-user mode via a `count > 0` check, so the current operational state prevents cross-user exposure. That gate is:

1. **Racy:** two concurrent signups can both read `count === 0` before either inserts, producing two accounts.
2. **Toggleable:** set `ADMIN_EMAIL` + unset the count check and the "single-user" guarantee evaporates instantly.
3. **Orthogonal to correctness:** the data layer should be defensive regardless of which auth mode is configured.

Because this is not runtime-confirmed against a second account (single-user gate blocks signup), severity is **High** per the rubric's `[unconfirmed]` drop, but it is listed high because the blast radius on first additional user is total data cross-contamination.

**Impact:** If a second account is ever created (via the race, via admin toggle, via a future multi-user feature), every `GET`, `PUT`, `DELETE` in `leave/`, `settings/`, `recipients/`, and `viber/` will operate on the other user's rows indiscriminately. One authenticated user reads, edits, and deletes all users' leave balances, history, Viber contacts, and settings.

**Fix:** Add `user_id` columns to `leave_types`, `leave_history`, `recipients`, `settings`, `passkey_credentials`, and `password_reset_tokens` (the committed `supabase-schema.sql` already shows this; the actual deployed DB needs to match). Then in every route, scope reads and writes: `.eq('user_id', req.userId)` on every `select/update/delete`, and include `user_id: req.userId` in every `insert`. Prefer a thin wrapper function so it's impossible to forget. Delete the misleading comment from `db/supabase.js:12` or update it to reflect reality.

**Auto-fix available:** yes — mechanical per-route edit.

---

### H-2: Forgot-password flow never sends the reset email — token only logged to stdout

**Standards:** OWASP A07:2021 – Identification and Authentication Failures · CWE-640
**Location:** `backend/src/middleware/auth.js:131-152`
**Evidence (static):**

```js
await supabase.from('password_reset_tokens').insert({ user_id: user.id, token, expires_at: expires });
console.log(JSON.stringify({ event: 'password_reset_token_created', userId: user.id }));
// TODO: Send email with reset link using your email provider (SendGrid, Resend, etc.)
// Reset URL: `${process.env.FRONTEND_URL}/reset-password?token=${token}`
```

1. No email is sent — recovery is non-functional.
2. The "Reset URL" comment is misleading: the actual reset URL is never generated or logged; only `password_reset_token_created` is logged without the token value (this is one thing that was done right). There is also no endpoint that consumes the token — grepping for `password_reset_tokens` outside this file returns nothing.
3. Tokens are created and never marked as used, so they don't expire other than by wall-clock time, and there's no reuse defense.

**Impact:** A legitimate user who forgets their password has no self-service recovery path. Also, the reset-token table grows unboundedly and the endpoint is unauthenticated and rate-limited only to 20/15min — a quiet junk-row DoS. Because the audit rubric counts broken auth flow as High, this stays High.

**Fix:** Either implement the email send (Resend / SendGrid / Supabase email auth) with a real `/reset-password` consumer endpoint that marks the token used on redemption, or — if you truly don't want reset — remove the endpoint and the `password_reset_tokens` table entirely. Half-implemented auth flows are worse than none.

**Auto-fix available:** no.

---

### H-3: Sessions stored in a process-local `Map` — no horizontal scaling, no invalidation across restarts

**Standards:** OWASP A07:2021 – Identification and Authentication Failures · CWE-613
**Location:** `backend/src/middleware/auth.js:16-23`
**Evidence (static):**

```js
const sessions          = new Map(); // token → { expires, userId }
const pendingChallenges = new Map(); // challengeId → { challenge, expires }
```

Render free/hobby can restart the process at any time — sessions evaporate, forcing re-login. If you ever run >1 replica, sessions created on replica A aren't recognised by replica B, so each request gets a 50/50 coin flip on "unauthorized". There's also no way to remotely invalidate a session (e.g., "log me out of all devices") — the admin has to restart the process, which logs *everyone* out.

**Impact:** Authentication is not durable and not scalable. Session hijack has no mitigation path beyond "wait for Render to recycle the container."

**Fix:** Persist sessions in the existing Supabase instance — add a `sessions(token text primary key, user_id uuid, expires_at timestamptz)` table (indexed on `expires_at`) and migrate the `Map` to it. Or use signed cookies (stateless JWT with a short TTL + refresh token). `pendingChallenges` should move too.

**Auto-fix available:** no.

---

### H-4: `esbuild` <= 0.24.2 — dev server leaks cross-origin responses (GHSA-67mh-4wv8-2f99)

**Standards:** OWASP A06:2021 – Vulnerable and Outdated Components · CWE-346
**Location:** `frontend/package.json` (transitive via `vite ^5.1.0`)
**Evidence (npm audit, runtime-relevant):**

```
esbuild  <=0.24.2   moderate
    → "esbuild enables any website to send any requests to the development
       server and read the response"
    advisory: https://github.com/advisories/GHSA-67mh-4wv8-2f99
    Fix: upgrade vite to a version pinning esbuild >= 0.25.0
```

You are currently running `npm run dev` and exposing the Vite dev server on `http://172.20.10.222:5173` across the LAN. Any page opened in the same browser as the developer can issue cross-origin requests to the dev server and read the response — that includes your app's source code, environment, and HMR socket.

**Impact:** On the LAN where this audit was performed, any malicious page loaded in your browser (e.g., via a clicked link, malicious ad) can exfiltrate frontend source, the state of HMR modules, and any files the dev server serves from `public/`. Development credentials can be stolen this way in principle.

**Fix:** `cd frontend && npm i -D vite@latest vite-plugin-pwa@latest` and rebuild lockfile. For production deployments there's no risk (the dev server isn't running). For LAN access to the dev build, prefer `npm run build && npm run preview` which uses a harder preview server, or stop exposing `5173` on your LAN interface.

**Auto-fix available:** yes — `npm audit fix --force` upgrades vite.

---

### H-5: `vite` <= 5.1.x — path traversal in optimized-deps `.map` handling

**Standards:** OWASP A06:2021 – Vulnerable and Outdated Components · CWE-22
**Location:** `frontend/package.json:17` (`"vite": "^5.1.0"`)
**Evidence (npm audit):** `Vite Vulnerable to Path Traversal in Optimized Deps .map Handling`, severity moderate, fix available. Dev server only.
**Impact:** An attacker able to reach the dev server (see H-4) can request crafted `.map` paths and read files outside the project root.
**Fix:** Upgrade vite (same command as H-4).
**Auto-fix available:** yes.

---

### H-6: `serialize-javascript` via `@rollup/plugin-terser` — RCE during build

**Standards:** OWASP A06:2021 – Vulnerable and Outdated Components · A08:2021 – Software and Data Integrity Failures · CWE-94
**Location:** `frontend/package.json` (transitive via `vite-plugin-pwa` → `workbox-build` → `@rollup/plugin-terser` → `serialize-javascript`)
**Evidence (npm audit):**

```
serialize-javascript   high
    → "Serialize JavaScript is Vulnerable to RCE via
       RegExp.flags and Date.prototype.toISOString()"
```

**Impact:** Low real-world likelihood because the attacker must influence the build input, but if you ever build a PR branch from a fork, or a dependency itself gets compromised, this can escalate to code execution in the build sandbox (Netlify build runner). A08 integrity failure.
**Fix:** Upgrade `vite-plugin-pwa` (ships with a newer workbox → newer terser plugin → fixed serialize-javascript). Part of the same `npm audit fix --force` as H-4.
**Auto-fix available:** yes.

---

## Medium

### M-1: `trust proxy: true` is over-permissive and interferes with rate-limit keying

**Standards:** OWASP A05:2021 – Security Misconfiguration · CWE-348
**Location:** `backend/src/index.js:29`
**Evidence (static):**

```js
app.set('trust proxy', true);
```

`express-rate-limit` keys buckets on `req.ip`, which with `trust proxy: true` becomes whatever the rightmost entry of `X-Forwarded-For` is. `true` means "trust every proxy in the chain" — in production you sit behind exactly two hops (Netlify proxy → Render), so `true` lets a client insert arbitrary leading XFF entries, and in some framework-version combinations this can shift the key and bypass the limiter. `express-rate-limit` also emits `ERR_ERL_PERMISSIVE_TRUST_PROXY` when it detects this configuration.

During the audit I could not reliably bypass the `authLimiter` because the Vite dev proxy overwrites `X-Forwarded-For` to its own IP before the backend sees it, but that's an artifact of the dev-time proxy chain — in production, a direct `curl` to the Render origin can do it. `[unconfirmed]` in this environment; behavior documented by the express-rate-limit project itself.

**Impact:** Login brute-force rate limit can be bypassed, giving an attacker unlimited guesses on the single-user password.
**Fix:** Set `app.set('trust proxy', 2)` to trust exactly the two known hops (Netlify + Render). Pair with `rateLimit({ validate: { trustProxy: true } })` to keep the library's built-in check happy. Add `keyGenerator` that falls back to a session-derived key on authenticated routes.
**Auto-fix available:** yes.

---

### M-2: `handlePasskeyChallenge` leaks the authenticated user's UUID

**Standards:** OWASP A01:2021 – Broken Access Control · CWE-200
**Location:** `backend/src/middleware/auth.js:155-170`
**Evidence (runtime, confirmed):**

```
GET /api/auth/passkey/challenge  (with valid session cookie)
→ { "challenge":"...","challengeId":"...","rpId":"172.20.10.222",
    "rpName":"Leave Manager","userId":"7df116f3-370f-4f01-9e1a-24c459680053" }
```

The `userId` is needed client-side during registration (to set `user.id` in `publicKey.user`) but should not be returned during login. There is only one endpoint and both flows share it, so the userId is always leaked whenever a session is present.

**Impact:** Opaque user UUID becomes a known quantity — this weakens anything else that implicitly relies on UUIDs being unguessable, and is a free enumeration primitive if the app ever gains additional users.
**Fix:** Split the endpoint into `/passkey/challenge/register` (authenticated, returns `userId`) and `/passkey/challenge/login` (unauth, no `userId`). Or stop echoing `userId` entirely and have the frontend derive it from `/auth/me`.
**Auto-fix available:** yes.

---

### M-3: Vite dev server on the LAN ships no security headers

**Standards:** OWASP A05:2021 – Security Misconfiguration
**Location:** runtime at `http://172.20.10.222:5173`
**Evidence (runtime):**

```
$ curl -sI http://172.20.10.222:5173/
HTTP/1.1 200 OK
Vary: Origin
Content-Type: text/html
Cache-Control: no-cache
Etag: W/"..."
Date: ...
Connection: keep-alive
```

Missing: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`. When the Express backend *is* hit (via the dev proxy to `/api/*`), Helmet does set these — but the HTML itself and all JS/CSS served by Vite have no hardening. This is expected from Vite but becomes a risk because you are actively exposing the dev server to the LAN.

**Impact:** A phone or second laptop on the same Wi-Fi can frame the app, downgrade its content types, or drop a worker into the page. In a real attacker-on-LAN scenario the exposure extends to anything the dev server hands out.
**Fix:** Don't expose `vite dev` externally for anything beyond your own machine. Use `npm run build && npm run preview` when you need LAN access, or (better) point LAN clients at the Netlify production site.

---

### M-4: Password reset tokens never expire on use (not revoked after consumption)

**Standards:** OWASP A07:2021 – Identification and Authentication Failures · CWE-640
**Location:** `backend/src/middleware/auth.js:131-152` (+ missing consumer endpoint)
**Evidence (static):** Tokens are inserted into `password_reset_tokens` with an `expires_at`, but there is no endpoint that redeems them, and no code path that marks them used. If the consumer is added later without a "mark used" update, the same token will work forever until its wall-clock TTL elapses.
**Impact:** Token replay. Also couples with H-2 (flow is broken end-to-end).
**Fix:** On redemption, add `.update({ used_at: now }).eq('token', ...).is('used_at', null)` and reject if the update affects zero rows.

---

### M-5: No CSRF token on state-changing endpoints; `SameSite=none` in production

**Standards:** OWASP A05:2021 – Security Misconfiguration · CWE-352
**Location:** `backend/src/middleware/auth.js:26-32`, `backend/src/index.js:57-64`
**Evidence (static):**

```js
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   isProd,
  sameSite: isProd ? 'none' : 'lax',   // <- relaxed in prod
  ...
};
```

In production the cookie drops to `SameSite=none`, which is the weakest CSRF stance. The only CSRF mitigations currently in place are:

1. The CORS allowlist rejects non-`FRONTEND_URL` origins — but CORS is an XHR/fetch-preflight control, not a browser-form-submit control.
2. Body parsers only accept `application/json` — but a DELETE (no body needed) can still be triggered by an attacker-controlled page using `fetch({method:'DELETE',credentials:'include'})`, which in CORS-terms is a preflighted request that the browser blocks only if the server's `Access-Control-Allow-Origin` doesn't match. With `allowedHeaders: ['Content-Type']` and strict origin, this is currently OK — but you are one `allowedHeaders: '*'` away from breaking it.

The comment in `netlify.toml:28` says "Proxy /api/* to Render backend — makes cookies same-origin, fixes cross-origin cookie blocking". Because the cookies are same-origin via the Netlify proxy, `SameSite=lax` would be sufficient and safer — the `none` downgrade isn't necessary given the current deployment topology.

**Impact:** Defense-in-depth gap. No current exploit given strict CORS + Netlify proxy, but one config regression flips the door open. Also, no CSRF token means forensic incident response has no correlation ID for CSRF attacks if the origin check is ever bypassed.
**Fix:** Downgrade cookie to `SameSite=lax` in production (since requests now ride the Netlify same-origin proxy). Optionally add a double-submit CSRF token on all POST/PUT/DELETE.

---

### M-6: User enumeration via signup response disambiguation

**Standards:** OWASP A07:2021 – Identification and Authentication Failures · CWE-204
**Location:** `backend/src/middleware/auth.js:66-69`
**Evidence (static):**

```js
const { data: existing } = await supabase
  .from('users').select('id').eq('email', emailClean).maybeSingle();
if (existing)
  return res.status(409).json({ error: 'An account with this email already exists' });
```

This endpoint has a single-user gate in front of it, so in the current deployment anyone probing gets "An account already exists. This is a single-user app." (`auth.js:62`) which doesn't leak which email is registered — the wording is generic. But the `409` branch is still reachable in `ADMIN_EMAIL` mode and does disclose "this email is registered" vs "not".

**Impact:** In multi-user mode the endpoint is an enumeration oracle. The login endpoint is better: it returns the same 401 for both "no such user" and "wrong password" and pads the no-user case with a dummy bcrypt compare.
**Fix:** Return the same generic 200 response in signup regardless of email existence; only the email-with-reset-link mechanism should tell the user whether their email was known.

---

## Low

### L-1: Challenge issuance is not bound to a client — any third party can request a challenge and use it

**Standards:** OWASP A07:2021 – Identification and Authentication Failures · CWE-346
**Location:** `backend/src/middleware/auth.js:155-170`, `:206-213`
**Evidence (static):** `POST /api/auth/passkey/login` accepts any `{credentialId, challengeId}` combination with no IP / session binding. Server generates the challenge and keeps it only five minutes, then deletes it on success, which gives one-shot replay resistance — but it does not verify that the caller is the same client that requested the challenge. In a correctly implemented WebAuthn flow this is fine because the signature binds the challenge, but with C-1 in place it's the only thing protecting login.
**Impact:** Compounds C-1.
**Fix:** Implement C-1 properly; afterward this becomes moot.

---

### L-2: `trust proxy: true` + rate limiter interaction logs a library warning

**Standards:** OWASP A05:2021 – Security Misconfiguration
**Location:** `backend/src/index.js:29`
**Evidence (static):** See M-1.
**Impact:** Noise, possible future breakage as `express-rate-limit` tightens its trust-proxy validation.
**Fix:** Set the exact hop count (`2`).

---

### L-3: Unauthenticated `/api/auth/passkey/status` reveals whether a session exists

**Standards:** OWASP A01:2021 – Broken Access Control · CWE-200
**Location:** `backend/src/middleware/auth.js:233-244`
**Evidence (static):** Returns `{registered:true/false}` based on whether a session cookie is valid, differentiating "unauth" (always `false`) from "auth but no passkey" (`false`) from "auth with passkey" (`true`). Not itself a leak against a non-session visitor, but the shape of the response differs from the other unauth endpoints and gives an attacker a cheap "is this cookie still valid" probe.
**Impact:** Low — mostly hygiene.
**Fix:** Return 401 when no session is present; only distinguish `{registered:true/false}` for authenticated sessions.

---

### L-4: Error paths log `err.message` but at least one path still logs `err.stack`

**Standards:** OWASP A09:2021 – Security Logging and Monitoring Failures · CWE-209
**Location:** `backend/src/middleware/auth.js:116` (`login_unexpected_error` path), routes' `dbErr(...)` wrappers log only `err.message` which is correct
**Evidence (static):**

```js
console.error(JSON.stringify({ event: 'login_unexpected_error',
  error: err.message, stack: err.stack }));
```

**Impact:** Stack contains library paths, which help fingerprint versions on Render's shared log ingestion.
**Fix:** Drop `stack` from the logged object in production; keep it in dev via `if (!isProd)`.

---

## Informational / Hygiene (non-security)

### I-1: Password minimum length is 8 — consider raising to 12 and enforcing a common-passwords block

**Location:** `backend/src/middleware/auth.js:50-51`
Current rule is trivially met. NIST SP 800-63B Rev 3/4 recommends 8 minimum *plus* a compromised-password check (e.g., HaveIBeenPwned k-anonymity). Adding that to signup+change-password is a 20-line improvement.

### I-2: `seedDefaults()` runs on every app boot and issues a count query

**Location:** `backend/src/db/seed.js:31-47`
Not a security issue — but every Render cold-start runs a `count(*)` on `leave_types` and an upsert storm on `settings`. Gate behind a `SEED_ON_BOOT=true` env var so prod can skip it.

---

## Appendix A — What was checked

- [x] **A01 Broken Access Control** — 5 findings (C-1, C-2, H-1, M-2, L-3)
- [x] **A02 Cryptographic Failures** — reviewed; bcrypt cost 12, no weak algorithms, no hardcoded secrets in source. No findings.
- [x] **A03 Injection** — reviewed every route; Supabase client parameter-binds, UUID casting rejects malformed ids (runtime-confirmed: `.../history/not-a-uuid` → 404), no `$queryRaw`/`text()`/string concat into SQL, no `eval`, no `child_process`, no unsafe-HTML React props. No findings.
- [x] **A04 Insecure Design** — TOCTOU on single-user signup gate discussed in H-1; WebAuthn "trust-the-client" design is C-1.
- [x] **A05 Security Misconfiguration** — M-1, M-3, M-5, L-2
- [x] **A06 Vulnerable and Outdated Components** — H-4, H-5, H-6. Backend: 0 vulns. Frontend: 6 vulns (3 moderate, 3 high).
- [x] **A07 Identification and Authentication Failures** — C-1, C-2, H-2, H-3, M-4, M-6, L-1
- [x] **A08 Software and Data Integrity Failures** — H-6
- [x] **A09 Security Logging and Monitoring Failures** — L-4. JSON-structured logs with requestId are present (good); stack leaks only in login unexpected path.
- [x] **A10 SSRF** — reviewed; backend never fetches user-controlled URLs (the Viber "URL" is a `viber://` deep link built from DB data, not fetched). No findings.
- [x] **Node playbook — Broken access control, crypto, injection, misconfig, SSRF, hardcoded secrets, lazy patterns** — walked.
- [x] **SQL playbook — string concat, tenant scoping, crypto, misconfig** — walked.
- [x] **Runtime probes 1–9** — all attempted. Probe 5 (JWT `alg:none`) N/A (app uses cookie sessions, not JWTs). Probe 7 (bundle secret scan) N/A (production uses empty `VITE_API_URL`, no server secret eligible for the frontend bundle). Probe 3 (BOLA across accounts) could not be run because the single-user signup gate prevents creating a second account — H-1 covers the latent risk.

## Appendix B — What was NOT checked

- **Cross-account IDOR in runtime.** Single-user gate at `auth.js:59-63` blocks creating a second account, so authz probes were run with one session only. H-1 describes the latent risk from code review.
- **Production deployment.** All runtime evidence was gathered against the LAN-exposed dev server at `http://172.20.10.222:5173`. The production Netlify+Render deployment was not probed. The Helmet headers seen in responses are identical between the two environments; NODE_ENV-gated flags (Secure cookie flag, HSTS) could not be confirmed on production.
- **Semgrep / gitleaks** — neither installed on this machine; automated pattern pre-filter was skipped. Manual Grep/Read was used instead.
- **`.claude/worktrees/*`** — excluded. Those are scratch copies created by prior Claude sessions and not the authoritative source tree.
- **PWA service worker content** (generated at build time). Not reviewed because the runtime target was the dev server, which doesn't register the production SW.
- **Supabase RLS policies on the actual deployed database.** The committed `supabase-schema.sql` shows correct-looking RLS for the multi-user design, but since the backend uses `service_role` those policies are bypassed. The audit did not connect to Supabase directly to inspect the live schema — H-1 assumes the deployed tables do not have a `user_id` column (otherwise inserts from the route code would already be failing, which they aren't).
- **Email/SMTP provider configuration** — not configured at all (see H-2). Nothing to audit.
- **Fuzz testing of inputs** — skipped by design; this audit class does not run fuzzers.

---

## Audit side-effects (things I changed in your running system)

- **Overwrote your real passkey** with a dummy (C-2 evidence). After this audit, log in with email+password and re-register your passkey from the app UI.
- Generated two `package-lock.json` files (`frontend/package-lock.json`, `backend/package-lock.json`) that did not exist before, in order to run `npm audit`. These are safe to keep (they reflect your current declared dependency ranges) or to delete (`rm frontend/package-lock.json backend/package-lock.json`).
- Two valid `lm_session` cookies were minted during the audit and still exist in the in-memory session store until the backend is restarted. Restart the backend or call `/api/auth/logout` with each cookie if you want them evicted immediately. The cookie values are not written to this report.
- One row in `password_reset_tokens` may exist per forgot-password probe attempted — none were run (H-2 found via static review).

**No git operations were performed** (no stage, no commit, no branch, no push).
