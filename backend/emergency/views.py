from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import viewsets, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from .models import EmergencyContact, MAX_EMERGENCY_CONTACTS_PER_USER
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
        with transaction.atomic():
            user = get_user_model().objects.select_for_update().get(
                pk=self.request.user.pk
            )
            contact_count = EmergencyContact.objects.filter(user=user).count()
            if contact_count >= MAX_EMERGENCY_CONTACTS_PER_USER:
                raise ValidationError({
                    'detail': 'You can save up to 3 emergency contacts.'
                })

            serializer.save(user=user)
