import json

from channels.generic.websocket import AsyncWebsocketConsumer


class AuctionRoomConsumer(AsyncWebsocketConsumer):
    """
    One group per tournament's live auction room. Every connected client
    (team owner devices, the room/projector display, and read-only guest
    viewers) joins the same group and receives the same broadcast events:
    bid placed, timer tick/pause/extend, player sold/unsold, next player.

    This is a scaffold: connect/disconnect/group wiring only. Bid
    validation, purse-safety checks, and state transitions will be added
    as the auction engine is built out.
    """

    async def connect(self):
        self.tournament_id = self.scope['url_route']['kwargs']['tournament_id']
        self.group_name = f'auction_{self.tournament_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')

        # TODO: route to real handlers (place_bid, etc.) once the auction
        # engine is implemented. For now, just echo back to the room.
        await self.channel_layer.group_send(
            self.group_name,
            {'type': 'auction.message', 'payload': {'type': event_type, 'data': data}},
        )

    async def auction_message(self, event):
        await self.send(text_data=json.dumps(event['payload']))
