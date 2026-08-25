import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { Tournament } from '../../types/models'
import BidRulesTab from './tabs/BidRulesTab'
import DetailsTab from './tabs/DetailsTab'
import PlayersTab from './tabs/PlayersTab'
import PoolsTab from './tabs/PoolsTab'
import PositionsTab from './tabs/PositionsTab'
import TeamsTab from './tabs/TeamsTab'

const TABS = ['Details', 'Positions', 'Teams', 'Players', 'Pools', 'Bid Rules'] as const
type Tab = (typeof TABS)[number]

export default function TournamentWorkspace() {
  const { id } = useParams()
  const tournamentId = Number(id)

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [tab, setTab] = useState<Tab>('Details')

  useEffect(() => {
    api.get<Tournament>(`tournaments/${tournamentId}/`).then((res) => setTournament(res.data))
  }, [tournamentId])

  async function downloadExport(format: 'csv' | 'pdf') {
    if (!tournament) return
    const res = await api.get(`tournaments/${tournament.id}/export-${format}/`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${tournament.slug}-results.${format}`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!tournament) return <div className="p-6 text-slate-400">Loading…</div>

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link to="/admin" className="text-sm text-slate-500 hover:text-slate-300">
            ← Tournaments
          </Link>
          <h1 className="text-2xl font-semibold text-slate-100">{tournament.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/admin/tournaments/${tournament.id}/auction`}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Run Auction
          </Link>
          <button
            onClick={() => downloadExport('csv')}
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Export CSV
          </button>
          <button
            onClick={() => downloadExport('pdf')}
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Export PDF
          </button>
          <Link
            to={`/admin/tournaments/${tournament.id}/edit`}
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Edit tournament
          </Link>
        </div>
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t
                ? 'border-b-2 border-emerald-500 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Details' && <DetailsTab tournament={tournament} />}
      {tab === 'Positions' && <PositionsTab tournamentId={tournament.id} />}
      {tab === 'Teams' && <TeamsTab tournament={tournament} />}
      {tab === 'Players' && <PlayersTab tournamentId={tournament.id} />}
      {tab === 'Pools' && <PoolsTab tournamentId={tournament.id} />}
      {tab === 'Bid Rules' && <BidRulesTab tournamentId={tournament.id} />}
    </div>
  )
}
