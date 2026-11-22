from django.contrib import admin

from safety_data.models import IncidentImageDeletion


@admin.register(IncidentImageDeletion)
class IncidentImageDeletionAdmin(admin.ModelAdmin):
    list_display = ('image_name', 'attempts', 'last_error', 'created_at')
    list_filter = ('created_at',)
    ordering = ('created_at',)
    readonly_fields = ('image_name', 'attempts', 'last_error', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_view_permission(self, request, obj=None):
        return super().has_view_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return False
