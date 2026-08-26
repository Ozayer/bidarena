import { useParams } from 'react-router-dom'
import {
  useAuctionState,
  useAuctionSoundCues,
  useNow,
  useResultScreen,
  useTimerLowCue,
  useTournamentBySlug,
} from '../../api/hooks'
import type { AuctionEvent, AuctionState, Tournament } from '../../types/models'
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
  const resultEvent = useResultScreen(state, tournament ? tournament.result_display_seconds : 0)

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

  if (tournament.themed_display_enabled) {
    return <ThemedDisplay tournament={tournament} state={state} secondsLeft={secondsLeft} resultEvent={resultEvent} />
  }
  return <GenericDisplay tournament={tournament} state={state} secondsLeft={secondsLeft} resultEvent={resultEvent} />
}

type DisplayProps = {
  tournament: Tournament
  state: AuctionState
  secondsLeft: number | null
  resultEvent: AuctionEvent | null
}

function ResultBanner({
  event,
  variant,
  tournamentLogo,
}: {
  event: AuctionEvent
  variant: 'generic' | 'themed'
  tournamentLogo: string | null
}) {
  const isSold = event.event_type === 'sold' || event.event_type === 'manual_assign'
  const teamName = typeof event.detail.team_name === 'string' ? event.detail.team_name : null
  const amount = typeof event.detail.amount === 'string' ? event.detail.amount : null

  const accent = variant === 'themed' ? 'text-orange-300' : 'text-emerald-400'
  const badgeClass = isSold
    ? variant === 'themed'
      ? 'bg-orange-500/20 text-orange-300 border-orange-400'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-600'
    : 'bg-red-500/20 text-red-300 border-red-600'

  return (
    <div className="flex w-full max-w-6xl items-center justify-between gap-6">
      <div className="flex w-36 shrink-0 items-center justify-center">
        {isSold && tournamentLogo && (
          <img src={tournamentLogo} alt="" className="h-32 w-32 rounded-full object-contain" />
        )}
      </div>

      <div className="flex flex-1 flex-col items-center gap-6 text-center">
        {event.player_photo && (
          <img
            src={event.player_photo}
            alt=""
            className={`h-72 w-72 rounded-2xl object-cover shadow-2xl ${
              variant === 'themed' ? 'border-4 border-orange-400/70' : ''
            }`}
          />
        )}
        <h2 className="text-6xl font-extrabold">{event.player_name}</h2>
        <span className={`rounded-full border-4 px-8 py-2 text-3xl font-extrabold uppercase tracking-wide ${badgeClass}`}>
          {isSold ? 'Sold!' : 'Unsold'}
        </span>
        {isSold && teamName && (
          <p className="text-3xl">
            to <span className="font-bold">{teamName}</span>
            {amount && (
              <>
                {' '}
                for <span className={`font-extrabold ${accent}`}>{amount}</span>
              </>
            )}
          </p>
        )}
      </div>

      <div className="flex w-36 shrink-0 items-center justify-center">
        {isSold && event.team_logo && (
          <img src={event.team_logo} alt="" className="h-32 w-32 rounded-full object-contain" />
        )}
      </div>
    </div>
  )
}

