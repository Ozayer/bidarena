import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import { useApiList } from '../../api/hooks'
import { connectAuctionSocket } from '../../api/socket'
import type { AuctionState, Player, Pool, Team, Tournament } from '../../types/models'

export default function AuctionRoom() {
  const { id } = useParams()
  const tournamentId = Number(id)

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [state, setState] = useState<AuctionState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now())

  const { data: pools } = useApiList<Pool>(`pools/?tournament=${tournamentId}`)
  const { data: teams, refetch: refetchTeams } = useApiList<Team>(`teams/?tournament=${tournamentId}`)
  const { data: players, refetch: refetchPlayers } = useApiList<Player>(`players/?tournament=${tournamentId}`)

  const [selectedPoolId, setSelectedPoolId] = useState('')
  const [extendSeconds, setExtendSeconds] = useState('')
  const [selectedUnsoldIds, setSelectedUnsoldIds] = useState<number[]>([])
  const [reRoundName, setReRoundName] = useState('')
  const [manualPlayerId, setManualPlayerId] = useState('')
  const [manualTeamId, setManualTeamId] = useState('')
  const [manualPrice, setManualPrice] = useState('')

  useEffect(() => {
    api.get<Tournament>(`tournaments/${tournamentId}/`).then((res) => setTournament(res.data))
  }, [tournamentId])

  useEffect(() => {
    api.get<AuctionState>(`auction-sessions/for_tournament/?tournament=${tournamentId}`).then((res) => {
      setState(res.data)
      if (res.data.active_pool) setSelectedPoolId(String(res.data.active_pool))
    })
  }, [tournamentId])

  useEffect(() => {
    const socket = connectAuctionSocket(tournamentId)
    socket.onmessage = (event) => {
      setState(JSON.parse(event.data))
      refetchTeams()
      refetchPlayers()
    }
    return () => socket.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])

  async function runAction(path: string, body: Record<string, unknown> = {}) {
    if (!state) return
    setError(null)
    setBusy(true)
    try {
      const res = await api.post<AuctionState>(`auction-sessions/${state.id}/${path}/`, body)
      setState(res.data)
      refetchTeams()
      refetchPlayers()
    } catch (err) {
      const detail = axios.isAxiosError(err) ? (err.response?.data as { detail?: string })?.detail : null
      setError(detail || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  async function createReRound() {
    if (selectedUnsoldIds.length === 0) return
    setError(null)
    setBusy(true)
    try {
      await api.post('pools/create-re-round/', {
        tournament: tournamentId,
        player_ids: selectedUnsoldIds,
        name: reRoundName.trim() || undefined,
      })
      setSelectedUnsoldIds([])
      setReRoundName('')
      refetchPlayers()
    } catch (err) {
      const detail = axios.isAxiosError(err) ? (err.response?.data as { detail?: string })?.detail : null
      setError(detail || 'Could not create re-round pool.')
    } finally {
      setBusy(false)
    }
  }

  async function manualAssign() {
    if (!manualPlayerId || !manualTeamId || !manualPrice) return
    await runAction('manual-assign', { player: Number(manualPlayerId), team: Number(manualTeamId), price: manualPrice })
    setManualPlayerId('')
    setManualTeamId('')
    setManualPrice('')
  }

  if (!tournament || !state) return <div className="p-6 text-slate-400">Loading…</div>

  const currentPlayer = state.current_player_detail
  const eligiblePools = pools.filter((p) => p.status !== 'completed')
  const unsoldPlayers = players.filter((p) => p.status === 'unsold')
  const assignablePlayers = players.filter((p) => p.status !== 'sold')

  let secondsLeft: number | null = null
  if (state.status === 'paused') {
    secondsLeft = state.timer_paused_remaining_seconds
  } else if (state.timer_ends_at) {
    secondsLeft = Math.max(0, Math.round((new Date(state.timer_ends_at).getTime() - now) / 1000))
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link to={`/admin/tournaments/${tournamentId}`} className="text-sm text-slate-500 hover:text-slate-300">
            ← {tournament.name}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-100">Run Auction</h1>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${
            state.status === 'live'
              ? 'bg-emerald-900 text-emerald-300'
              : state.status === 'paused'
                ? 'bg-amber-900 text-amber-300'
                : 'bg-slate-800 text-slate-400'
          }`}
        >
          {state.status.replace('_', ' ')}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-800 bg-red-950 px-4 py-2 text-sm text-red-300">{error}</div>
      )}

      {/* Control bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
        {state.status === 'not_started' && (
          <button
            onClick={() => runAction('start')}
            disabled={busy}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Start Auction
          </button>
        )}

        {state.status !== 'not_started' && (
          <>
            <select
              className="input w-auto"
              value={selectedPoolId}
              onChange={(e) => setSelectedPoolId(e.target.value)}
              disabled={!!currentPlayer}
            >
              <option value="">— select pool —</option>
              {eligiblePools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => runAction('next-player', selectedPoolId ? { pool: Number(selectedPoolId) } : {})}
              disabled={busy || !!currentPlayer}
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Start Next Player
            </button>

            {state.status === 'live' && (
              <button
                onClick={() => runAction('pause')}
                disabled={busy}
                className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Pause
              </button>
            )}
            {state.status === 'paused' && (
              <button
                onClick={() => runAction('resume')}
                disabled={busy}
                className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Resume
              </button>
            )}

            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                placeholder={`+${tournament.bid_timer_extend_seconds}s`}
                className="input w-24"
                value={extendSeconds}
                onChange={(e) => setExtendSeconds(e.target.value)}
              />
              <button
                onClick={() => runAction('extend-timer', extendSeconds ? { seconds: Number(extendSeconds) } : {})}
                disabled={busy}
                className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Extend
              </button>
            </div>

            <button
              onClick={() => runAction('mark-sold')}
              disabled={busy || !currentPlayer || !state.current_highest_team}
              className="ml-auto rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Mark Sold
            </button>
            <button
              onClick={() => runAction('mark-unsold')}
              disabled={busy || !currentPlayer}
              className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
            >
              Mark Unsold
            </button>
            <button
              onClick={() => runAction('undo-last-bid')}
              disabled={busy || !currentPlayer}
              className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Undo Last Bid
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Current player + timer + bid ticker */}
        <div className="col-span-2 space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            {!currentPlayer && (
              <p className="text-center text-slate-500">No player currently up for bidding.</p>
            )}
            {currentPlayer && (
              <div className="flex items-center gap-6">
                {currentPlayer.photo && (
                  <img src={currentPlayer.photo} alt="" className="h-24 w-24 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-100">{currentPlayer.name}</h2>
                  <p className="text-sm text-slate-400">Base price: {currentPlayer.base_price}</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-400">
                    {state.current_highest_bid ?? currentPlayer.base_price}
                  </p>
                  <p className="text-sm text-slate-400">
                    {state.current_highest_team_detail
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
            <h3 className="mb-2 text-sm font-medium text-slate-200">Unsold players</h3>
            <ul className="mb-3 max-h-48 divide-y divide-slate-800 overflow-y-auto">
              {unsoldPlayers.map((player) => (
                <li key={player.id} className="flex items-center gap-2 px-1 py-1.5 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={selectedUnsoldIds.includes(player.id)}
                    onChange={(e) =>
                      setSelectedUnsoldIds((ids) =>
                        e.target.checked ? [...ids, player.id] : ids.filter((i) => i !== player.id)
                      )
                    }
                  />
                  {player.name}
                </li>
              ))}
              {unsoldPlayers.length === 0 && <li className="py-2 text-sm text-slate-500">No unsold players.</li>}
            </ul>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Re-round pool name (optional)"
                value={reRoundName}
                onChange={(e) => setReRoundName(e.target.value)}
              />
              <button
                onClick={createReRound}
                disabled={busy || selectedUnsoldIds.length === 0}
                className="shrink-0 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Create re-round pool
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h3 className="mb-2 text-sm font-medium text-slate-200">Manual assign (dispute override)</h3>
            <div className="flex flex-wrap gap-2">
              <select className="input w-auto" value={manualPlayerId} onChange={(e) => setManualPlayerId(e.target.value)}>
                <option value="">— player —</option>
                {assignablePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select className="input w-auto" value={manualTeamId} onChange={(e) => setManualTeamId(e.target.value)}>
                <option value="">— team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Price"
                className="input w-28"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
              />
              <button
                onClick={manualAssign}
                disabled={busy || !manualPlayerId || !manualTeamId || !manualPrice}
                className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>

        {/* Teams panel */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-200">Teams</h3>
          {teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium text-slate-100">{team.name}</p>
                {state.current_highest_team === team.id && (
                  <span className="text-xs font-medium text-emerald-400">Highest bidder</span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Remaining: {team.budget_remaining} · Squad: {team.squad_size}
              </p>
              {currentPlayer && (
                <button
                  onClick={() => runAction('place-bid', { team: team.id })}
                  disabled={busy || state.status !== 'live' || state.current_highest_team === team.id}
                  className="mt-2 w-full rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Place bid
                </button>
              )}
            </div>
          ))}
          {teams.length === 0 && <p className="text-sm text-slate-500">No teams yet.</p>}
        </div>
      </div>
    </div>
  )
}
