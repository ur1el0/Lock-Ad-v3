import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { APIError } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { User, Lock, Mail, KeyRound, AlertCircle, UserPlus } from 'lucide-react'
import { GuestAuthLayout } from '../components/GuestAuthLayout'

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
            await register(formData)
            navigate('/login', { 
                replace: true, 
                state: { successMessage: 'Registration successful! Please log in.' } 
            })
        } catch(error) {
            if (error instanceof APIError ) {
                setErrorMessage(error.message)
            } else {
                setErrorMessage('We couldn’t complete your request. Check your connection and try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <GuestAuthLayout>
            <header className="mb-7">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />
                    New account
                </div>
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-primary">
                    <UserPlus className="h-5 w-5" aria-hidden="true" />
                </div>
                <h1 className="m-0 text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">
                    Create your account
                </h1>
                <p className="mb-0 mt-2 text-sm leading-6 text-muted-foreground">
                    Save routes and share community safety reports.
                </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
                {errorMessage && (
                    <div
                        className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-destructive motion-safe:animate-in motion-safe:slide-in-from-top-2"
                        role="alert"
                        aria-live="polite"
                    >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <p className="m-0 text-sm font-medium leading-5">{errorMessage}</p>
                    </div>
                )}

                <div>
                    <label htmlFor="username" className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
                    <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-slate-400 transition focus:border-emerald-700 focus:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/10 disabled:opacity-60"
                            placeholder="Choose a username"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                    <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-slate-400 transition focus:border-emerald-700 focus:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/10 disabled:opacity-60"
                            placeholder="name@example.com"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                    <div className="relative">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-slate-400 transition focus:border-emerald-700 focus:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/10 disabled:opacity-60"
                            placeholder="Choose a password"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password_confirm" className="mb-2 block text-sm font-semibold text-slate-700">Confirm password</label>
                    <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                            id="password_confirm"
                            name="password_confirm"
                            type="password"
                            autoComplete="new-password"
                            value={formData.password_confirm}
                            onChange={handleChange}
                            required
                            disabled={isSubmitting}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-slate-400 transition focus:border-emerald-700 focus:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/10 disabled:opacity-60"
                            placeholder="Enter your password again"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60"
                >
                    {isSubmitting ? (
                        <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                            Creating account…
                        </>
                    ) : 'Create account'}
                </button>
            </form>

            <p className="mb-0 mt-7 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                    Log in
                </Link>
            </p>
        </GuestAuthLayout>
    )
}
