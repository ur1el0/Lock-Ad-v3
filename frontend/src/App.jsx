import { Route, Routes, useNavigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { RequireAuth } from './components/RequireAuth'
import { GuestOnlyRoute } from './components/GuestOnlyRoute'
import { useAuth } from './hooks/useAuth'

function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <main>
      <h1>Lock-Ad</h1>
      <p>Signed in as {user.username}</p>

      {user.email && <p>Email: {user.email}</p>}

      <button onClick={handleLogout}>
        Log out
      </button>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <RequireAuth>
            <HomePage />
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

export default App