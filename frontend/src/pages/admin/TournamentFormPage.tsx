import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { Tournament } from '../../types/models'

type FormState = {
  name: string
  description: string
  status: Tournament['status']
  start_date: string
  end_date: string
  num_teams: string
  players_per_team_min: string
  players_per_team_max: string
  default_team_budget: string
  bid_timer_seconds: string
  bid_timer_extend_seconds: string
  bid_cooldown_seconds: string
  result_display_seconds: string
  public_guest_link_enabled: boolean
  themed_display_enabled: boolean
}

const emptyForm: FormState = {
  name: '',
  description: '',
  status: 'draft',
  start_date: '',
  end_date: '',
  num_teams: '0',
  players_per_team_min: '1',
  players_per_team_max: '20',
  default_team_budget: '0',
  bid_timer_seconds: '15',
  bid_timer_extend_seconds: '15',
  bid_cooldown_seconds: '3',
  result_display_seconds: '6',
  public_guest_link_enabled: true,
  themed_display_enabled: false,
}

export default function TournamentFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null)
  const [themePrimaryLogo, setThemePrimaryLogo] = useState<File | null>(null)
  const [themeClubLogo, setThemeClubLogo] = useState<File | null>(null)
  const [themeSponsorLogo, setThemeSponsorLogo] = useState<File | null>(null)
  const [existingTournament, setExistingTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    api.get<Tournament>(`tournaments/${id}/`).then((res) => {
      const t = res.data
      setExistingTournament(t)
      setForm({
        name: t.name,
        description: t.description,
        status: t.status,
        start_date: t.start_date ?? '',
        end_date: t.end_date ?? '',
        num_teams: String(t.num_teams),
        players_per_team_min: String(t.players_per_team_min),
        players_per_team_max: String(t.players_per_team_max),
        default_team_budget: t.default_team_budget,
        bid_timer_seconds: String(t.bid_timer_seconds),
        bid_timer_extend_seconds: String(t.bid_timer_extend_seconds),
        bid_cooldown_seconds: String(t.bid_cooldown_seconds),
        result_display_seconds: String(t.result_display_seconds),
        public_guest_link_enabled: t.public_guest_link_enabled,
        themed_display_enabled: t.themed_display_enabled,
      })
      setLoading(false)
    })
  }, [id, isEdit])

  function field<K extends keyof FormState>(key: K) {
    return {
      value: form[key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const body = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if ((key === 'start_date' || key === 'end_date') && !value) return
      body.append(key, String(value))
    })
    if (coverPhoto) body.append('cover_photo', coverPhoto)
    if (themePrimaryLogo) body.append('theme_primary_logo', themePrimaryLogo)
    if (themeClubLogo) body.append('theme_club_logo', themeClubLogo)
    if (themeSponsorLogo) body.append('theme_sponsor_logo', themeSponsorLogo)

    try {
      const res = isEdit
        ? await api.patch<Tournament>(`tournaments/${id}/`, body)
        : await api.post<Tournament>('tournaments/', body)
      navigate(`/admin/tournaments/${res.data.id}`)
    } catch {
      setError('Could not save tournament — check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 text-slate-400">Loading…</div>

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-slate-100">
        {isEdit ? 'Edit Tournament' : 'New Tournament'}
      </h1>

      {error && <p className="mb-4 text-red-400">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-400">Name</label>
          <input required className="input" {...field('name')} />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Description</label>
          <textarea rows={3} className="input" {...field('description')} />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Cover photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverPhoto(e.target.files?.[0] ?? null)}
            className="text-sm text-slate-300"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">Status</label>
          <select className="input" {...field('status')}>
            <option value="draft">Draft</option>
            <option value="setup">Setup</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400">Start date</label>
            <input type="date" className="input" {...field('start_date')} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">End date</label>
            <input type="date" className="input" {...field('end_date')} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Number of teams</label>
            <input type="number" min={0} className="input" {...field('num_teams')} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Default team budget</label>
            <input type="number" min={0} step="0.01" className="input" {...field('default_team_budget')} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Min players per team</label>
            <input type="number" min={0} className="input" {...field('players_per_team_min')} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Max players per team</label>
            <input type="number" min={0} className="input" {...field('players_per_team_max')} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Bid timer (seconds)</label>
            <input type="number" min={1} className="input" {...field('bid_timer_seconds')} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Timer extend-by (seconds)</label>
            <input type="number" min={1} className="input" {...field('bid_timer_extend_seconds')} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Bid cooldown (seconds)</label>
            <input type="number" min={0} className="input" {...field('bid_cooldown_seconds')} />
            <p className="mt-1 text-xs text-slate-500">
              Freeze after each bid before another can land, so nobody misreads the price. 0 disables it.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">Result display (seconds)</label>
            <input type="number" min={0} className="input" {...field('result_display_seconds')} />
            <p className="mt-1 text-xs text-slate-500">
              How long the big screen shows "sold/unsold to ..." before switching to the waiting
              screen. Ends early if the next player starts first.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={form.public_guest_link_enabled}
            onChange={(e) => setForm((f) => ({ ...f, public_guest_link_enabled: e.target.checked }))}
          />
          Enable public guest link
        </label>

        <div className="rounded border border-slate-800 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <input
              type="checkbox"
              checked={form.themed_display_enabled}
              onChange={(e) => setForm((f) => ({ ...f, themed_display_enabled: e.target.checked }))}
            />
            Use branded big-screen display (room display)
          </label>
          <p className="mt-1 text-xs text-slate-500">
            When on, the room-display / big-screen view shows this tournament's logos instead of the
            generic look. Toggle it off any time to go back to the generic view.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Tournament logo</label>
              {existingTournament?.theme_primary_logo && !themePrimaryLogo && (
                <img src={existingTournament.theme_primary_logo} alt="" className="mb-2 h-16 w-16 rounded-full object-cover" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThemePrimaryLogo(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Club logo</label>
              {existingTournament?.theme_club_logo && !themeClubLogo && (
                <img src={existingTournament.theme_club_logo} alt="" className="mb-2 h-16 w-16 rounded-full object-cover" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThemeClubLogo(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Sponsor logo</label>
              {existingTournament?.theme_sponsor_logo && !themeSponsorLogo && (
                <img src={existingTournament.theme_sponsor_logo} alt="" className="mb-2 h-16 w-16 rounded-full object-cover" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setThemeSponsorLogo(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-300"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save Tournament'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
