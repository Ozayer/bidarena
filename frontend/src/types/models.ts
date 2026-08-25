export type TournamentStatus = 'draft' | 'setup' | 'live' | 'completed'

export interface Tournament {
  id: number
  name: string
  slug: string
  description: string
  cover_photo: string | null
  status: TournamentStatus
  start_date: string | null
  end_date: string | null
  num_teams: number
  players_per_team_min: number
  players_per_team_max: number
  default_team_budget: string
  bid_timer_seconds: number
  bid_timer_extend_seconds: number
  public_guest_link_enabled: boolean
}

export interface Position {
  id: number
  tournament: number
  name: string
  order: number
}

export interface Team {
  id: number
  tournament: number
  name: string
  logo: string | null
  owner_name: string
  owner_photo: string | null
  owner_user: number | null
  budget_total: string
  budget_spent: string
  budget_remaining: string
  squad_size: number
}

export type PlayerStatus = 'available' | 'pooled' | 'in_auction' | 'sold' | 'unsold'

export interface Player {
  id: number
  tournament: number
  name: string
  photo: string | null
  position: number | null
  base_price: string
  extra_info: Record<string, unknown>
  status: PlayerStatus
  pool: number | null
  team: number | null
  sold_price: string | null
}

export interface Pool {
  id: number
  tournament: number
  name: string
  position: number | null
  pool_type: 'normal' | 'unsold_round'
  round_number: number
  order: number
  status: 'pending' | 'active' | 'completed'
}

export interface AuctionSession {
  id: number
  tournament: number
  status: 'not_started' | 'live' | 'paused' | 'completed'
  active_pool: number | null
  current_player: number | null
  current_highest_bid: string | null
  current_highest_team: number | null
  timer_ends_at: string | null
}
