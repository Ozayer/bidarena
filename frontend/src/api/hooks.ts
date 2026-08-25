import { useCallback, useEffect, useState } from 'react'
import { api } from './client'

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
