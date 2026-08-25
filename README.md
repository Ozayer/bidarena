# BidArena

Generic franchise-auction platform. See [REQUIREMENTS.md](REQUIREMENTS.md) for
the full feature list and progress tracking. First tournament running on it:
Tampere Football Mania (TFM) - Season 8.

## Stack

- **Backend:** Django + Django REST Framework, Django Channels + Redis for
  real-time bidding, PostgreSQL.
- **Frontend:** React (Vite + TypeScript) + Tailwind CSS, React Router,
  Zustand, Axios.

## Prerequisites (already installed on this machine via Homebrew)

- Python 3.12 (`backend/venv` uses this)
- Node 26 / npm
- PostgreSQL 16 (`brew services start postgresql@16`)
- Redis (`brew services start redis`)

## Backend setup

```bash
cd backend
source venv/bin/activate        # venv already created; recreate with:
                                 # /opt/homebrew/opt/python@3.12/bin/python3.12 -m venv venv
pip install -r requirements.txt # if requirements.txt is regenerated
cp .env.example .env            # already done for local dev, edit as needed
python manage.py migrate
python manage.py runserver 8000
```

Dev superuser already created for local use: `admin` / `admin12345` (change
this before anything is ever deployed anywhere real).

Django admin: http://localhost:8000/admin/
API root: http://localhost:8000/api/

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173/ and proxies `/api` and `/ws` to the Django
backend on port 8000 (see `vite.config.ts`).

## Running both together

Two terminals, or background them:

```bash
# terminal 1
cd backend && source venv/bin/activate && python manage.py runserver 8000

# terminal 2
cd frontend && npm run dev
```

Once the real-time auction engine needs Channels' ASGI server instead of the
WSGI dev server, swap in: `daphne -p 8000 config.asgi:application`.

## Project layout

```
backend/
  config/            # Django project: settings (base/dev/prod), urls, asgi
  apps/
    accounts/        # custom User model + role (super_admin/tournament_admin/team_owner)
    tournaments/     # Tournament, Position, BidIncrementRule
    players/         # Player
    teams/           # Team
    pools/           # Pool (bidding pools, incl. unsold re-rounds)
    auctions/        # AuctionSession, Bid, AuctionEvent, Wishlist + WebSocket consumer
frontend/
  src/
    api/             # axios client + WebSocket connector
    pages/admin/      # admin dashboard
    pages/owner/      # team owner dashboard
    pages/viewer/     # public viewer room + room/projector display
    types/           # shared TS types mirroring backend models
```

## Status

Project scaffold complete: Django apps + models + migrations + admin + basic
REST CRUD API, Channels wired up with a WebSocket consumer stub for the
auction room, Postgres + Redis running locally, React frontend scaffolded
with routing for Admin / Owner / Viewer / Room Display areas. Feature-by-
feature build-out tracked in [REQUIREMENTS.md](REQUIREMENTS.md).
