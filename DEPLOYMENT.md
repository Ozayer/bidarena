# Deployment Guide (Free Hosting)

How to put BidArena live on free hosting, and how to redeploy it later. For
where actual account emails/passwords/keys are recorded, see
`deploy-credentials.local.md` (gitignored — never commit real secrets).

## Architecture

| Piece | Where | Why |
|---|---|---|
| Django API + WebSocket (Channels/Daphne) + built React app | **Render** (Web Service, free) | One Render service serves everything on one origin — Django serves the built frontend's `index.html`/assets via WhiteNoise, so there's no separate frontend host, no CORS to configure, and the WebSocket for live bidding works with zero extra config since it's same-host. |
| PostgreSQL | **Neon** (free) | Render's own free Postgres **auto-deletes after 30 days**. Neon's free Postgres doesn't expire — it just pauses ("scale to zero") when idle and wakes up on the next connection. Much safer for a project you'll come back to between tournaments. |
| Redis (Channels layer) | **Render Key Value** (free) | Only used for the live-auction pub/sub between connected clients, not for storing data (all bids/results live in Postgres). Free tier is in-memory-only and can lose data on restart, which is fine for this use. |
| Player photos / team logos / tournament covers | **Cloudinary** (free) | Render's free web service wipes its local disk on every redeploy/restart/spin-down, so images saved there can vanish mid-tournament. Cloudinary's free tier (25 "credits"/month — roughly 25GB combined storage+bandwidth+transformations, no expiry, no card required) is used instead — uploads go straight there and are served from Cloudinary's CDN, unaffected by Render restarts. |

This means: 4 free accounts (GitHub — already have it, Render, Neon,
Cloudinary), one Render Web Service, one Render Key Value instance, one Neon
project, one Cloudinary account.

## Known limitations of this free setup

Read this before relying on it for a real live tournament:

- **Cold start:** the free web service spins down after 15 minutes with no
  traffic, and the next request takes ~30–60s to wake it back up. Open the
  site yourself a minute or two before a live auction starts so it's warm.
- **Neon compute pauses when idle** and takes a few seconds to resume on the
  first query after a quiet period — combined with Render's cold start, the
  very first request after a long idle period can be slow. Subsequent
  requests are fast.

## Part 0 — Push the deployment-ready code

A few settings changes were made to support this (WhiteNoise for static
files, the Django URL that serves the built frontend, `CSRF_TRUSTED_ORIGINS`,
Postgres SSL support). Commit and push them before continuing:

```bash
cd /Users/mdozayerislam/bidarena
git add backend/requirements.txt backend/config backend/.env.example
git commit -m "Add production static/SPA serving and deploy config"
git push
```

## Part 1 — Create the Neon Postgres database

1. Go to https://neon.com → sign up (GitHub login is easiest, keeps it tied
   to the same GitHub account as the repo).
2. **New Project** → name it `bidarena` → pick a region close to your users
   (e.g. an EU region if the tournament is in Finland) → create.
3. On the project page, open the **Connection Details** widget and switch it
   to show individual parameters (not the single connection-string view).
   You'll get: **Host**, **Database name**, **Role/User**, **Password**,
   **Port** (5432).
4. Copy all five into `deploy-credentials.local.md`.

## Part 2 — Create the Cloudinary account (image storage)

1. Go to https://cloudinary.com/users/register/free → sign up (GitHub login
   is easiest).
2. After signup you land on the **Dashboard**, which has an **API Keys** /
   **API Environment variable** panel showing your **Cloud Name**, **API
   Key**, and **API Secret** (click "reveal" for the secret).
3. Copy all three into `deploy-credentials.local.md` — these become the
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` env
   vars in Part 5.

## Part 3 — Create the Render Key Value (Redis) instance

1. Go to https://dashboard.render.com → sign up (GitHub login).
2. **New** → **Key Value**.
3. Name: `bidarena-redis`. Region: pick one (remember it — the web service
   in Part 4 must use the **same region** to get a working internal URL).
4. Instance Type: **Free** → **Create Key Value**.
5. Once created, open it → **Connect** → copy the **Internal Redis URL**
   (starts with `redis://`; only reachable from other Render services in the
   same region). Save it to the credentials file as `REDIS_URL`.

## Part 4 — Create the Render Web Service

1. **New** → **Web Service** → connect your GitHub account → select the
   `bidarena` repo, branch `main`.
2. **Region**: same region as the Key Value instance from Part 3.
3. **Root Directory**: leave blank (repo root — the build command below `cd`s
   into both `frontend/` and `backend/`).
4. **Runtime**: Python 3.
5. **Build Command**:
   ```bash
   cd frontend && npm ci && npm run build && cd ../backend && pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
   ```
6. **Start Command**:
   ```bash
   cd backend && daphne -b 0.0.0.0 -p $PORT --proxy-headers config.asgi:application
   ```
   `--proxy-headers` is required — Render terminates TLS at its edge and
   forwards plain HTTP to your container. Without this flag, Daphne reports
   every request as insecure regardless of what the browser used, and
   `SECURE_SSL_REDIRECT=True` (set in `config/settings/prod.py`) then
   redirects every request to `https://`, which Render's edge immediately
   downgrades back to HTTP again on the way in — an infinite redirect loop
   (`ERR_TOO_MANY_REDIRECTS` in the browser).
