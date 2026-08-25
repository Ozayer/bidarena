import axios from 'axios'
import { useState } from 'react'
import { api } from '../../../api/client'
import { useApiList } from '../../../api/hooks'
import type { Team, Tournament } from '../../../types/models'

type FormState = {
  id: number | null
  name: string
  owner_name: string
  budget_total: string
}

function emptyForm(defaultBudget: string): FormState {
  return { id: null, name: '', owner_name: '', budget_total: defaultBudget }
}

export default function TeamsTab({ tournament }: { tournament: Tournament }) {
  const { data: teams, loading, refetch } = useApiList<Team>(`teams/?tournament=${tournament.id}`)
  const [form, setForm] = useState<FormState>(emptyForm(tournament.default_team_budget))
  const [logo, setLogo] = useState<File | null>(null)
  const [ownerPhoto, setOwnerPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [ownerFormTeamId, setOwnerFormTeamId] = useState<number | null>(null)
  const [ownerUsername, setOwnerUsername] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [ownerSubmitting, setOwnerSubmitting] = useState(false)

  function openOwnerForm(team: Team) {
    setOwnerFormTeamId(team.id)
    setOwnerUsername(team.owner_username ?? '')
    setOwnerPassword('')
    setOwnerError(null)
  }

  async function submitOwnerAccount(teamId: number) {
    if (!ownerUsername.trim() || !ownerPassword) return
    setOwnerSubmitting(true)
    setOwnerError(null)
    try {
      await api.post(`teams/${teamId}/set-owner-account/`, {
        username: ownerUsername.trim(),
        password: ownerPassword,
      })
      setOwnerFormTeamId(null)
      refetch()
    } catch (err) {
      const detail = axios.isAxiosError(err) ? (err.response?.data as { detail?: string })?.detail : null
      setOwnerError(detail || 'Could not set owner login.')
    } finally {
      setOwnerSubmitting(false)
    }
  }

  function startEdit(team: Team) {
    setForm({ id: team.id, name: team.name, owner_name: team.owner_name, budget_total: team.budget_total })
    setLogo(null)
    setOwnerPhoto(null)
  }

  function resetForm() {
    setForm(emptyForm(tournament.default_team_budget))
    setLogo(null)
    setOwnerPhoto(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body = new FormData()
      body.append('tournament', String(tournament.id))
      body.append('name', form.name)
      body.append('owner_name', form.owner_name)
      body.append('budget_total', form.budget_total)
      if (logo) body.append('logo', logo)
      if (ownerPhoto) body.append('owner_photo', ownerPhoto)

      if (form.id) {
        await api.patch(`teams/${form.id}/`, body)
      } else {
        await api.post('teams/', body)
      }
      resetForm()
      refetch()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`teams/${id}/`)
    refetch()
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="mb-6 max-w-xl space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4"
      >
        <h3 className="text-sm font-medium text-slate-200">{form.id ? 'Edit team' : 'Add a team'}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Team name</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Owner / manager name</label>
            <input
              className="input"
              value={form.owner_name}
              onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Budget</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={form.budget_total}
              onChange={(e) => setForm((f) => ({ ...f, budget_total: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-300"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Owner photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setOwnerPhoto(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-300"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {form.id ? 'Save changes' : 'Add team'}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <div key={team.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center gap-3">
              {team.logo && <img src={team.logo} alt="" className="h-10 w-10 rounded object-cover" />}
              <div>
                <p className="font-medium text-slate-100">{team.name}</p>
                <p className="text-xs text-slate-500">{team.owner_name || 'No owner set'}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400">
              Budget: {team.budget_total} · Remaining: {team.budget_remaining} · Squad: {team.squad_size}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Owner login: {team.owner_username ? <span className="text-slate-300">{team.owner_username}</span> : 'not set'}
            </p>
            <div className="mt-3 flex gap-3 text-sm">
              <button onClick={() => startEdit(team)} className="text-emerald-400 hover:text-emerald-300">
                Edit
              </button>
              <button onClick={() => openOwnerForm(team)} className="text-emerald-400 hover:text-emerald-300">
                {team.owner_username ? 'Reset login' : 'Set owner login'}
              </button>
              <button onClick={() => handleDelete(team.id)} className="text-red-400 hover:text-red-300">
                Remove
              </button>
            </div>

            {ownerFormTeamId === team.id && (
              <div className="mt-3 space-y-2 rounded border border-slate-700 bg-slate-800 p-3">
                <input
                  className="input"
                  placeholder="Username"
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                />
                <input
                  type="password"
                  className="input"
                  placeholder="Password"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                />
                {ownerError && <p className="text-xs text-red-400">{ownerError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => submitOwnerAccount(team.id)}
                    disabled={ownerSubmitting || !ownerUsername.trim() || !ownerPassword}
                    className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Save login
                  </button>
                  <button
                    onClick={() => setOwnerFormTeamId(null)}
                    className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!loading && teams.length === 0 && <p className="text-slate-500">No teams added yet.</p>}
      </div>
    </div>
  )
}
