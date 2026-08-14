import { Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { RequireAuth } from './components/RequireAuth'
import { GuestOnlyRoute } from './components/GuestOnlyRoute'
import { HomePage } from './pages/HomePage'
import { EmergencyContactsPage } from './pages/EmergencyContactsPage'
import { ModeratorDashboard } from './pages/ModeratorDashboard'

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
        path="/contacts" 
        element={
          <RequireAuth>
            <EmergencyContactsPage />
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
      <Route
        path="/moderator"
        element={
          <RequireAuth>
            <ModeratorDashboard/>
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default App