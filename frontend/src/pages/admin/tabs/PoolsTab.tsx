import { useState } from 'react'
import { api } from '../../../api/client'
import { useApiList } from '../../../api/hooks'
import type { Player, Pool, Position } from '../../../types/models'

type FormState = {
  id: number | null
  name: string
  position: string
}

const emptyForm: FormState = { id: null, name: '', position: '' }

export default function PoolsTab({ tournamentId }: { tournamentId: number }) {
  const { data: pools, loading, refetch } = useApiList<Pool>(`pools/?tournament=${tournamentId}`)
  const { data: positions } = useApiList<Position>(`positions/?tournament=${tournamentId}`)
  const { data: players, refetch: refetchPlayers } = useApiList<Player>(`players/?tournament=${tournamentId}`)

  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null)
  const [addPlayerId, setAddPlayerId] = useState('')

  const sortedPools = [...pools].sort((a, b) => a.order - b.order)
  const selectedPool = sortedPools.find((p) => p.id === selectedPoolId) ?? null
  const poolPlayers = players.filter((p) => p.pool === selectedPoolId)
  const unassignedPlayers = players.filter((p) => p.pool === null)

  function startEdit(pool: Pool) {
    setForm({ id: pool.id, name: pool.name, position: pool.position ? String(pool.position) : '' })
  }

  function resetForm() {
    setForm(emptyForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        tournament: tournamentId,
        name: form.name.trim(),
        position: form.position || null,
      }
      if (form.id) {
        await api.patch(`pools/${form.id}/`, body)
      } else {
        await api.post('pools/', { ...body, order: pools.length })
      }
      resetForm()
      refetch()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`pools/${id}/`)
    if (selectedPoolId === id) setSelectedPoolId(null)
    refetch()
  }

  async function moveOrder(pool: Pool, direction: -1 | 1) {
    const idx = sortedPools.findIndex((p) => p.id === pool.id)
    const swapWith = sortedPools[idx + direction]
    if (!swapWith) return
    await Promise.all([
      api.patch(`pools/${pool.id}/`, { order: swapWith.order }),
      api.patch(`pools/${swapWith.id}/`, { order: pool.order }),
    ])
    refetch()
  }

  async function assignPlayer(playerId: number) {
    if (!selectedPoolId) return
    await api.patch(`players/${playerId}/`, { pool: selectedPoolId, status: 'pooled' })
    setAddPlayerId('')
    refetchPlayers()
  }

  async function unassignPlayer(playerId: number) {
    await api.patch(`players/${playerId}/`, { pool: null, status: 'available' })
    refetchPlayers()
  }

  function positionName(id: number | null) {
    return positions.find((p) => p.id === id)?.name ?? '—'
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-400">
        Group players into bidding pools (e.g. Defender Pool A/B) and set the order they'll be auctioned in.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <form
            onSubmit={handleSubmit}
            className="mb-4 space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4"
          >
            <h3 className="text-sm font-medium text-slate-200">{form.id ? 'Edit pool' : 'Add a pool'}</h3>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Pool name</label>
              <input
                required
                className="input"
                placeholder="e.g. Defender Pool A"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Position (optional)</label>
              <select
                className="input"
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              >
                <option value="">— any —</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {form.id ? 'Save changes' : 'Add pool'}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {loading && <p className="text-slate-400">Loading…</p>}

          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
            {sortedPools.map((pool, idx) => (
              <li
                key={pool.id}
                className={`flex items-center justify-between px-4 py-2 text-sm ${
                  selectedPoolId === pool.id ? 'bg-slate-800' : ''
                }`}
              >
                <button
                  onClick={() => setSelectedPoolId(pool.id)}
                  className="flex-1 text-left text-slate-100 hover:text-emerald-400"
                >
                  {pool.name}
                  <span className="ml-2 text-xs text-slate-500">
                    {positionName(pool.position)} · {players.filter((p) => p.pool === pool.id).length} players
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveOrder(pool, -1)}
                    disabled={idx === 0}
                    className="text-slate-400 hover:text-slate-200 disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveOrder(pool, 1)}
                    disabled={idx === sortedPools.length - 1}
                    className="text-slate-400 hover:text-slate-200 disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button onClick={() => startEdit(pool)} className="text-emerald-400 hover:text-emerald-300">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(pool.id)} className="text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </div>
              </li>
            ))}
            {!loading && sortedPools.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">No pools yet.</li>
            )}
          </ul>
        </div>

        <div>
          {!selectedPool && (
            <p className="rounded-lg border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
              Select a pool to manage its players.
            </p>
          )}

          {selectedPool && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-200">Players in “{selectedPool.name}”</h3>

              <div className="mb-3 flex gap-2">
                <select
                  className="input"
                  value={addPlayerId}
                  onChange={(e) => setAddPlayerId(e.target.value)}
                >
                  <option value="">— select a player to add —</option>
                  {unassignedPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => addPlayerId && assignPlayer(Number(addPlayerId))}
                  disabled={!addPlayerId}
                  className="shrink-0 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
                {poolPlayers.map((player) => (
                  <li key={player.id} className="flex items-center justify-between px-4 py-2 text-sm text-slate-100">
                    {player.name}
                    <button
                      onClick={() => unassignPlayer(player.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </li>
                ))}
                {poolPlayers.length === 0 && (
                  <li className="px-4 py-3 text-sm text-slate-500">No players assigned yet.</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
