# BidArena — Generic Franchise Bidding / Auction Platform
**First tournament running on it:** Tampere Football Mania (TFM) - Season 8

A generic, sport-agnostic franchise-auction platform. Tournaments, player
roles/positions, and pool categories are all configurable, so the same
platform can run TFM Season 8 and any future tournament (other sports,
other seasons) without code changes.

> Project codename is **BidArena** for now (working name for the repo) —
> rename anytime, it's not customer-facing yet.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

---

## 0. Resume Context (read this first in a new session)

**Repo location:** `~/bidarena` (local git repo, initialized, nothing committed yet — see §9).

**What exists right now:** backend scaffold + Tournament/Position/Team/Player/Pool
admin CRUD, plus Excel bulk player upload, is built and working end-to-end
through the UI (see checkboxes below — `[x]` = done, `[~]` = partially done,
`[ ]` = not started). The bidding engine, exports, and owner/viewer real-time
UI are still not implemented.

**Machine setup already done** (Homebrew, macOS): Python 3.12, Node 26,
PostgreSQL 16, Redis. Postgres + Redis run as background `brew services`
(check with `brew services list`; start with `brew services start postgresql@16`
/ `brew services start redis` if they're not running).

**How to run it:**
```bash
# backend (Django) — terminal 1
cd ~/bidarena/backend
source venv/bin/activate
python manage.py runserver 8000

# frontend (Vite/React) — terminal 2
cd ~/bidarena/frontend
npm run dev
```
Frontend: http://localhost:5173/ (proxies `/api` and `/ws` to the backend).
Django admin: http://localhost:8000/admin/ — dev superuser `admin` / `admin12345`.
DB: Postgres, database name `bidarena_dev`, no password (local trust auth).
Full details in `README.md` at the repo root.

**Backend structure** (`backend/apps/`): `accounts` (custom `User` w/ `role`:
super_admin/tournament_admin/team_owner), `tournaments` (Tournament, Position,
BidIncrementRule), `teams` (Team), `players` (Player), `pools` (Pool — also
used for unsold re-rounds via `pool_type`/`round_number`), `auctions`
(AuctionSession, Bid, AuctionEvent, Wishlist, + `consumers.py`/`routing.py`
for the WebSocket auction room at `/ws/auction/<tournament_id>/`). All models
migrated into Postgres. Basic DRF CRUD viewsets/serializers/urls exist for
every model under `/api/`. The WebSocket consumer is a bare connect/broadcast
stub — no bidding logic yet.

**Frontend structure** (`frontend/src/`):
- `api/client.ts` — axios instance, attaches `Authorization: Token <token>` from `localStorage.authToken`
- `api/socket.ts` — WebSocket connector for the auction room (unused until the auction engine UI is built)
- `api/hooks.ts` — generic `useApiList<T>(url)` hook used by all the list/CRUD tabs
- `store/auth.ts` — Zustand auth store (`login`, `logout`, `loadUser`, token persisted to localStorage)
- `types/models.ts` — TS types mirroring backend models
- `pages/LoginPage.tsx` — working login form (DRF token auth)
- `components/ProtectedRoute.tsx` — route guard, supports `allowedRoles`
- `layouts/AdminLayout.tsx` — admin shell (nav + logout), wraps `/admin/*`
- `pages/admin/TournamentsListPage.tsx`, `TournamentFormPage.tsx` (create/edit, multipart for cover photo), `TournamentWorkspace.tsx` (tabbed view: Details/Positions/Teams/Players)
- `pages/admin/tabs/` — `DetailsTab`, `PositionsTab`, `TeamsTab`, `PlayersTab`, `PoolsTab`, all working CRUD against the live API (list/add/edit/delete, image upload via `FormData`; `PoolsTab` also handles player-to-pool assignment and drag-free up/down reordering)
- `pages/owner/`, `pages/viewer/` (+ `RoomDisplay.tsx`) — still placeholder components, not built yet

Dev login used for testing: `admin` / `admin12345`, role manually set to
`super_admin` (note: `createsuperuser` does **not** set the custom `role`
field — it defaults to `team_owner`, so a freshly created superuser can't
access `/admin` until its role is fixed, e.g. via `python manage.py shell` or
the Django admin).

**Key decisions already locked in (see §7 for the few still open):**
- Admin-controlled auction pacing (admin manually advances to next player)
- Hybrid bidding: owners bid from their own device even while physically in
  the room; no auctioneer-relay model
- Bid timer: configurable duration, admin can pause/resume/manually extend
- Minimum required players per team enforced via a purse-safety check
  (block bids that would leave a team unable to afford the rest of its min squad)
- Squad composition by position (min/max per position) deferred — optional/future
- Unsold players go through re-rounds (modeled as a new `Pool` with
  `pool_type=unsold_round`), repeatable
- Full bid audit log + CSV and PDF exports at the end
- Excel bulk upload needs row-level validation, not all-or-nothing
- Tech stack: Django+DRF+Channels/Redis+Postgres backend, React+Vite+TS+Tailwind frontend

**Suggested next step when resuming:** Tournament/Team/Player/Pools admin CRUD
and Excel bulk player upload are done (§2.1-2.4 checked off). Next up: (1) the
live auction engine itself — WebSocket bid handling, timer, auto-increment,
purse-safety, sold/unsold — which is the biggest remaining chunk; (2)
owner/viewer real-time UI; (3) exports (CSV/PDF).

---

## 1. Roles

- [~] Super Admin — manages the platform, can create tournaments (role + token auth done; no dedicated user-management UI yet)
- [~] Tournament Admin — manages a single tournament (role exists, same auth flow as Super Admin for now)
- [ ] Team Owner/Manager — bids for players on behalf of a team
- [ ] Viewer/Guest — read-only, no login required (public link)

---

## 2. Admin Features

### 2.1 Tournament setup
- [x] Create tournament (name, description, cover photo, dates)
- [x] Configure per tournament: number of teams, players per team (min/max), team budget/purse
- [x] Configure minimum required players per team (field + form done; enforcement at bid time is a separate item, see §2.5)
- [ ] Squad composition rules (min/max players per position) — **optional/future**, since pool design itself already caps how many of a position exist
- [~] Configure auto-increment rule for bids (fixed step, or step tiers by price range) — `BidIncrementRule` model + API exist, no admin UI yet
- [x] Configure bid countdown timer duration (per tournament, e.g. 15s/30s)

### 2.2 Players
- [x] Add single player (name, photo, position/role, base price) — `extra_info` metadata field exists on the model but has no form UI yet
- [x] Bulk upload players via Excel (columns: Name, Position, Base Price required/matched; any other columns become `extra_info`)
- [x] Row-level validation/error report on bulk upload (don't fail whole file on one bad row)
- [x] Edit/remove player from registered list

### 2.3 Teams
- [x] Add N teams competing in a tournament
- [x] Team name, logo, owner/manager name + photo
- [x] Assign starting budget per team (defaults to tournament budget, overridable)

### 2.4 Pools
- [x] Create bidding pools (e.g. Defender Pool A/B), generic naming so any sport's positions work
- [x] Map/assign registered players to pools
- [x] Reorder / prioritize pools for auction sequence

### 2.5 Running the auction
- [x] Start bidding for a tournament/pool
- [x] Randomly select next player from active pool after previous player's bidding closes
- [x] Admin-controlled flow: admin triggers "next player," bidding itself happens live among owners (see hybrid bidding, §2.6)
- [x] Auto-increment applied after each bid per configured rule
- [x] Countdown timer per player, resets on new bid
  - [x] Admin can manually **pause** the timer (mid-bid issue, dispute, technical glitch)
  - [x] Admin can manually **extend** the timer by a configurable amount
  - [x] Admin can **resume** after pause
- [x] Mark player SOLD → update buying team's roster + remaining budget, remove from pool
- [x] Mark player UNSOLD → return to an "unsold" list
- [x] Re-round unsold players: admin can regroup all/some unsold players into a fresh mini-pool and reopen bidding for them (repeatable)
- [x] Manual override: undo last bid, manually assign a player to a team (for disputes/mistakes)
- [x] Purse-safety check: block bids that would leave a team unable to afford its remaining minimum required players
- [x] Full bid history log per player (who bid what, when), viewable/exportable — audit log; recent bids shown live in the admin control room, exports still pending
- [ ] Export final results: team squads, spend summary, unsold list — both **CSV and PDF**

### 2.6 Hybrid bidding model
Owners are physically present in a room together *and* can place bids digitally
from their own device (phone/laptop) — not an auctioneer relaying on their
behalf. This means:
- [x] Owner bidding UI usable standalone on any device (phone-friendly)
- [ ] A **room/projector display mode**: a large-screen, login-free view showing current player, current highest bid + bidder, live timer, recent bid ticker — designed for a shared screen in the room, separate from individual owner devices
- [x] All connected clients (owner devices + room display + remote viewers) stay in sync in real time via the same WebSocket feed — verified with two simultaneous browser tabs

---

## 3. Team Owner Features

- [x] View player pool + player details (stats, photos, base price)
- [x] Place bid on the current player (real-time, from own device)
- [x] See own team's remaining budget update live
- [x] See own team's squad built so far
- [x] Private wishlist — mark target players, visible only to that owner
- [x] See live bid history for the current player (who's bidding, current price)

---

## 4. Viewer / Guest Features

- [ ] Watch live auction proceedings (current player, current bid, current bidder) — no login
- [ ] See all teams built so far and remaining budgets
- [ ] See sold/unsold player lists
- [ ] Public shareable link per tournament
- [ ] Room/projector display mode (see §2.6) usable as a guest view too

---

## 5. Cross-cutting / Non-functional

- [ ] Real-time updates to all connected clients (WebSocket) when a bid is placed, timer changes, or a player is sold
- [ ] Concurrency-safe bid placement (bids resolved strictly in order server-side, no race conditions on simultaneous clicks)
- [ ] Mobile-responsive UI (owners/guests likely on phones during a live event)
- [ ] Notification/sound cues: bid placed, player sold, timer running low
- [ ] Media storage for cover photos, player photos, team logos, owner photos

---

## 6. Tech Stack

- **Backend:** Django + Django REST Framework
- **Real-time:** Django Channels + Redis (WebSockets for live bidding/viewer/room-display updates)
- **Database:** PostgreSQL
- **Frontend:** React (Vite + TypeScript) + Tailwind CSS, consuming REST + WebSocket APIs
- **Media storage:** local filesystem for dev, S3-compatible object storage for production
- **Deployment target:** TBD (decide when we get closer to launch)

---

## 7. Open Questions

- [ ] Any "Right to Match" / player retention concept carried over between seasons?
- [ ] Max bid cap per player, or unlimited within budget (aside from the purse-safety floor)?
- [x] Excel bulk upload column format — `Name` (required), `Position` (optional, must match an existing position name for the tournament), `Base Price` (required, non-negative number); any other columns are captured as `extra_info` key/value pairs.
- [ ] Hosting/deployment environment for going live.
- [ ] Real project/product name, if we want something other than the "BidArena" codename.

---

## 8. Progress Log

- 2026-08-25: Requirements gathered, doc created, tech stack proposed.
- 2026-08-25: Scope decisions locked in — all "proposed" features accepted into v1, hybrid bidding model (in-room + digital) chosen, squad composition rules deferred as optional. Repo renamed from tfm-bidding-system to bidarena to reflect generic scope. No code yet.
- 2026-08-25: **Project scaffolded.** Installed Python 3.12, Node 26, PostgreSQL 16, Redis via Homebrew (both services running). Django backend created (`backend/`) with apps `accounts`, `tournaments`, `players`, `teams`, `pools`, `auctions`; custom `User` model with role field; core models for Tournament/Position/BidIncrementRule/Team/Player/Pool/AuctionSession/Bid/AuctionEvent/Wishlist; migrations generated and applied against `bidarena_dev` Postgres DB; Django admin registered for all models; basic DRF CRUD API live under `/api/`; Channels configured with a WebSocket consumer stub for the live auction room (`/ws/auction/<tournament_id>/`) — bid logic itself not yet implemented. React frontend created (`frontend/`) with Vite + TypeScript + Tailwind v4 + React Router + Zustand + Axios, proxying `/api` and `/ws` to the backend, with placeholder routes for Admin / Owner / Viewer / Room Display. Both dev servers smoke-tested together successfully. See `README.md` for run instructions. No feature logic (bidding engine, bulk upload, exports, etc.) implemented yet — scaffold only.
- 2026-08-25: **Tournament/Team/Player admin CRUD built.** Added token-based login (`/api/auth/login/`) and a Zustand auth store on the frontend; `ProtectedRoute` gates `/admin/*` to `super_admin`/`tournament_admin` roles. Built out the admin area: Tournament list, create/edit form (multipart upload for cover photo, added `start_date`/`end_date` fields to the model that were missing from the initial scaffold), and a tabbed Tournament Workspace (Details / Positions / Teams / Players) with full add/edit/delete for Positions, Teams (incl. logo + owner photo upload, budget defaults from tournament), and Players (incl. photo upload, position dropdown). All verified end-to-end with a real browser session (Playwright): login → create tournament with dates → add position/team/player → data persists and displays correctly, form resets and list refetches after submit. Test data cleaned up afterward. Not yet built: Excel bulk player upload, Pools admin UI, the auction engine itself, owner/viewer UI, exports. See §0 for exact file locations.
- 2026-08-25: **Git/GitHub set up.** Repo committed and pushed to a private GitHub repo (`Ozayer/bidarena`) via `gh`.
- 2026-08-25: **Pools admin UI built.** Added `PoolsTab.tsx` (§2.4): pool CRUD (name + optional position), up/down reorder swapping the `order` field, and a per-pool player-assignment panel (dropdown to add an unassigned player, remove button to unassign — sets/clears the player's `pool` FK and `status` between `available`/`pooled`). No backend changes needed — `Pool` model/API and `Player.pool` FK already existed from the initial scaffold. Verified end-to-end with Playwright: create pool → assign player → status flips to "In Pool" on the Players tab → reorder two pools → order persists. Test data cleaned up afterward. Next up: Excel bulk player upload, then the auction engine.
- 2026-08-25: **Excel bulk player upload built.** Backend: `apps/players/bulk_upload.py` parses an uploaded `.xlsx` with `openpyxl` (already in `requirements.txt`); required columns `Name`/`Base Price`, optional `Position` (matched by name against the tournament's existing positions), any other columns captured into `extra_info`. Row-level validation — invalid rows are skipped and reported, valid rows are still created (no all-or-nothing transaction). Two new `PlayerViewSet` actions: `GET /api/players/bulk_upload_template/` (downloads a starter `.xlsx`) and `POST /api/players/bulk_upload/` (multipart `tournament` + `file`, returns `{created, total_rows, errors: [{row, errors[]}]}`). Frontend: `PlayersTab.tsx` got a "Bulk upload players" panel — template download link, file input, and a results readout (success count + per-row error list). Verified end-to-end (curl for the raw API, then Playwright through the UI) with a mixed valid/invalid test workbook — correct rows created, bad rows (missing name, unknown position, non-numeric price) reported with the right messages, template downloads correctly. Test data cleaned up afterward. Next up: the live auction engine (§2.5) — the biggest remaining chunk.
- 2026-08-25: **Live auction engine + admin control room built (§2.5).** Backend: new `apps/auctions/engine.py` centralizes all state transitions (start auction, random next-player selection from the active pool, place bid with auto-increment lookup via `BidIncrementRule`/flat fallback and purse-safety enforcement, pause/resume/extend timer, mark sold/unsold, undo last bid, manual assign) behind `transaction.atomic()` + `select_for_update()` row locking on `AuctionSession` for concurrency safety. `AuctionSessionViewSet` (`/api/auction-sessions/`) exposes one REST action per transition plus `for_tournament` (get-or-create); every mutation broadcasts a rich `AuctionStateSerializer` snapshot (current player, highest bid/bidder, last 10 bids, timer) over the `auction_<tournament_id>` Channels group via `apps/auctions/broadcast.py`. `AuctionRoomConsumer` is a pure read-only relay — no client-sent messages, all writes go through REST so the engine stays the single source of truth. Added `PoolViewSet.create_re_round` (`POST /api/pools/create-re-round/`) to regroup selected unsold players into a fresh `unsold_round` pool, reopening bidding for them. Fixed two real infra bugs found while wiring this up: (1) `daphne` was missing from `INSTALLED_APPS`, so `manage.py runserver` was silently falling back to plain WSGI and every `/ws/auction/<id>/` request 404'd despite `ASGI_APPLICATION`/`CHANNEL_LAYERS` being configured; (2) the pinned `redis==8.1.0` package caused `redis.exceptions.TimeoutError` inside the live Daphne process whenever a broadcast needed to reach a connected consumer (isolated scripts using the same `channels_redis` layer worked fine, pointing to a version-compatibility issue rather than a config bug) — pinned `redis==5.2.1` in `requirements.txt`, which resolved it cleanly. Frontend: new `AuctionRoom.tsx` at `/admin/tournaments/:id/auction` (linked via a "Run Auction" button from the Tournament Workspace header) — pool selector + Start Auction/Start Next Player, live client-side countdown from `timer_ends_at`, current player card, recent-bids ticker, per-team cards with live budget/squad and a "Place bid" button (admin simulates bids since dedicated owner UI isn't built yet), Pause/Resume/Extend/Mark Sold/Mark Unsold/Undo Last Bid controls, an unsold-players panel wired to the re-round endpoint, and a manual-assign mini-form for dispute overrides. Verified end-to-end with Playwright: full lifecycle (start → next player → competing bids → undo → pause/resume → extend → sold → next player → unsold → re-round) against a real backend, plus a two-tab test confirming the WebSocket broadcast keeps a second browser in sync in real time with no manual refresh. Test data cleaned up afterward. Still open: export CSV/PDF (last §2.5 item), dedicated owner bidding UI (§3), viewer/guest UI + room display (§4).
- 2026-08-25: **Team owner bidding UI built (§3).** Backend: `TeamViewSet` gained `owner_user` filtering and an admin-only `set-owner-account` action (`POST /api/teams/<id>/set-owner-account/`) that creates or resets the login a team owner uses to bid from their own device (creates a `User` with role `team_owner`, or resets the existing linked one, then links it via `Team.owner_user`); `TeamSerializer` now also exposes a read-only `owner_username`. Locked down `AuctionSessionViewSet`: every admin transition (start, next-player, pause, resume, extend-timer, mark-sold, mark-unsold, undo-last-bid, manual-assign) now requires `super_admin`/`tournament_admin`, while `place-bid` allows a `team_owner` to bid only for the team their account is linked to (admins can still bid on any team's behalf, as used by the admin control room) — previously any authenticated user could hit any of these. `WishlistViewSet.perform_create` similarly now checks the requesting owner actually owns the team before letting them add to its wishlist. Frontend: `TeamsTab.tsx` got a "Set owner login" / "Reset login" mini-form per team card; login now redirects by role (`team_owner` → `/owner`, admins → `/admin`) and `/owner/*` is gated by `ProtectedRoute`; new `OwnerDashboard.tsx` — team switcher (for owners of multiple teams), live current-player card with countdown/highest bid/bidder, a "Place Bid" button (disabled once the owner already holds the highest bid), a recent-bids ticker, a browsable player pool with a private wishlist star toggle (`/api/wishlist/`), and a "My squad" panel of players won so far — all kept in sync in real time over the same auction WebSocket used by the admin control room. Verified end-to-end with Playwright: admin starts the auction, two team-owner accounts log in in parallel tabs, see the same current player, place competing bids and see each other's bids arrive live via WebSocket, a direct API attempt by one owner to bid on the other's behalf is correctly rejected with 403, and the wishlist star toggle persists. Test data cleaned up afterward. Still open: export CSV/PDF (§2.5), room/projector display + public guest viewer UI (§2.6/§4).