function LogoWatermarks({ logos }: { logos: string[] }) {
  if (logos.length === 0) return null
  const tiles = Array.from({ length: 24 }, (_, i) => logos[i % logos.length])
  return (
    <div className="pointer-events-none absolute inset-0 grid grid-cols-6 gap-8 overflow-hidden p-8 opacity-[0.07]">
      {tiles.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          className="h-20 w-20 self-center justify-self-center object-contain grayscale"
          style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 12}deg)` }}
        />
      ))}
    </div>
  )
}

function GenericDisplay({ tournament, state, secondsLeft, resultEvent }: DisplayProps) {
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
        {!currentPlayer && resultEvent && (
          <ResultBanner event={resultEvent} variant="generic" tournamentLogo={tournament.theme_primary_logo} />
        )}
        {!currentPlayer && !resultEvent && <p className="text-4xl text-slate-600">Waiting for the next player…</p>}
        {currentPlayer && (
          <div className="flex w-full max-w-5xl items-center justify-between gap-12">
            <div className="flex items-center gap-8">
              {currentPlayer.photo && (
                <img src={currentPlayer.photo} alt="" className="h-72 w-72 rounded-2xl object-cover" />
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

function ThemedDisplay({ tournament, state, secondsLeft, resultEvent }: DisplayProps) {
  const currentPlayer = state.current_player_detail

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden p-8 text-white"
      style={{
        background:
          'radial-gradient(circle at 12% 8%, rgba(255,255,255,0.10), transparent 35%),' +
          'radial-gradient(circle at 88% 92%, rgba(255,164,60,0.18), transparent 45%),' +
          'linear-gradient(135deg, #2f3fc4 0%, #2a3aa8 35%, #10164a 100%)',
      }}
    >
      {/* decorative dotted confetti backdrop, echoing the tournament poster */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: 'radial-gradient(white 2px, transparent 2px), radial-gradient(rgba(255,164,60,0.7) 1.5px, transparent 1.5px)',
          backgroundSize: '60px 60px, 26px 26px',
          backgroundPosition: '0 0, 13px 13px',
        }}
      />

      <LogoWatermarks
        logos={[
          tournament.theme_primary_logo,
          tournament.theme_club_logo,
          ...tournament.sponsor_logos.map((l) => l.image),
        ].filter((l): l is string => Boolean(l))}
      />

      <header className="relative z-10 flex items-center justify-between border-b border-orange-400/20 pb-5">
        <div className="flex items-center gap-4">
          {tournament.theme_club_logo && (
            <img
              src={tournament.theme_club_logo}
              alt=""
              className="h-16 w-16 rounded-full border-2 border-orange-400/60 object-cover shadow-lg shadow-orange-500/20"
            />
          )}
          <div className="hidden sm:block">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-300/80">Host club</p>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {tournament.theme_primary_logo && (
            <img
              src={tournament.theme_primary_logo}
              alt=""
              className="h-28 w-28 rounded-full border-4 border-orange-400 object-cover shadow-xl shadow-orange-500/30"
            />
          )}
          <h1 className="mt-2 bg-gradient-to-b from-orange-200 to-orange-500 bg-clip-text text-3xl font-extrabold tracking-wide text-transparent">
            {tournament.name}
          </h1>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-orange-400/50 bg-orange-400/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-orange-300">
            {state.status.replace('_', ' ')}
          </span>
          {tournament.sponsor_logos.length > 0 && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] uppercase tracking-wide text-blue-200/70">Sponsored by</span>
              <div className="flex gap-2">
                {tournament.sponsor_logos.map((logo) => (
                  <img
                    key={logo.id}
                    src={logo.image}
                    alt=""
                    className="h-16 w-16 rounded-full border-2 border-orange-400/60 object-cover shadow-lg shadow-orange-500/20"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        {!currentPlayer && resultEvent && (
          <ResultBanner event={resultEvent} variant="themed" tournamentLogo={tournament.theme_primary_logo} />
        )}
        {!currentPlayer && !resultEvent && (
          <p className="text-4xl font-semibold text-blue-200/60">Waiting for the next player…</p>
        )}
        {currentPlayer && (
          <div className="flex w-full max-w-5xl items-center justify-between gap-12">
            <div className="flex items-center gap-8">
              {currentPlayer.photo && (
                <img
                  src={currentPlayer.photo}
                  alt=""
                  className="h-72 w-72 rounded-2xl border-4 border-orange-400/70 object-cover shadow-2xl shadow-orange-500/20"
                />
              )}
              <div>
                <h2 className="text-6xl font-extrabold text-white drop-shadow-[0_2px_12px_rgba(251,191,36,0.35)]">
                  {currentPlayer.name}
                </h2>
                <p className="mt-2 text-2xl text-blue-200/80">Base price: {currentPlayer.base_price}</p>
                <p className="mt-6 bg-gradient-to-r from-orange-300 to-orange-500 bg-clip-text text-7xl font-extrabold text-transparent">
                  {state.current_highest_bid ?? currentPlayer.base_price}
                </p>
                <p className="mt-2 text-2xl font-medium text-white">
                  {state.current_highest_team_detail ? state.current_highest_team_detail.name : 'No bids yet'}
                </p>
              </div>
            </div>

            {secondsLeft !== null && (
              <div
                className={`flex h-48 w-48 shrink-0 items-center justify-center rounded-full border-8 text-7xl font-extrabold shadow-2xl ${
                  secondsLeft <= 5
                    ? 'border-red-500 text-red-400 shadow-red-500/30'
                    : 'border-orange-400 text-orange-300 shadow-orange-500/30'
                }`}
              >
                {secondsLeft}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative z-10 mt-6 border-t border-orange-400/20 pt-4">
        <div className="flex gap-8 overflow-x-hidden text-lg">
          {state.recent_bids.slice(0, 8).map((bid) => (
            <span key={bid.id} className="whitespace-nowrap text-blue-100">
              <span className="font-semibold text-white">{bid.team_name}</span>{' '}
              <span className="text-orange-300">{bid.amount}</span>
            </span>
          ))}
          {state.recent_bids.length === 0 && <span className="text-blue-300/50">No bids yet.</span>}
        </div>
      </div>
    </div>
  )
}
