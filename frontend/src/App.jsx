import { Route, Routes } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'

function HomePage() {
  return (
    <main>
      <h1>Lock-Ad</h1>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  )
}

export default App