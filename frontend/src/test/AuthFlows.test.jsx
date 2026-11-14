import { randomUUID } from 'node:crypto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { GuestOnlyRoute } from '../components/GuestOnlyRoute'
import { RequireAuth } from '../components/RequireAuth'
import { AuthProvider } from '../context/AuthProvider'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: name => name.toLowerCase() === 'content-type'
        ? 'application/json'
        : null,
    },
    json: async () => data,
  }
}

function mockAuthApi({ loginStatus = 200 } = {}) {
  const calls = []
  let loginPayload
  let registrationPayload

  const fetchMock = vi.fn(async (path, options = {}) => {
    calls.push({ path, options })

    if (path === '/api/auth/me/') {
      return jsonResponse(
        { detail: 'Authentication credentials were not provided.' },
        403,
      )
    }

    if (path === '/api/auth/csrf/') {
      return jsonResponse({ csrfToken: 'csrf-token-for-test' })
    }

    if (path === '/api/auth/login/') {
      loginPayload = JSON.parse(options.body)
      if (loginStatus === 401) {
        return jsonResponse({ detail: 'Invalid credentials.' }, 401)
      }
      return jsonResponse({
        id: 12,
        username: loginPayload.username,
        is_staff: false,
      })
    }

    if (path === '/api/auth/register/') {
      registrationPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 23,
        username: registrationPayload.username,
      }, 201)
    }

    throw new Error(`Unexpected API request: ${path}`)
  })

  vi.stubGlobal('fetch', fetchMock)
  return {
    calls,
    get loginPayload() {
      return loginPayload
    },
    get registrationPayload() {
      return registrationPayload
    },
  }
}

function AuthTestRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <main><h1>Signed-in home</h1></main>
          </RequireAuth>
        }
      />
      <Route
        path="/login"
        element={
          <GuestOnlyRoute>
            <LoginPage />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnlyRoute>
            <RegisterPage />
          </GuestOnlyRoute>
        }
      />
    </Routes>
  )
}

function renderAuthFlow(initialPath) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthTestRoutes />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('authentication pages and route guards', () => {
  it('redirects an unauthenticated visitor to the login page', async () => {
    mockAuthApi()

    renderAuthFlow('/')

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeInTheDocument()
  })

  it('submits CSRF-protected login and opens the signed-in route', async () => {
    const api = mockAuthApi()
    const user = userEvent.setup()
    const username = 'route-reporter'
    const password = randomUUID()

    renderAuthFlow('/login')

    await user.type(await screen.findByLabelText('Username'), username)
    await user.type(screen.getByLabelText('Password'), password)
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(
      await screen.findByRole('heading', { name: 'Signed-in home' }),
    ).toBeInTheDocument()
    expect(api.loginPayload).toEqual({ username, password })

    const loginRequest = api.calls.find(
      request => request.path === '/api/auth/login/',
    )
    expect(loginRequest.options.credentials).toBe('include')
    expect(loginRequest.options.headers['X-CSRFToken']).toBe('csrf-token-for-test')
  })

  it('shows a clear message when the server rejects login', async () => {
    mockAuthApi({ loginStatus: 401 })
    const user = userEvent.setup()

    renderAuthFlow('/login')

    await user.type(await screen.findByLabelText('Username'), 'route-reporter')
    await user.type(screen.getByLabelText('Password'), randomUUID())
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t sign you in. Check your username and password, then try again.',
    )
  })

  it('registers an account and returns the visitor to login', async () => {
    const api = mockAuthApi()
    const user = userEvent.setup()
    const password = randomUUID()

    renderAuthFlow('/register')

    await user.type(await screen.findByLabelText('Username'), 'new-reporter')
    await user.type(screen.getByLabelText('Email'), 'reporter@example.com')
    await user.type(screen.getByLabelText('Password'), password)
    await user.type(screen.getByLabelText('Confirm password'), password)
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeInTheDocument()
    expect(api.registrationPayload).toEqual({
      username: 'new-reporter',
      email: 'reporter@example.com',
      password,
      password_confirm: password,
    })
  })
})
