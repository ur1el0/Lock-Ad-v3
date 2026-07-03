import { useEffect, useState } from 'react'
import {
    getCurrentUser,
    loginUser,
    logoutUser,
    registerUser,
} from '../api/auth'

import { APIError } from '../api/client'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [ isLoading, setIsLoading ] = useState(true)

    useEffect(() => {
        async function loadCurrentUser() {
            try {
                const currentUser = await getCurrentUser() 
                setUser(currentUser)
            } catch (error) {
                const isUnauthenticated =
                    error instanceof APIError &&
                    (error.status === 401 || error.status === 403)

                if (!isUnauthenticated) {
                    console.error('Could not check the current session.', error)
                }
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }
        loadCurrentUser()
    }, [])

    async function login(credentials) {
        const authenticatedUser = await loginUser(credentials)
        setUser(authenticatedUser)
        return authenticatedUser    
    }

    async function register(userData) {
        return registerUser(userData)
    }
    
    async function logout() {
        await logoutUser()
        setUser(null)
    }

    const value = {
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
    }
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}