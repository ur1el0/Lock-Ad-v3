# 2. Role-Based Access Control & Queryset Isolation

**Date:** 2026-08-28
**Status:** Accepted

## Context
Lock-Ad-v3 handles highly sensitive personal data, including live incident reports, emergency contacts, and saved home routes. Django REST Framework's `ModelViewSet` automatically provides full CRUD (Create, Read, Update, Delete) capabilities. Using a blanket `permission_classes = [IsAuthenticated]` is dangerous because it grants any logged-in user the ability to hit modification endpoints. 

Furthermore, querying `Model.objects.all()` exposes all database records to the client, risking severe data leaks if endpoints are not rigorously protected.

## Decision
We enforce a **Zero-Trust Defense in Depth** policy for all API endpoints:

1. **Granular Permissions:** Blanket permissions are banned on ViewSets containing administrative endpoints. We must override `get_permissions(self)` to strictly map `list/retrieve/create` to standard users, and `update/destroy` to administrative roles.
2. **Queryset Isolation:** We ban unrestricted `.objects.all()` queries. All viewsets must override `get_queryset(self)` to explicitly filter user-owned data (`user=self.request.user`). An explicit bypass is only allowed for administrative roles (e.g., `if user.is_staff:`).

## Consequences
### Positive
* **IDOR Prevention:** Queryset isolation makes Insecure Direct Object Reference vulnerabilities nearly impossible.
* **Auditability:** Security reviewers can quickly verify endpoint safety by looking at just two overwritten methods on any ViewSet.

### Negative
* **Developer Friction:** Developers must remember to write this boilerplate logic for every new ViewSet instead of relying on DRF defaults.