import { Link } from 'react-router-dom'
import { useApiList } from '../../api/hooks'
import type { Tournament } from '../../types/models'

/** Landing page for a public link — lists tournaments open for guest viewing and links
 * into either the full viewer room or the big-screen room display for each. */
export default function PublicTournamentPicker({ basePath, title }: { basePath: string; title: string }) {
  const { data: tournaments, loading } = useApiList<Tournament>('tournaments/?public_guest_link_enabled=true')

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-semibold text-slate-100">{title}</h1>
      <p className="mb-6 text-sm text-slate-400">Pick a tournament to watch.</p>

      {loading && <p className="text-slate-400">Loading…</p>}

      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {tournaments.map((t) => (
          <li key={t.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-slate-100">{t.name}</p>
              <p className="text-xs uppercase text-slate-500">{t.status.replace('_', ' ')}</p>
            </div>
            <Link to={`${basePath}/${t.slug}`} className="text-sm text-emerald-400 hover:text-emerald-300">
              Watch →
            </Link>
          </li>
        ))}
        {!loading && tournaments.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">No public tournaments right now.</li>
        )}
      </ul>
    </div>
  )
}
