# Lock-Ad v3

Lock-Ad v3 is a full-stack safety-aware navigation project. The current main branch contains a Django REST backend and a React/Vite frontend with session-based authentication.

The long-term goal is to support cautious route planning by combining route data with public safety-related signals such as geographic boundaries, nearby public infrastructure, and other available datasets. The app should present routes as cautious or risk-aware, not as guaranteed safe.

## Repository structure

```txt
Lock-Ad-v3/
├── backend/   Django REST API
└── frontend/  React + Vite client
```

## Current features

- Django REST backend
- Session authentication using Django sessions and CSRF protection
- User registration, login, logout, and current-user endpoints
- React auth provider and reusable auth hook
- Login and registration pages
- Protected and guest-only frontend routes
- Vite proxy from `/api` to the local Django server

## Local development

Run the backend and frontend in separate terminals.

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 manage.py migrate
python3 manage.py runserver
```

Backend URL:

```txt
http://127.0.0.1:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```txt
http://localhost:5173
```

Use the frontend URL for browser testing. The frontend sends API requests through the Vite proxy.

## Useful commands

Backend:

```bash
cd backend
python3 manage.py test
python3 manage.py check
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## API overview

Current backend endpoints:

```txt
GET  /api/health/
GET  /api/auth/csrf/
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/me/
```

## Branch workflow

Use feature branches for each major unit of work.

Recommended branch examples:

```txt
feature/frontend-auth
feature/navigation-api
feature/frontend-map
feature/safety-data-models
```

Keep commits separated by purpose:

```txt
feat(...)
fix(...)
test(...)
style(...)
chore(...)
```

## Security notes

- Do not commit `.env`.
- Do not expose API keys in the frontend.
- Keep routing provider keys on the backend only.
- Treat safety-related output as advisory, not guaranteed.

## Next planned work

- Improve frontend validation error messages.
- Add the navigation backend app.
- Add a route preview API.
- Integrate a routing provider through the backend.
- Add safety-data models and import workflows.
