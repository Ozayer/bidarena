import type { Tournament } from '../../../types/models'

export default function DetailsTab({ tournament: t }: { tournament: Tournament }) {
  const rows: [string, string | number][] = [
    ['Status', t.status],
    ['Dates', t.start_date || t.end_date ? `${t.start_date ?? '?'} → ${t.end_date ?? '?'}` : 'Not set'],
    ['Number of teams', t.num_teams],
    ['Players per team', `${t.players_per_team_min} - ${t.players_per_team_max}`],
    ['Default team budget', t.default_team_budget],
    ['Bid timer', `${t.bid_timer_seconds}s (extend by ${t.bid_timer_extend_seconds}s)`],
    ['Public guest link', t.public_guest_link_enabled ? 'Enabled' : 'Disabled'],
  ]

  return (
    <div className="max-w-xl space-y-4">
      {t.cover_photo && <img src={t.cover_photo} alt="" className="rounded-lg" />}
      {t.description && <p className="text-slate-300">{t.description}</p>}
      <dl className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-2 text-sm">
            <dt className="text-slate-400">{label}</dt>
            <dd className="text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
