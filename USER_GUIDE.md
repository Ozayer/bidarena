# User Guide

Simple step-by-step flow for each user group. For feature details see
[REQUIREMENTS.md](REQUIREMENTS.md); for setup/run instructions see
[README.md](README.md).

## 1. Super Admin / Tournament Admin

Logs in at `/login`, works entirely under `/admin/*`.

1. **Log in** with an admin account (dev default: `admin` / `admin12345`).
2. **Create a tournament** — name, description, cover photo, dates, number
   of teams, budget per team, bid timer length.
3. Open the tournament's **workspace** and set it up, tab by tab:
   - **Details** — edit the basics from step 2 any time.
   - **Positions** — define the roles/positions used for this sport (e.g.
     Defender, Forward).
   - **Teams** — add each team (name, logo, owner name/photo, budget), then
     use **Set owner login** to create the username/password that team's
     owner will use to bid from their own device.
   - **Players** — add players one at a time, or **bulk upload** a whole
     roster via an `.xlsx` file (download the template first).
   - **Pools** — group players into bidding pools (e.g. "Defender Pool A")
     and set the order they'll be auctioned in.
   - **Bid Rules** — optionally configure tiered auto-increment rules (e.g.
     +10 under 100, +25 above); otherwise a flat default increment is used.
4. Hand out each team's login (username/password from the Teams tab) to the
   real team owners, and share the public link (`/viewer/<slug>` or
   `/room-display/<slug>`) with anyone who should just watch.
5. Click **Run Auction** to open the live control room:
   - **Start Auction**, then **Start Next Player** to pull a random player
     from the active pool.
   - Owners bid live from their own devices; you can also place a bid on
     any team's behalf — either the default next-increment amount, or type
     a **custom amount** in the box next to a team (must still clear the
     minimum legal next bid).
   - After any bid lands, a short cooldown briefly disables further bids so
     nobody misreads the price mid-click. The cooldown length is
     configurable per tournament (**Edit tournament → Bid cooldown
     (seconds)**, default 3s, set to 0 to disable it) — tune it to the pace
     you want the auction to run at.
   - Use **Pause / Resume / Extend Timer** for disputes or technical
     issues, **Undo Last Bid** or **Manual Assign** to correct mistakes.
   - **Mark Sold** or **Mark Unsold** to close out the current player. The
     big screen then shows a result screen (player, winning team and price,
     or "Unsold") for a configurable number of seconds (**Edit tournament →
     Result display (seconds)**, default 6s) before switching to "waiting
     for next player" — or it switches immediately once you click **Start
     Next Player** again. Repeat until the pool is empty.
   - For unsold players, either **create a re-round pool** (a fresh pool,
     re-auctioned like normal) or **return to original pool**, which sends
     them back where they came from but deprioritized — they're only drawn
     once every other player in that pool has been auctioned.
6. When the auction is done, go back to the workspace and **Export
   CSV/PDF** for the final results (team squads, spend summary, unsold
   list).

### Branded big-screen display (optional, per tournament)

The room-display view (`/room-display/<slug>`, step 3 under Viewer/Guest
below) normally uses a generic dark look. To brand it for a specific
tournament:

1. Open **Edit tournament** and, under "Use branded big-screen display",
   upload a tournament logo, club logo, and sponsor logo, then save.
2. From the tournament workspace header, click the **Big screen: Generic /
   Branded** button to switch the live display — it updates instantly and
   is fully reversible, so you can toggle back to the generic view any
   time (e.g. for a future tournament that doesn't have these assets).

## 2. Team Owner

No self-signup — the admin creates the login (step 3 above) and shares it.

1. Go to `/login` and sign in with the username/password the admin gave you.
2. You land on `/owner` — your **team dashboard**. If you own more than one
   team, switch between them with the dropdown at the top.
3. While the auction is live, you'll see:
   - The **current player** up for bidding, the current highest bid/bidder,
     and a countdown timer.
   - A **Place Bid** button — click it to bid the next increment amount
     (disabled once you already hold the highest bid).
   - A live **recent bids** ticker and your **remaining budget**.
4. Browse the full **player pool** at any time, and star players onto your
   private **wishlist** (only you can see it). Click a player to expand their
   photo and full details (nationality, club, etc., if the admin added them).
5. As players are sold to you, they appear in **My squad** with the price
   you paid.

## 3. Viewer / Guest

No login needed — just a link from the admin.

1. Open the shared link:
   - `/viewer/<tournament-slug>` — a normal dashboard: current player/bid,
     recent bids, sold/unsold lists, and every team's budget/squad.
   - `/room-display/<tournament-slug>` — a big-screen, minimal-chrome view
     meant for a projector or shared TV in the room.
2. Everything updates live as the admin runs the auction — no refresh
   needed.
3. If you don't have a direct link, `/viewer` or `/room-display` (with no
   slug) lists all tournaments that have public viewing enabled.
