import { useState } from 'react'
import { api } from '../../../api/client'
import { useApiList } from '../../../api/hooks'
import type { BidIncrementRule } from '../../../types/models'

export default function BidRulesTab({ tournamentId }: { tournamentId: number }) {
  const { data: rules, loading, refetch } = useApiList<BidIncrementRule>(
    `increment-rules/?tournament=${tournamentId}`,
  )
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [incrementAmount, setIncrementAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const sorted = [...rules].sort((a, b) => Number(a.from_amount) - Number(b.from_amount))

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!fromAmount || !incrementAmount) return
    setSubmitting(true)
    try {
      await api.post('increment-rules/', {
        tournament: tournamentId,
        from_amount: fromAmount,
        to_amount: toAmount || null,
        increment_amount: incrementAmount,
      })
      setFromAmount('')
      setToAmount('')
      setIncrementAmount('')
      refetch()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`increment-rules/${id}/`)
    refetch()
  }

  return (
    <div className="max-w-xl">
      <p className="mb-4 text-sm text-slate-400">
        Tiered auto-increment rules for bids: while the current bid is in a tier's price range, the next
        bid increases by that tier's step. Leave "to" blank for "and above." If no tier matches, a flat
        default increment is used.
      </p>

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">From</label>
          <input
            className="input w-28"
            type="number"
            min="0"
            step="0.01"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">To (optional)</label>
          <input
            className="input w-28"
            type="number"
            min="0"
            step="0.01"
            placeholder="∞"
            value={toAmount}
            onChange={(e) => setToAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Increment</label>
          <input
            className="input w-28"
            type="number"
            min="0"
            step="0.01"
            value={incrementAmount}
            onChange={(e) => setIncrementAmount(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Add tier
        </button>
      </form>

      {loading && <p className="text-slate-400">Loading…</p>}

      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {sorted.map((rule) => (
          <li key={rule.id} className="flex items-center justify-between px-4 py-2 text-sm text-slate-100">
            <span>
              {rule.from_amount} – {rule.to_amount ?? '∞'} → +{rule.increment_amount}
            </span>
            <button onClick={() => handleDelete(rule.id)} className="text-red-400 hover:text-red-300">
              Remove
            </button>
          </li>
        ))}
        {!loading && sorted.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500">
            No tiers configured — every bid will use the flat default increment.
          </li>
        )}
      </ul>
    </div>
  )
}
