from django.urls import path
from navigation.views import route_preview_view

urlpatterns = [
    path('routes/preview/', route_preview_view, name='route-preview'),
]
