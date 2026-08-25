import { useCallback, useEffect, useState } from 'react'
import { api } from './client'
import { connectAuctionSocket } from './socket'
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
