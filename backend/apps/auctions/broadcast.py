from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings

from .serializers import AuctionStateSerializer


class _AbsoluteUriBuilder:
    """Stand-in for an HTTP request's build_absolute_uri, for contexts (like a Channels
    broadcast) that have no real request to build image/file URLs against."""

    def build_absolute_uri(self, url):
        # Cloudinary-backed fields already return a fully-qualified URL (e.g.
        # https://res.cloudinary.com/...) — only local/relative media paths need
        # SITE_BASE_URL prepended, otherwise this produces a corrupted URL.
        if url.startswith('http://') or url.startswith('https://'):
            return url
        return f'{settings.SITE_BASE_URL.rstrip("/")}{url}'


def broadcast_state(session):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    payload = AuctionStateSerializer(session, context={'request': _AbsoluteUriBuilder()}).data
    async_to_sync(channel_layer.group_send)(
        f'auction_{session.tournament_id}',
        {'type': 'auction.update', 'payload': payload},
    )
