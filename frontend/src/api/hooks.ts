import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './client'
import { connectAuctionSocket } from './socket'
import { playBidCue, playSoldCue, playTimerLowCue } from '../lib/sounds'
import type { AuctionEvent, AuctionState, Tournament } from '../types/models'

interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

async function fetchAllPages<T>(url: string): Promise<T[]> {
  const all: T[] = []
  let next: string | null = url
  while (next) {
    const res: { data: Paginated<T> | T[] } = await api.get<Paginated<T> | T[]>(next)
    if (Array.isArray(res.data)) {
      all.push(...res.data)
      next = null
    } else {
      all.push(...res.data.results)
      next = res.data.next
    }
  }
  return all
}

/** Fetches every page of a DRF list endpoint (paginated or not) and exposes a refetch you
 * can call after mutations — admin screens need the full list, not just the first page. */
export function useApiList<T>(url: string) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!url) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    fetchAllPages<T>(url)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [url])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}

/** Fetches an auction session's state and keeps it live via the auction WebSocket — used by any
 * read-only auction view (public viewer, room display) that doesn't need to drive REST actions itself. */
export function useAuctionState(tournamentId: number | null, onUpdate?: (state: AuctionState) => void) {
  const [state, setState] = useState<AuctionState | null>(null)

  useEffect(() => {
    if (!tournamentId) return
    let active = true
    api
      .get<AuctionState>(`auction-sessions/for_tournament/?tournament=${tournamentId}`)
      .then((res) => active && setState(res.data))

    const socket = connectAuctionSocket(tournamentId)
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as AuctionState
      setState(data)
      onUpdate?.(data)
    }
    return () => {
      active = false
      socket.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId])

  return state
}

/** Resolves a tournament from its public slug — `null` while loading, `false` if not found/not public. */
export function useTournamentBySlug(slug: string | undefined) {
  const [tournament, setTournament] = useState<Tournament | null | false>(null)

  useEffect(() => {
    if (!slug) return
    setTournament(null)
    api.get<Paginated<Tournament> | Tournament[]>(`tournaments/?slug=${encodeURIComponent(slug)}`).then((res) => {
      const results = Array.isArray(res.data) ? res.data : res.data.results
      const found = results[0]
      setTournament(found && found.public_guest_link_enabled ? found : false)
    })
  }, [slug])

  return tournament
}

/** Ticks every `intervalMs` — pair with a `timer_ends_at` timestamp to render a live countdown. */
export function useNow(intervalMs = 500) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

/** Plays a short cue when a new bid arrives or a player is marked sold, based on `AuctionState` transitions
 * — pass `null` to skip (e.g. before the auction state has loaded). Safe to call from multiple components
 * watching the same tournament; each just plays its own local sound. */
export function useAuctionSoundCues(state: AuctionState | null) {
  const lastBidId = useRef<number | null>(null)
  const lastEventId = useRef<number | null>(null)

  useEffect(() => {
    if (!state) return
    const newestBid = state.recent_bids[0]
    if (newestBid && lastBidId.current !== null && newestBid.id !== lastBidId.current) {
      playBidCue()
    }
    lastBidId.current = newestBid ? newestBid.id : lastBidId.current

    const event = state.last_event
    if (event && lastEventId.current !== null && event.id !== lastEventId.current && event.event_type === 'sold') {
      playSoldCue()
    }
    lastEventId.current = event ? event.id : lastEventId.current
  }, [state])
}

/** Mirrors the server-enforced post-bid freeze (`Tournament.bid_cooldown_seconds`, admin-configurable)
 * so bid buttons visibly disable for everyone right after a bid lands, giving people a moment to
 * register the new price before the next bid can be placed. */
export function useBidCooldown(state: AuctionState | null, cooldownSeconds: number) {
  const now = useNow()
  const lastBid = state?.recent_bids[0]
  if (!lastBid || cooldownSeconds <= 0) return { inCooldown: false, remainingSeconds: 0 }
  const elapsed = (now - new Date(lastBid.placed_at).getTime()) / 1000
  const remaining = cooldownSeconds - elapsed
  return { inCooldown: remaining > 0, remainingSeconds: Math.max(0, Math.ceil(remaining)) }
}

const RESULT_EVENT_TYPES = new Set(['sold', 'unsold', 'manual_assign'])

/** For the big-screen display: once a player is marked sold/unsold, hold that result on screen
 * (who bought them, for how much) for `resultSeconds` — or until the next player starts, whichever
 * comes first — before falling back to the "waiting for next player" state. `resultSeconds <= 0`
 * means "show until the next player starts" with no time limit. */
export function useResultScreen(state: AuctionState | null, resultSeconds: number) {
  const now = useNow()
  const [shown, setShown] = useState<{ event: AuctionEvent; shownAt: number } | null>(null)
  const lastEventId = state?.last_event?.id
  const hasCurrentPlayer = !!state?.current_player_detail

  useEffect(() => {
    const event = state?.last_event
    if (!event || !RESULT_EVENT_TYPES.has(event.event_type) || hasCurrentPlayer) return
    setShown((prev) => (prev?.event.id === event.id ? prev : { event, shownAt: Date.now() }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEventId, hasCurrentPlayer])

  if (!shown || hasCurrentPlayer) return null
  if (resultSeconds > 0 && now - shown.shownAt >= resultSeconds * 1000) return null
  return shown.event
}

/** Plays a ticking cue once per second while `secondsLeft` is in the final countdown window. */
export function useTimerLowCue(secondsLeft: number | null, threshold = 5) {
  const lastSecond = useRef<number | null>(null)

  useEffect(() => {
    if (secondsLeft === null || secondsLeft > threshold || secondsLeft <= 0) {
      lastSecond.current = secondsLeft
      return
    }
    if (lastSecond.current !== secondsLeft) {
      playTimerLowCue()
    }
    lastSecond.current = secondsLeft
  }, [secondsLeft, threshold])
}
