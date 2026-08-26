import type { Player } from '../types/models'

/** One player in a browsable list — click to expand a details panel (photo, position,
 * base price, status, extra_info). The wishlist star only renders when a team owner is
 * viewing (onToggleWishlist provided); guests get the same row without it. */
export default function PlayerRow({
  player,
  positionName,
  isExpanded,
  onToggleExpand,
  isWishlisted,
  onToggleWishlist,
}: {
  player: Player
  positionName: (id: number | null) => string
  isExpanded: boolean
  onToggleExpand: () => void
  isWishlisted?: boolean
  onToggleWishlist?: () => void
}) {
  const extraInfo = Object.entries(player.extra_info ?? {})
  return (
    <li className="px-1 py-2 text-sm">
      <button type="button" onClick={onToggleExpand} className="flex w-full items-center justify-between text-left">
        <div>
          <span className="text-slate-100">{player.name}</span>
          <span className="ml-2 text-xs text-slate-500">
            {positionName(player.position)} · {player.base_price} · {player.status}
          </span>
        </div>
        {onToggleWishlist && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onToggleWishlist()
            }}
            title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={isWishlisted ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}
          >
            ★
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="mt-2 flex gap-3 rounded border border-slate-800 bg-slate-950 p-3">
          {player.photo && (
            <img src={player.photo} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
          )}
          <div className="space-y-1 text-xs">
            <p className="text-slate-300">
              Position: <span className="text-slate-100">{positionName(player.position)}</span>
            </p>
            <p className="text-slate-300">
              Base price: <span className="text-slate-100">{player.base_price}</span>
            </p>
            <p className="text-slate-300">
              Status: <span className="text-slate-100">{player.status}</span>
            </p>
            {extraInfo.map(([key, value]) => (
              <p key={key} className="text-slate-300 capitalize">
                {key}: <span className="text-slate-100">{String(value)}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </li>
  )
}
