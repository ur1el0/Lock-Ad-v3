from django.urls import re_path
from safety_data import consumers

websocket_urlpatterns = [
    re_path(r'ws/incidents/$', consumers.IncidentConsumer.as_asgi()),
]