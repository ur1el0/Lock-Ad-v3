import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { APIError } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { User, Lock, AlertCircle, ArrowRight } from 'lucide-react'

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
        setFormData((current) => ({
            ...current,
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
    <main className="min-h-screen w-full flex items-center justify-center bg-background p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md bg-card/95 backdrop-blur-md border border-border p-8 rounded-3xl shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-indigo-500"></div>

        <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground m-0">Welcome Back</h1>
            <p className="text-sm font-medium text-muted-foreground mt-2">Log in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
            
            {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-sm font-bold text-destructive m-0" role="alert">{errorMessage}</p>
                </div>
            )}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Username</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        className="w-full bg-muted/50 border border-input text-foreground text-sm font-medium rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none placeholder:text-muted-foreground/40"
                        placeholder="Enter your username"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Password</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full bg-muted/50 border border-input text-foreground text-sm font-medium rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none placeholder:text-muted-foreground/40"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={isSubmitting}
                className="group w-full mt-2 flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl py-3.5 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
            >
                {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                ) : (
                    <>
                        Log In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>
        </form>

        <div className="text-center mt-2">
            <p className="text-sm font-medium text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary font-bold hover:underline underline-offset-4">
                    Sign up
                </Link>
            </p>
        </div>

      </div>
    </main>
  )
}
