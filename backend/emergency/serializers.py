from rest_framework import serializers
from emergency.models import EmergencyContact

class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ['id', 'name', 'phone_number', 'relationship', 'created_at']
        read_only_fields = ['id', 'created_at']
