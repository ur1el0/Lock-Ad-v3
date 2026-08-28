from rest_framework import viewsets, permissions
from safety_data.models import IncidentReport, SafetySignal
from safety_data.serializers import IncidentReportSerializer, SafetySignalSerializer
import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from safety_data.ai_service import get_travel_advisory

class SafetySignalViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SafetySignalSerializer
    
    def get_queryset(self):
        queryset = SafetySignal.objects.all()
        min_lat = self.request.query_params.get('min_lat')
        max_lat = self.request.query_params.get('max_lat')
        min_lng = self.request.query_params.get('min_lng')
        max_lng = self.request.query_params.get('max_lng')

        if min_lat and max_lat and min_lng and max_lng:
            queryset = queryset.filter(
                latitude__gte=min_lat,
                latitude__lte=max_lat,
                longitude__gte=min_lng,
                longitude__lte=max_lng
            )
        return queryset

class IncidentReportViewSet(viewsets.ModelViewSet):
    serializer_class = IncidentReportSerializer
    
    def get_permissions(self):
        """
        Require IsAdminUser for destructive actions.
        Standard users can only list, retrieve, or create.
        """
        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAdminUser]
        else: 
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            queryset = IncidentReport.objects.all().order_by('-reported_at')
        else:
            queryset = IncidentReport.objects.filter(status='APPROVED').order_by('-reported_at')

        min_lat = self.request.query_params.get('min_lat')
        max_lat = self.request.query_params.get('max_lat')
        min_lng = self.request.query_params.get('min_lng')
        max_lng = self.request.query_params.get('max_lng')

        if min_lat and max_lat and min_lng and max_lng:
            queryset = queryset.filter(
                latitude__gte=min_lat,  
                latitude__lte=max_lat,
                longitude__gte=min_lng,
                longitude__lte=max_lng
            )
        return queryset

    def perform_create(self, serializer):
        # Explicitly override client payload to force safe default states
        serializer.save(
            user=self.request.user,
            status='PENDING'
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def get_weather(request):
    lat = request.query_params.get('lat')
    lng = request.query_params.get('lng')

    if not lat or not lng:
        return Response({'error': 'Please provide lat and lng'}, status=400)

    # Call the Open-Meteo API
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&current_weather=true"

    try: 
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        return Response(data.get('current_weather', {}))
    except requests.RequestException:
        return Response({'error': 'Failed to fetch weather data' }, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def generate_advisory(request):
    data = request.data
    distance = data.get('distance', 0)
    duration = data.get('duration', 0)
    weather_code = data.get('weather_code', 0)
    temperature = data.get('temperature', 0)

    advisory = get_travel_advisory(distance, duration, weather_code, temperature)

    return Response({'advisory': advisory})