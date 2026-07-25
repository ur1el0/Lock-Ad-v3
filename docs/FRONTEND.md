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
http://127.0.0.1:8000
```

Use the frontend URL for browser testing.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## API proxy

Vite proxies:

```txt
/api
```

to:

```txt
http://127.0.0.1:8000
```

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

- Improve DRF validation error display.
- Add map UI.
- Add route input form.
- Render route preview geometry.
- Add saved route UI.
- Add safety overlay UI.
