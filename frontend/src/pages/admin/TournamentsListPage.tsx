import { Link } from 'react-router-dom'
import { useApiList } from '../../api/hooks'
import type { Tournament } from '../../types/models'

const statusColors: Record<Tournament['status'], string> = {
  draft: 'bg-slate-700 text-slate-200',
  setup: 'bg-amber-700 text-amber-100',
  live: 'bg-emerald-700 text-emerald-100',
  completed: 'bg-sky-700 text-sky-100',
}

export default function TournamentsListPage() {
  const { data: tournaments, loading, error } = useApiList<Tournament>('tournaments/')

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tournaments</h1>
        <Link
          to="/admin/tournaments/new"
          className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
        >
          + New Tournament
        </Link>
      </div>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && tournaments.length === 0 && (
        <p className="text-slate-400">No tournaments yet. Create the first one.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => (
          <Link
            key={t.id}
            to={`/admin/tournaments/${t.id}`}
            className="block rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-slate-600"
          >
            {t.cover_photo && (
              <img src={t.cover_photo} alt="" className="mb-3 h-32 w-full rounded object-cover" />
            )}
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-medium text-slate-100">{t.name}</h2>
              <span className={`rounded px-2 py-0.5 text-xs ${statusColors[t.status]}`}>{t.status}</span>
            </div>
            <p className="text-sm text-slate-400">
              {t.num_teams} teams · budget {t.default_team_budget}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
