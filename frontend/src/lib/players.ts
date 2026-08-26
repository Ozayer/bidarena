import type { Player } from '../types/models'

export interface PlayerPoolGroup {
  key: string
  label: string
  players: Player[]
}

/** Groups players by their pool, ordered by the pool's own display order, with any
 * players not yet assigned to a pool collected into a trailing "Unassigned" group. */
export function groupPlayersByPool<T extends { id: number; order: number; name: string }>(
  players: Player[],
  pools: T[]
): PlayerPoolGroup[] {
  const byPool = new Map<number | null, Player[]>()
  players.forEach((player) => {
    const key = player.pool
    if (!byPool.has(key)) byPool.set(key, [])
    byPool.get(key)!.push(player)
  })

  const groups: PlayerPoolGroup[] = []
  ;[...pools]
    .sort((a, b) => a.order - b.order)
    .forEach((pool) => {
      const list = byPool.get(pool.id)
      if (list && list.length > 0) groups.push({ key: String(pool.id), label: pool.name, players: list })
    })
  const unassigned = byPool.get(null)
  if (unassigned && unassigned.length > 0) groups.push({ key: 'unassigned', label: 'Unassigned', players: unassigned })
  return groups
}
