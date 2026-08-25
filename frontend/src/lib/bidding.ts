import type { AuctionState, Player, Tournament } from '../types/models'

/** Mirrors the backend's tiered bid-increment logic (apps.auctions.engine._next_increment) so
 * the frontend can show/validate the minimum legal next bid before hitting the server — the
 * server remains the source of truth and re-validates on submit. */
const DEFAULT_INCREMENT = 10

export function nextIncrement(tournament: Tournament, currentAmount: number): number {
  const rules = tournament.increment_rules ?? []
  const matching = rules.filter(
    (r) => Number(r.from_amount) <= currentAmount && (r.to_amount === null || Number(r.to_amount) > currentAmount)
  )
  if (matching.length === 0) return DEFAULT_INCREMENT
  const best = matching.reduce((a, b) => (Number(b.from_amount) > Number(a.from_amount) ? b : a))
  return Number(best.increment_amount)
}

/** The lowest amount the server will currently accept for the next bid on this player. */
export function minimumNextBid(tournament: Tournament, state: AuctionState, player: Player): number {
  if (state.current_highest_bid == null) return Number(player.base_price)
  const current = Number(state.current_highest_bid)
  return current + nextIncrement(tournament, current)
}

