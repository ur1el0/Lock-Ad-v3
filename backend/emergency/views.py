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
        if self.action in ['update', 'partial_update', 'destroy']:
            self.permission_classes = [permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        Queryset Isolation:
        Moderators see all contacts. Users can only see their own.
        """
        user = self.request.user
        if user.is_staff:
            return EmergencyContact.objects.all()
        return EmergencyContact.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