7. **Instance Type**: Free.
8. Don't click Create yet — add the environment variables below first (or
   add them right after creating and redeploy).

## Part 5 — Environment variables (on the Render Web Service)

Add these under the service's **Environment** tab. Fill actual values into
`deploy-credentials.local.md` as you go.

| Key | Value |
|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.prod` |
| `PYTHON_VERSION` | `3.12.14` |
| `SECRET_KEY` | generate with `python -c "import secrets; print(secrets.token_urlsafe(50))"` — run locally, paste the output here only (don't reuse the dev one) |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | your Render URL's host only, e.g. `bidarena.onrender.com` (you'll know the exact one after first create — see Part 6) |
| `CSRF_TRUSTED_ORIGINS` | `https://bidarena.onrender.com` (same host, with scheme) |
| `SITE_BASE_URL` | `https://bidarena.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `https://bidarena.onrender.com` |
| `DB_NAME` | from Neon |
| `DB_USER` | from Neon |
| `DB_PASSWORD` | from Neon |
| `DB_HOST` | from Neon |
| `DB_PORT` | `5432` |
| `DB_SSLMODE` | `require` |
| `REDIS_URL` | the internal Redis URL from Part 3 |
| `TIME_ZONE` | `Europe/Helsinki` |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary (Part 2) |
| `CLOUDINARY_API_KEY` | from Cloudinary (Part 2) |
| `CLOUDINARY_API_SECRET` | from Cloudinary (Part 2) |

Render also lets you link `REDIS_URL` directly to the Key Value instance
from the env var UI ("Add from service") instead of pasting it — either
works.

## Part 6 — First deploy

1. Click **Create Web Service**. Watch the build logs.
2. Once live, Render shows you the actual URL (e.g.
   `https://bidarena.onrender.com`, or with a random suffix if that name was
   taken). If it differs from what you guessed in Part 5, go back and fix
   `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `SITE_BASE_URL`, and
   `CORS_ALLOWED_ORIGINS` to match exactly, then **Manual Deploy → Deploy
   latest commit**.
3. Record the final URL in `deploy-credentials.local.md`.

## Part 7 — Create your production admin login

Render's free tier has no Shell access, so create the superuser from your
own machine, pointed at the live Neon database instead of your local one:

```bash
cd backend
source venv/bin/activate
DJANGO_SETTINGS_MODULE=config.settings.prod \
SECRET_KEY=anything \
ALLOWED_HOSTS=localhost \
CSRF_TRUSTED_ORIGINS=http://localhost \
DB_NAME=<neon-db-name> DB_USER=<neon-user> DB_PASSWORD=<neon-password> \
DB_HOST=<neon-host> DB_PORT=5432 DB_SSLMODE=require \
python manage.py createsuperuser
```

Pick a real username/password (not the local `admin`/`admin12345` one) and
save them in `deploy-credentials.local.md`.

Then, on the live site:

1. Go to `https://<your-url>/admin/` and log in with that account.
2. Under **Users**, open your own user, and set **Role** to **Super Admin**
   (a plain `createsuperuser` only grants Django-admin access — the app's own
   permission checks look at this `role` field).

## Part 8 — Verify

- Visit the live URL — the React app should load (not a Django error page).
- Log into `/admin/` and confirm it looks right (CSS loading correctly).
- Upload a test player photo or team logo and confirm its URL points at
  `res.cloudinary.com` (not your Render domain) — check the Cloudinary
  dashboard's Media Library to see it land there too.
- Create a small test tournament end-to-end and open the room display in two
  browser tabs to confirm live bidding updates over WebSocket actually work
  across the public internet, not just localhost.
- Delete the test tournament (and the test image, from the Cloudinary Media
  Library) once confirmed.

## Redeploying after future changes

Render auto-deploys on every push to `main` by default (check the
**Auto-Deploy** setting on the service if you want to turn that off). Just:

```bash
git push
```

and watch the deploy logs on the Render dashboard.

## If something breaks

- **Deploy fails during build** — check the build logs for the exact step
  (`npm ci`, `npm run build`, `pip install`, `collectstatic`, `migrate`).
- **502/503 right after deploy** — free instance is spinning up, wait ~30-60s.
- **Site loads but `/admin/` has no CSS** — `collectstatic` didn't run or
  `whitenoise` isn't in `requirements.txt`; check the build log.
- **WebSocket won't connect (live bidding not updating)** — check
  `REDIS_URL` is the *internal* URL and both services are in the same
  Render region.
- **"CSRF verification failed" on admin login** — `CSRF_TRUSTED_ORIGINS`
  doesn't match the real URL exactly (must include `https://`).
- **Image upload fails, or its URL still points at your Render domain
  instead of `res.cloudinary.com`** — one of `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` is missing/wrong; without
  `CLOUDINARY_CLOUD_NAME` set, the app silently falls back to local (and on
  Render, ephemeral) disk storage instead of erroring.
- **`ERR_TOO_MANY_REDIRECTS` in the browser** — the Start Command is
  missing `--proxy-headers` (see Part 4). Without it, Daphne can't tell
  Django that Render already terminated TLS, so `SECURE_SSL_REDIRECT`
  redirects every request to `https://` forever.
