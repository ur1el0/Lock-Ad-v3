import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import { RouteProvider } from './context/RouteContext.jsx' // ADD THIS

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RouteProvider>
            <App />
        </RouteProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
