from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAuthenticated
from .models import EmergencyContact
from .serializers import EmergencyContactSerializer

class EmergencyContactViewSet(viewsets.ModelViewSet):
    serializer_class = EmergencyContactSerializer

    def get_permissions(self):
        """
        Require IsAdminUser for destructive actions.
        Standard users can only list, retrieve, or create.
        """
        permission_classes = (
            [permissions.IsAdminUser]
            if self.action in ['update', 'partial_update', 'destroy']
            else [IsAuthenticated]
        )
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Queryset Isolation:
        Moderators see all contacts. Users can only see their own.
        """
        user = self.request.user
        if user.is_staff:
            return EmergencyContact.objects.all().order_by('-created_at')
        return EmergencyContact.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
