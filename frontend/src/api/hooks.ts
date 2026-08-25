import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './client'
import { connectAuctionSocket } from './socket'
import { playBidCue, playSoldCue, playTimerLowCue } from '../lib/sounds'
import type { AuctionState, Tournament } from '../types/models'

interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Fetches a DRF list endpoint (paginated or not) and exposes a refetch you can call after mutations. */
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
    api
      .get<Paginated<T> | T[]>(url)
      .then((res) => setData(Array.isArray(res.data) ? res.data : res.data.results))
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
