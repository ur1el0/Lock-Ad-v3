import { Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { RequireAuth } from './components/RequireAuth'
import { GuestOnlyRoute } from './components/GuestOnlyRoute'
import { HomePage } from './pages/HomePage'
import { RoutePlannerPage } from './pages/RoutePlanner' // Make sure this matches your file name!
import { EmergencyContactsPage } from './pages/EmergencyContactsPage'
import { ModeratorDashboard } from './pages/ModeratorDashboard'
import { BottomNav } from './components/BottomNav'

// 1. Create a reusable layout for all authenticated screens
function AuthLayout({ children }) {
  return (
    <RequireAuth>
      <div className="relative h-screen w-screen overflow-hidden bg-background">
        {/* Render the specific page */}
        <div className="h-full w-full overflow-y-auto">
            {children}
        </div>
        {/* Inject the persistent navigation */}
        <BottomNav />
      </div>
    </RequireAuth>
  )
}

function App() {
  return (
    <Routes>
      {/* --- Authenticated App Flow --- */}
      <Route path="/" element={<AuthLayout><HomePage /></AuthLayout>} />
      
      <Route path="/route" element={<AuthLayout><RoutePlannerPage /></AuthLayout>} />
      
      <Route path="/contacts" element={<AuthLayout><EmergencyContactsPage /></AuthLayout>} />
      
      <Route path="/moderator" element={<AuthLayout><ModeratorDashboard /></AuthLayout>} />

      {/* --- Public / Guest Flow --- */}
      <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
      
      <Route path="/register" element={<GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>} />
    </Routes>
  )
}

export default App
