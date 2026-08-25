import json

from channels.generic.websocket import AsyncWebsocketConsumer


class AuctionRoomConsumer(AsyncWebsocketConsumer):
    """
    One group per tournament's live auction room. Every connected client
    (admin console, team owner devices, the room/projector display, and
    read-only guest viewers) joins the same group and receives the same
    broadcast state whenever the auction engine changes anything (bid
    placed, timer paused/resumed/extended, player started/sold/unsold).

    All state mutation happens over REST (see AuctionSessionViewSet) so the
    engine can enforce increments, purse-safety, and concurrency-safe
    locking in one place. This consumer is purely a read-only broadcast
    channel — it does not accept or act on incoming messages.
    """

    async def connect(self):
        self.tournament_id = self.scope['url_route']['kwargs']['tournament_id']
        self.group_name = f'auction_{self.tournament_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def auction_update(self, event):
        await self.send(text_data=json.dumps(event['payload']))
