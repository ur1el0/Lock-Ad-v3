import { Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { RequireAuth } from './components/RequireAuth'
import { GuestOnlyRoute } from './components/GuestOnlyRoute'
import { HomePage } from './pages/HomePage'

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