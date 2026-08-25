import axios from 'axios'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useApiList } from '../../api/hooks'
import { connectAuctionSocket } from '../../api/socket'
import { useAuthStore } from '../../store/auth'
import type { AuctionState, Player, Position, Team, Tournament, Wishlist } from '../../types/models'

export default function OwnerDashboard() {
  const user = useAuthStore((s) => s.user)

  const { data: teams, loading: teamsLoading, refetch: refetchTeams } = useApiList<Team>(
    user ? `teams/?owner_user=${user.id}` : ''
  )
  const [teamId, setTeamId] = useState<number | null>(null)

  useEffect(() => {
    if (!teamId && teams.length > 0) setTeamId(teams[0].id)
  }, [teams, teamId])

  if (!user) return <div className="p-6 text-slate-400">Loading…</div>
  if (teamsLoading) return <div className="p-6 text-slate-400">Loading…</div>
  if (teams.length === 0) {
    return (
      <div className="p-6">
        <h1 className="mb-2 text-2xl font-semibold text-slate-100">Team Owner Dashboard</h1>
        <p className="text-slate-400">
          You haven't been assigned to a team yet. Ask the tournament admin to link your account to a team.
        </p>
      </div>
    )
  }

  const team = teams.find((t) => t.id === teamId) ?? teams[0]

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">{team.name}</h1>
        {teams.length > 1 && (
          <select
            className="input w-auto"
            value={team.id}
            onChange={(e) => setTeamId(Number(e.target.value))}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <TeamAuctionView team={team} refetchTeams={refetchTeams} />
    </div>
  )
}

function TeamAuctionView({ team, refetchTeams }: { team: Team; refetchTeams: () => void }) {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [state, setState] = useState<AuctionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [showAllPlayers, setShowAllPlayers] = useState(false)

  const { data: positions } = useApiList<Position>(`positions/?tournament=${team.tournament}`)
  const { data: players, refetch: refetchPlayers } = useApiList<Player>(`players/?tournament=${team.tournament}`)
  const { data: wishlist, refetch: refetchWishlist } = useApiList<Wishlist>(`wishlist/?team=${team.id}`)

  useEffect(() => {
    api.get<Tournament>(`tournaments/${team.tournament}/`).then((res) => setTournament(res.data))
  }, [team.tournament])

  useEffect(() => {
    api.get<AuctionState>(`auction-sessions/for_tournament/?tournament=${team.tournament}`).then((res) => {
      setState(res.data)
    })
  }, [team.tournament])

  useEffect(() => {
    const socket = connectAuctionSocket(team.tournament)
    socket.onmessage = (event) => {
      setState(JSON.parse(event.data))
      refetchTeams()
      refetchPlayers()
    }
    return () => socket.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.tournament])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])

  async function placeBid() {
    if (!state) return
    setError(null)
    setBusy(true)
    try {
      const res = await api.post<AuctionState>(`auction-sessions/${state.id}/place-bid/`, { team: team.id })
      setState(res.data)
      refetchTeams()
    } catch (err) {
      const detail = axios.isAxiosError(err) ? (err.response?.data as { detail?: string })?.detail : null
      setError(detail || 'Could not place bid.')
    } finally {
      setBusy(false)
    }
  }

  function isWishlisted(playerId: number) {
    return wishlist.some((w) => w.player === playerId)
  }

  async function toggleWishlist(player: Player) {
    const entry = wishlist.find((w) => w.player === player.id)
    if (entry) {
      await api.delete(`wishlist/${entry.id}/`)
    } else {
      await api.post('wishlist/', { team: team.id, player: player.id })
    }
    refetchWishlist()
  }

  function positionName(id: number | null) {
    return positions.find((p) => p.id === id)?.name ?? '—'
  }

  if (!tournament || !state) return <p className="text-slate-400">Loading…</p>

  const currentPlayer = state.current_player_detail
  let secondsLeft: number | null = null
  if (state.status === 'paused') {
    secondsLeft = state.timer_paused_remaining_seconds
  } else if (state.timer_ends_at) {
    secondsLeft = Math.max(0, Math.round((new Date(state.timer_ends_at).getTime() - now) / 1000))
  }

  const iAmHighestBidder = state.current_highest_team === team.id
  const canBid = state.status === 'live' && !!currentPlayer && !iAmHighestBidder

  const visiblePlayers = showAllPlayers ? players : players.filter((p) => p.status === 'available' || p.status === 'pooled')
  const mySquad = players.filter((p) => p.team === team.id && p.status === 'sold')

  return (
    <div>
      <p className="mb-4 text-sm text-slate-400">
        {tournament.name} · Budget remaining: <span className="text-slate-200">{team.budget_remaining}</span> · Squad:{' '}
        <span className="text-slate-200">{team.squad_size}</span>
      </p>

      {error && (
        <div className="mb-4 rounded border border-red-800 bg-red-950 px-4 py-2 text-sm text-red-300">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            {!currentPlayer && <p className="text-center text-slate-500">No player currently up for bidding.</p>}
            {currentPlayer && (
              <div className="flex items-center gap-6">
                {currentPlayer.photo && (
                  <img src={currentPlayer.photo} alt="" className="h-24 w-24 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-100">{currentPlayer.name}</h2>
                  <p className="text-sm text-slate-400">
                    {positionName(currentPlayer.position)} · Base price: {currentPlayer.base_price}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-emerald-400">
                    {state.current_highest_bid ?? currentPlayer.base_price}
                  </p>
                  <p className="text-sm text-slate-400">
                    {iAmHighestBidder
                      ? 'You are the highest bidder'
                      : state.current_highest_team_detail
                        ? `Highest bidder: ${state.current_highest_team_detail.name}`
                        : 'No bids yet'}
                  </p>
                </div>
                {secondsLeft !== null && (
                  <div
                    className={`rounded-full border-4 px-6 py-4 text-center ${
                      secondsLeft <= 5 ? 'border-red-600 text-red-400' : 'border-emerald-700 text-emerald-300'
                    }`}
                  >
                    <div className="text-3xl font-bold">{secondsLeft}s</div>
                  </div>
                )}
              </div>
            )}
            {currentPlayer && (
              <button
                onClick={placeBid}
                disabled={busy || !canBid}
                className="mt-4 w-full rounded bg-emerald-600 py-3 text-lg font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {iAmHighestBidder ? 'You hold the highest bid' : 'Place Bid'}
              </button>
            )}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 className="mb-2 text-sm font-medium text-slate-200">Recent bids</h3>
            <ul className="divide-y divide-slate-800">
              {state.recent_bids.map((bid) => (
                <li key={bid.id} className="flex justify-between px-1 py-2 text-sm">
                  <span className="text-slate-200">{bid.team_name}</span>
                  <span className="text-emerald-400">{bid.amount}</span>
                </li>
              ))}
              {state.recent_bids.length === 0 && <li className="py-2 text-sm text-slate-500">No bids yet.</li>}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-200">Player pool</h3>
              <label className="flex items-center gap-1 text-xs text-slate-400">
                <input type="checkbox" checked={showAllPlayers} onChange={(e) => setShowAllPlayers(e.target.checked)} />
                Show all players
              </label>
            </div>
            <ul className="max-h-72 divide-y divide-slate-800 overflow-y-auto">
              {visiblePlayers.map((player) => (
                <li key={player.id} className="flex items-center justify-between px-1 py-2 text-sm">
                  <div>
                    <span className="text-slate-100">{player.name}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {positionName(player.position)} · {player.base_price} · {player.status}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleWishlist(player)}
                    title={isWishlisted(player.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    className={isWishlisted(player.id) ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}
                  >
                    ★
                  </button>
                </li>
              ))}
              {visiblePlayers.length === 0 && <li className="py-2 text-sm text-slate-500">No players to show.</li>}
            </ul>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-200">My squad</h3>
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
            {mySquad.map((player) => (
              <li key={player.id} className="flex justify-between px-3 py-2 text-sm">
                <span className="text-slate-100">{player.name}</span>
                <span className="text-emerald-400">{player.sold_price}</span>
              </li>
            ))}
            {mySquad.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">No players won yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
