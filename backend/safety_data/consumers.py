import json
from channels.generic.websocket import AsyncWebsocketConsumer

class IncidentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get('user')
        if user is None or not user.is_authenticated:
            await self.close(code=4401)
            return

        # Join the 'incidents' group
        self.group_name = 'incidents'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave the group
        group_name = getattr(self, 'group_name', None)
        if group_name:
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name
            )

    # Receive message from the group
    async def incident_update(self, event):
        message = event['message']

        # Send message back to the WebSocket client
        await self.send(text_data=json.dumps({
            'type': 'incident_update',
            'data': message
        }))
