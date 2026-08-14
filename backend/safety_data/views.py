from rest_framework import viewsets, permissions
from safety_data.models import IncidentReport, SafetySignal
from safety_data.serializers import IncidentReportSerializer, SafetySignalSerializer

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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admins see everything. Normal users only see APPROVED reports.
        if self.request.user.is_staff:
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
        serializer.save(user=self.request.user)
