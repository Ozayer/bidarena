import { useState } from 'react'
import { api } from '../../../api/client'
import { useApiList } from '../../../api/hooks'
import type { Position } from '../../../types/models'

export default function PositionsTab({ tournamentId }: { tournamentId: number }) {
  const { data: positions, loading, refetch } = useApiList<Position>(`positions/?tournament=${tournamentId}`)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await api.post('positions/', { tournament: tournamentId, name: name.trim(), order: positions.length })
      setName('')
      refetch()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`positions/${id}/`)
    refetch()
  }

  return (
    <div className="max-w-md">
      <p className="mb-4 text-sm text-slate-400">
        Positions/roles for this tournament (e.g. Defender, Midfielder, Goalkeeper) — used to tag players
        and organize bidding pools.
      </p>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          className="input"
          placeholder="e.g. Defender"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {loading && <p className="text-slate-400">Loading…</p>}

      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {positions.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm text-slate-100">
            {p.name}
            <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300">
              Remove
            </button>
          </li>
        ))}
        {!loading && positions.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500">No positions yet.</li>
        )}
      </ul>
    </div>
  )
}
