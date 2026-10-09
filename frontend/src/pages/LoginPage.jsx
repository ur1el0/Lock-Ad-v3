import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { APIError } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { User, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import { GuestAuthLayout } from '../components/GuestAuthLayout'

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
                setErrorMessage('We couldn’t complete your request. Check your connection and try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

  return (
    <GuestAuthLayout>
      <header className="mb-7">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
          <span className="h-2 w-2 rounded-full bg-slate-500" aria-hidden="true" />
          Returning member
        </div>
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-primary">
          <User className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="m-0 text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">Welcome back</h1>
        <p className="mb-0 mt-2 text-sm leading-6 text-muted-foreground">Log in to continue to your routes and reports.</p>
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
              placeholder="Enter your username"
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
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-slate-400 transition focus:border-emerald-700 focus:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-700/10 disabled:opacity-60"
              placeholder="Enter your password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="group mt-1 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
              Logging in…
            </>
          ) : (
            <>
              Log in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="mb-0 mt-7 text-center text-sm text-muted-foreground">
        New to Lock-Ad?{' '}
        <Link to="/register" className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          Create an account
        </Link>
      </p>
    </GuestAuthLayout>
  )
}
