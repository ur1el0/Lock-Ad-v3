import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { APIError } from '../api/client'
import { useAuth } from '../hooks/useAuth'

export function RegisterPage() {
    const [ formData, setFormData ] = useState({
        username: '',
        email: '',
        password: '',
        password_confirm: ''
    })

    const [ errorMessage, setErrorMessage ] = useState('')
    const [ isSubmitting, setIsSubmitting ] = useState(false)

    const { register } = useAuth()
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
            await register(formData)
            navigate('/login', { 
                replace: true, 
                state: { successMessage: 'Registration successful! Please log in.' } 
            })
        } catch(error) {
            if (error instanceof APIError ) {
                setErrorMessage(error.message)
            } else {
                setErrorMessage('Unable to connect to the server.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return(
        <main>
            <h1>Register</h1>

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

                <label htmlFor="email">Email</label>
                <input 
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    required 
                />

                <label htmlFor="password">Password</label>
                <input 
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <label htmlFor="password-confirm">Password Confirm</label>
                <input 
                    id="password_confirm"
                    name="password_confirm"
                    type="password"
                    value={formData.password_confirm}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                />

                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Registering...' : "Register"}
                </button>
            </form>
        </main>
    )
}