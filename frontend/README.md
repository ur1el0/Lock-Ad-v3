# Lock-Ad v3 Frontend

This directory contains the React/Vite frontend for Lock-Ad v3.

## Tech stack

- React
- Vite
- React Router
- ESLint

## Setup

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

```txt
http://localhost:5173
```

Run the backend separately at:

```txt
http://127.0.0.1:8000
```

## Available scripts

Start development server:

```bash
npm run dev
```

Lint:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## API proxy

Vite proxies frontend API requests from:

```txt
/api
```

to:

```txt
http://127.0.0.1:8000
```

This means frontend code should call relative API paths:

```txt
/api/auth/login/
/api/auth/register/
/api/auth/me/
```

Do not hard-code backend URLs in normal frontend API calls.

## Current frontend structure

```txt
src/
├── api/        API client and auth API helpers
├── components/ route guard components
├── context/    AuthContext and AuthProvider
├── hooks/      useAuth hook
├── pages/      Login and registration pages
├── App.jsx     route definitions
└── main.jsx    app entry point
```

## Authentication flow

The frontend uses the backend's Django session authentication.

Important pieces:

```txt
AuthProvider     stores current user state
useAuth          gives pages access to auth state/actions
RequireAuth      protects authenticated pages
GuestOnlyRoute   blocks logged-in users from login/register
```

POST requests first request a CSRF token from:

```txt
GET /api/auth/csrf/
```

Then they send:

```txt
X-CSRFToken: <token>
```

with cookies enabled through `credentials: 'include'`.

## Current routes

```txt
/          protected home page
/login     guest-only login page
/register  guest-only registration page
```

## Notes

- Use `http://localhost:5173` for browser testing.
- Keep secrets and provider API keys out of frontend code.
- Validation error display is intentionally minimal for now and can be improved later.
