# Lock-Ad v3 Frontend Guide

This document covers the React/Vite frontend.

## Stack

- React
- Vite
- React Router
- ESLint

## Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

```txt
http://localhost:5173
```

Run the backend separately at:

```txt
http://127.0.0.1:8004
```

Use the frontend URL for browser testing.

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

`npm test` runs the Vitest and React Testing Library suite in JSDOM. The tests
exercise authentication, route-planner, and moderator-queue flows with isolated
API responses; they do not require a running backend. Moderator tests cover the
report queue, approval/rejection, empty and load-error states, and update errors.

## API proxy

Vite proxies:

```txt
/api
```

to:

```txt
http://127.0.0.1:8004
```

The development server also proxies `/ws` to the backend WebSocket endpoint.

Frontend code should call relative API paths:

```txt
/api/auth/login/
/api/auth/register/
/api/auth/me/
```

Do not hard-code backend URLs in normal frontend API calls.

## Current structure

```txt
src/
├── api/        API client and auth API helpers
├── components/ route guard components
├── context/    AuthContext and AuthProvider
├── hooks/      useAuth hook
├── pages/      Login and registration pages
├── test/       Authentication, route-planner, and moderator tests, plus setup
├── App.jsx     route definitions
└── main.jsx    app entry point
```

## Auth pieces

```txt
AuthProvider     stores current user state
useAuth          gives pages access to auth state/actions
RequireAuth      protects authenticated pages
GuestOnlyRoute   blocks logged-in users from login/register
```

## Current routes

```txt
/          protected home page
/login     guest-only login page
/register  guest-only registration page
```

## Later frontend work

- Extend automated coverage to map interactions.
- Design trip tracking only after location permissions, sharing, and retention
  behavior are defined; the planned mobile client may live in a separate repo.
