import { useParams } from 'react-router-dom'
import { useAuctionState, useAuctionSoundCues, useNow, useTimerLowCue, useTournamentBySlug } from '../../api/hooks'
import PublicTournamentPicker from './PublicTournamentPicker'

export default function RoomDisplay() {
  const { slug } = useParams()
  if (!slug) return <PublicTournamentPicker basePath="/room-display" title="Room Display" />
  return <TournamentRoomDisplay slug={slug} />
}

function TournamentRoomDisplay({ slug }: { slug: string }) {
  const tournament = useTournamentBySlug(slug)
  const now = useNow()
  const state = useAuctionState(tournament ? tournament.id : null)

  let secondsLeft: number | null = null
  if (state?.status === 'paused') {
    secondsLeft = state.timer_paused_remaining_seconds
  } else if (state?.timer_ends_at) {
    secondsLeft = Math.max(0, Math.round((new Date(state.timer_ends_at).getTime() - now) / 1000))
  }
  useAuctionSoundCues(state)
  useTimerLowCue(secondsLeft)

  if (tournament === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-500">Loading…</div>
    )
  }
  if (tournament === false) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-500">
        This tournament isn't public, or doesn't exist.
      </div>
    )
  }
  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-500">Loading…</div>
    )
  }

  const currentPlayer = state.current_player_detail

  return (
    <div className="flex h-screen flex-col bg-slate-950 p-10 text-slate-100">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">{tournament.name}</h1>
        <span className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium uppercase tracking-wide text-slate-400">
          {state.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center">
        {!currentPlayer && <p className="text-4xl text-slate-600">Waiting for the next player…</p>}
        {currentPlayer && (
          <div className="flex w-full max-w-5xl items-center justify-between gap-12">
            <div className="flex items-center gap-8">
              {currentPlayer.photo && (
                <img src={currentPlayer.photo} alt="" className="h-56 w-56 rounded-2xl object-cover" />
              )}
              <div>
                <h2 className="text-6xl font-bold">{currentPlayer.name}</h2>
                <p className="mt-2 text-2xl text-slate-400">Base price: {currentPlayer.base_price}</p>
                <p className="mt-6 text-7xl font-extrabold text-emerald-400">
                  {state.current_highest_bid ?? currentPlayer.base_price}
                </p>
                <p className="mt-2 text-2xl text-slate-300">
                  {state.current_highest_team_detail ? state.current_highest_team_detail.name : 'No bids yet'}
                </p>
              </div>
            </div>

            {secondsLeft !== null && (
              <div
                className={`flex h-48 w-48 shrink-0 items-center justify-center rounded-full border-8 text-7xl font-extrabold ${
                  secondsLeft <= 5 ? 'border-red-600 text-red-400' : 'border-emerald-700 text-emerald-300'
                }`}
              >
                {secondsLeft}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-slate-800 pt-4">
        <div className="flex gap-8 overflow-x-hidden text-lg">
          {state.recent_bids.slice(0, 8).map((bid) => (
            <span key={bid.id} className="whitespace-nowrap text-slate-300">
              <span className="font-semibold text-slate-100">{bid.team_name}</span>{' '}
              <span className="text-emerald-400">{bid.amount}</span>
            </span>
          ))}
          {state.recent_bids.length === 0 && <span className="text-slate-600">No bids yet.</span>}
        </div>
      </div>
    </div>
  )
}
