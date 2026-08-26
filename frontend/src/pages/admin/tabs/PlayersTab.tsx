import { useRef, useState } from 'react'
import { api } from '../../../api/client'
import { useApiList } from '../../../api/hooks'
import type { BulkUploadResult, Player, Position } from '../../../types/models'

type ExtraInfoRow = { key: string; value: string }

type FormState = {
  id: number | null
  name: string
  position: string
  base_price: string
  extraInfo: ExtraInfoRow[]
}

const emptyForm: FormState = {
  id: null,
  name: '',
  position: '',
  base_price: '0',
  extraInfo: [
    { key: 'nationality', value: '' },
    { key: 'club', value: '' },
  ],
}

const statusLabels: Record<Player['status'], string> = {
  available: 'Available',
  pooled: 'In Pool',
  in_auction: 'Up for Bidding',
  sold: 'Sold',
  unsold: 'Unsold',
}

export default function PlayersTab({ tournamentId }: { tournamentId: number }) {
  const { data: players, loading, refetch } = useApiList<Player>(`players/?tournament=${tournamentId}`)
  const { data: positions } = useApiList<Position>(`positions/?tournament=${tournamentId}`)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  function startEdit(player: Player) {
    const extraInfo = Object.entries(player.extra_info ?? {}).map(([key, value]) => ({
      key,
      value: String(value),
    }))
    setForm({
      id: player.id,
      name: player.name,
      position: player.position ? String(player.position) : '',
      base_price: player.base_price,
      extraInfo: extraInfo.length > 0 ? extraInfo : emptyForm.extraInfo,
    })
    setPhoto(null)
  }

  function updateExtraInfoRow(index: number, field: 'key' | 'value', value: string) {
    setForm((f) => ({
      ...f,
      extraInfo: f.extraInfo.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }))
  }

  function addExtraInfoRow() {
    setForm((f) => ({ ...f, extraInfo: [...f.extraInfo, { key: '', value: '' }] }))
  }

  function removeExtraInfoRow(index: number) {
    setForm((f) => ({ ...f, extraInfo: f.extraInfo.filter((_, i) => i !== index) }))
  }

  function resetForm() {
    setForm(emptyForm)
    setPhoto(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const extraInfo = Object.fromEntries(
        form.extraInfo.filter((row) => row.key.trim() && row.value.trim()).map((row) => [row.key.trim(), row.value.trim()])
      )

      const body = new FormData()
      body.append('tournament', String(tournamentId))
      body.append('name', form.name)
      body.append('base_price', form.base_price)
      body.append('extra_info', JSON.stringify(extraInfo))
      if (form.position) body.append('position', form.position)
      if (photo) body.append('photo', photo)

      if (form.id) {
        await api.patch(`players/${form.id}/`, body)
      } else {
        await api.post('players/', body)
      }
      resetForm()
      refetch()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`players/${id}/`)
    refetch()
  }

  function positionName(id: number | null) {
    return positions.find((p) => p.id === id)?.name ?? '—'
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setUploadResult(null)
    try {
      const body = new FormData()
      body.append('tournament', String(tournamentId))
      body.append('file', file)
      const res = await api.post<BulkUploadResult>('players/bulk_upload/', body)
      setUploadResult(res.data)
      refetch()
    } catch {
      setUploadError('Upload failed — make sure the file is a valid .xlsx spreadsheet.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="mb-6 max-w-xl space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4"
      >
        <h3 className="text-sm font-medium text-slate-200">{form.id ? 'Edit player' : 'Add a player'}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Player name</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Position</label>
            <select
              className="input"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            >
              <option value="">— none —</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Base price</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={form.base_price}
              onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Additional details (optional)</label>
          <div className="space-y-2">
            {form.extraInfo.map((row, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input"
                  placeholder="e.g. nationality"
                  value={row.key}
                  onChange={(e) => updateExtraInfoRow(i, 'key', e.target.value)}
                />
                <input
                  className="input"
                  placeholder="e.g. Finland"
                  value={row.value}
                  onChange={(e) => updateExtraInfoRow(i, 'value', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeExtraInfoRow(i)}
                  className="shrink-0 text-red-400 hover:text-red-300"
                  title="Remove field"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addExtraInfoRow}
            className="mt-2 text-xs text-emerald-400 hover:text-emerald-300"
          >
            + Add another field
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {form.id ? 'Save changes' : 'Add player'}
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

      <div className="mb-6 max-w-xl space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-medium text-slate-200">Bulk upload players (Excel)</h3>
        <p className="text-xs text-slate-500">
          Columns: <span className="text-slate-400">Name</span> and{' '}
          <span className="text-slate-400">Base Price</span> are required; <span className="text-slate-400">Position</span>{' '}
          must match an existing position name. Any other columns are stored as extra player info. Rows with
          errors are skipped and reported — valid rows are still added.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="/api/players/bulk_upload_template/"
            download
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Download template
          </a>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleBulkUpload}
            disabled={uploading}
            className="text-sm text-slate-300"
          />
        </div>

        {uploading && <p className="text-sm text-slate-400">Uploading…</p>}
        {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
        {uploadResult && (
          <div className="rounded border border-slate-800 bg-slate-950 p-3 text-sm">
            <p className="text-emerald-400">
              Added {uploadResult.created} of {uploadResult.total_rows} row{uploadResult.total_rows === 1 ? '' : 's'}.
            </p>
            {uploadResult.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-red-400">
                {uploadResult.errors.map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.errors.join(' ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {loading && <p className="text-slate-400">Loading…</p>}

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-2">Player</th>
              <th className="px-4 py-2">Position</th>
              <th className="px-4 py-2">Base price</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {players.map((player) => (
              <tr key={player.id} className="text-slate-100">
                <td className="flex items-center gap-2 px-4 py-2">
                  {player.photo && (
                    <img src={player.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                  )}
                  {player.name}
                </td>
                <td className="px-4 py-2 text-slate-300">{positionName(player.position)}</td>
                <td className="px-4 py-2 text-slate-300">{player.base_price}</td>
                <td className="px-4 py-2 text-slate-300">{statusLabels[player.status]}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => startEdit(player)}
                    className="mr-3 text-emerald-400 hover:text-emerald-300"
                  >
                    Edit
                  </button>
                  <button onClick={() => handleDelete(player.id)} className="text-red-400 hover:text-red-300">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && players.length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-500">No players added yet.</p>
        )}
      </div>
    </div>
  )
}
