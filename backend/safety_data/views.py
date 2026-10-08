import requests

from django.db.models import Q
from django.http import FileResponse, Http404
from PIL import Image, UnidentifiedImageError
from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from safety_data.ai_service import get_travel_advisory, analyze_incident_image
from safety_data.models import IncidentReport, SafetySignal
from safety_data.serializers import (
    IncidentReportSerializer,
    SafetySignalSerializer,
    TravelAdvisoryRequestSerializer,
    WeatherRequestSerializer,
)


class IncidentImageUploadThrottle(UserRateThrottle):
    scope = 'incident_image_upload'

    def allow_request(self, request, view):
        if request.method != 'POST' or not request.data.get('image'):
            return True
        return super().allow_request(request, view)


class GeminiAdvisoryAnonThrottle(AnonRateThrottle):
    scope = 'gemini_advisory_anon'


class GeminiAdvisoryUserThrottle(UserRateThrottle):
    scope = 'gemini_advisory_user'


class IncidentImageView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk):
        try:
            report = IncidentReport.objects.get(pk=pk)
        except IncidentReport.DoesNotExist:
            raise Http404('Image not found.')

        if not report.image:
            raise Http404('Image not found.')

        stored_image = None
        try:
            stored_image = report.image.open('rb')
            with Image.open(stored_image) as image:
                content_type = Image.MIME.get(image.format)
            if content_type not in {'image/jpeg', 'image/png', 'image/webp'}:
                raise ValueError('Unsupported stored image format.')
            stored_image.seek(0)
        except (
            Image.DecompressionBombError,
            OSError,
            SyntaxError,
            UnidentifiedImageError,
            ValueError,
        ):
            if stored_image is not None:
                stored_image.close()
            raise Http404('Image not found.')

        response = FileResponse(stored_image, content_type=content_type)
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response


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

    def get_throttles(self):
        throttles = super().get_throttles()
        if self.action == 'create':
            throttles.append(IncidentImageUploadThrottle())
        return throttles
    
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
            queryset = IncidentReport.objects.filter(
                Q(user=user) | Q(status='APPROVED')
            ).order_by('-reported_at')

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
        report = serializer.save(
            user=self.request.user,
            status='PENDING'
        )
        if report.image:
            analysis = analyze_incident_image(
                report.image,
                report.incident_type,
                report.description or ''
            )
            report.ai_analysis = analysis
            report.save(update_fields=['ai_analysis'])

@api_view(['GET'])
@permission_classes([AllowAny])
def get_weather(request):
    serializer = WeatherRequestSerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    latitude = serializer.validated_data['lat']
    longitude = serializer.validated_data['lng']

    # Call the Open-Meteo API
    url = 'https://api.open-meteo.com/v1/forecast'

    try: 
        response = requests.get(
            url,
            params={
                'latitude': latitude,
                'longitude': longitude,
                'current_weather': 'true',
            },
            timeout=5,
        )
        response.raise_for_status()
        data = response.json()
        return Response(data.get('current_weather', {}))
    except requests.RequestException:
        return Response({'error': 'Failed to fetch weather data' }, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([GeminiAdvisoryAnonThrottle, GeminiAdvisoryUserThrottle])
def generate_advisory(request):
    serializer = TravelAdvisoryRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    advisory = get_travel_advisory(
        data['distance'],
        data['duration'],
        data['weather_code'],
        data['temperature'],
    )

    return Response({'advisory': advisory})
