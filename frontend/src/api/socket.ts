/**
 * Live auction room WebSocket connection. One socket per tournament,
 * shared by team owner devices, the room/projector display, and guest
 * viewers — they all receive the same broadcast events.
 */
export function connectAuctionSocket(tournamentId: number | string) {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${protocol}://${window.location.host}/ws/auction/${tournamentId}/`
  return new WebSocket(url)
}
