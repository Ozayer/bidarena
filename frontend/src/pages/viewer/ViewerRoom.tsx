import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuctionState, useAuctionSoundCues, useApiList, useNow, useTimerLowCue, useTournamentBySlug } from '../../api/hooks'
import PlayerRow from '../../components/PlayerRow'
import { groupPlayersByPool } from '../../lib/players'
import type { Player, Pool, Position, Team } from '../../types/models'
import PublicTournamentPicker from './PublicTournamentPicker'

export default function ViewerRoom() {
  const { slug } = useParams()
  if (!slug) return <PublicTournamentPicker basePath="/viewer" title="Live Auctions" />
  return <TournamentViewer slug={slug} />
}

function TournamentViewer({ slug }: { slug: string }) {
  const tournament = useTournamentBySlug(slug)
  const now = useNow()
  const state = useAuctionState(tournament ? tournament.id : null)

  const { data: teams } = useApiList<Team>(tournament ? `teams/?tournament=${tournament.id}` : '')
  const { data: players } = useApiList<Player>(tournament ? `players/?tournament=${tournament.id}` : '')
  const { data: positions } = useApiList<Position>(tournament ? `positions/?tournament=${tournament.id}` : '')
  const { data: pools } = useApiList<Pool>(tournament ? `pools/?tournament=${tournament.id}` : '')

  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null)
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null)

  let secondsLeft: number | null = null
  if (state?.status === 'paused') {
    secondsLeft = state.timer_paused_remaining_seconds
  } else if (state?.timer_ends_at) {
    secondsLeft = Math.max(0, Math.round((new Date(state.timer_ends_at).getTime() - now) / 1000))
  }
  useAuctionSoundCues(state)
  useTimerLowCue(secondsLeft)

  if (tournament === null) return <div className="p-6 text-slate-400">Loading…</div>
  if (tournament === false) {
    return (
      <div className="p-6">
        <p className="text-slate-400">This tournament isn't public, or doesn't exist.</p>
        <Link to="/viewer" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Back to live auctions
        </Link>
      </div>
    )
  }
  if (!state) return <div className="p-6 text-slate-400">Loading…</div>

  function positionName(id: number | null) {
    return positions.find((p) => p.id === id)?.name ?? '—'
  }

  const currentPlayer = state.current_player_detail

  const soldPlayers = players.filter((p) => p.status === 'sold')
  const unsoldPlayers = players.filter((p) => p.status === 'unsold')
  const poolablePlayers = players.filter((p) => p.status === 'available' || p.status === 'pooled')
  const poolGroups = groupPlayersByPool(poolablePlayers, pools)

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link to="/viewer" className="text-sm text-slate-500 hover:text-slate-300">
            ← Live auctions
          </Link>
          <h1 className="text-2xl font-semibold text-slate-100">{tournament.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium uppercase text-slate-400">
            {state.status.replace('_', ' ')}
          </span>
          <Link
            to={`/room-display/${tournament.slug}`}
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Big screen mode
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            {!currentPlayer && <p className="text-center text-slate-500">No player currently up for bidding.</p>}
            {currentPlayer && (
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
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
            <h3 className="mb-2 text-sm font-medium text-slate-200">Player pool ({poolablePlayers.length})</h3>
            <div className="max-h-72 space-y-4 overflow-y-auto">
              {poolGroups.map((group) => (
                <div key={group.key}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                  <ul className="divide-y divide-slate-800">
                    {group.players.map((player) => (
                      <PlayerRow
                        key={player.id}
                        player={player}
                        positionName={positionName}
                        isExpanded={expandedPlayerId === player.id}
                        onToggleExpand={() => setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
              {poolGroups.length === 0 && <p className="py-2 text-sm text-slate-500">No players to show.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-2 text-sm font-medium text-slate-200">Sold ({soldPlayers.length})</h3>
              <ul className="max-h-56 divide-y divide-slate-800 overflow-y-auto">
                {soldPlayers.map((p) => (
                  <li key={p.id} className="flex justify-between px-1 py-1.5 text-sm">
                    <span className="text-slate-200">{p.name}</span>
                    <span className="text-emerald-400">{p.sold_price}</span>
                  </li>
                ))}
                {soldPlayers.length === 0 && <li className="py-2 text-sm text-slate-500">None yet.</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-2 text-sm font-medium text-slate-200">Unsold ({unsoldPlayers.length})</h3>
              <ul className="max-h-56 divide-y divide-slate-800 overflow-y-auto">
                {unsoldPlayers.map((p) => (
                  <li key={p.id} className="px-1 py-1.5 text-sm text-slate-200">
                    {p.name}
                  </li>
                ))}
                {unsoldPlayers.length === 0 && <li className="py-2 text-sm text-slate-500">None yet.</li>}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-200">Teams</h3>
          {teams.map((team) => {
            const squad = soldPlayers.filter((p) => p.team === team.id)
            const isExpanded = expandedTeamId === team.id
            return (
              <div key={team.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <button
                  type="button"
                  onClick={() => setExpandedTeamId(isExpanded ? null : team.id)}
                  className="w-full text-left"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-medium text-slate-100">{team.name}</p>
                    {state.current_highest_team === team.id && (
                      <span className="text-xs font-medium text-emerald-400">Highest bidder</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Remaining: {team.budget_remaining} · Squad: {team.squad_size}
                  </p>
                </button>
                {isExpanded && (
                  <ul className="mt-2 divide-y divide-slate-800 border-t border-slate-800 pt-2">
                    {squad.map((player) => (
                      <li key={player.id} className="flex justify-between px-1 py-1.5 text-sm">
                        <span className="text-slate-200">{player.name}</span>
                        <span className="text-emerald-400">{player.sold_price}</span>
                      </li>
                    ))}
                    {squad.length === 0 && <li className="py-1.5 text-sm text-slate-500">No players yet.</li>}
                  </ul>
                )}
              </div>
            )
          })}
          {teams.length === 0 && <p className="text-sm text-slate-500">No teams yet.</p>}
        </div>
      </div>
    </div>
  )
}
