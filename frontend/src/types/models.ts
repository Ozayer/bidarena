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

export interface BulkUploadResult {
  created: number
  total_rows: number
  errors: { row: number; errors: string[] }[]
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

export type AuctionSessionStatus = 'not_started' | 'live' | 'paused' | 'completed'

export interface AuctionSession {
  id: number
  tournament: number
  status: AuctionSessionStatus
  active_pool: number | null
  current_player: number | null
  current_highest_bid: string | null
  current_highest_team: number | null
  timer_ends_at: string | null
}

export interface Bid {
  id: number
  tournament: number
  player: number
  team: number
  team_name: string
  amount: string
  placed_by: number | null
  placed_at: string
}

export interface AuctionState {
  id: number
  tournament: number
  status: AuctionSessionStatus
  active_pool: number | null
  active_pool_detail: Pool | null
  current_player: number | null
  current_player_detail: Player | null
  current_highest_bid: string | null
  current_highest_team: number | null
  current_highest_team_detail: Team | null
  timer_ends_at: string | null
  timer_paused_remaining_seconds: number | null
  started_at: string | null
  updated_at: string
  recent_bids: Bid[]
}
