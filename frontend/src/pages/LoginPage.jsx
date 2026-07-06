import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIError } from '../api/client'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    })
    const [errorMessage, setErrorMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    
    const { login } = useAuth()
    const navigate = useNavigate()

    function handleChange(event) {
        const { name, value } = event.target

        setFormData((currentFormData) => ({
            ...currentFormData,
            [name]: value,
        }))
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setErrorMessage('')
        setIsSubmitting(true)

        try {
            await login(formData)
            navigate('/', { replace: true })
        } catch(error) {
            if (error instanceof APIError) {
                setErrorMessage(error.message)
            } else {
                setErrorMessage('Unable to connect to the server.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

      return (
    <main>
      <h1>Log in</h1>

      <form onSubmit={handleSubmit}>
        {errorMessage && (
          <p role="alert">{errorMessage}</p>
        )}

        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          value={formData.username}
          onChange={handleChange}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </main>
  )
}