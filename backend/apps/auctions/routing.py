from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/auction/(?P<tournament_id>\d+)/$', consumers.AuctionRoomConsumer.as_asgi()),
]
