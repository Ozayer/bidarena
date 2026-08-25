from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .serializers import AuctionStateSerializer


def broadcast_state(session):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    payload = AuctionStateSerializer(session).data
    async_to_sync(channel_layer.group_send)(
        f'auction_{session.tournament_id}',
        {'type': 'auction.update', 'payload': payload},
    )
