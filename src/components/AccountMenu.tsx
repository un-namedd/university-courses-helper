import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { signInWithEmail, signInWithGoogle, signOut, useAuth } from '../lib/auth'
import { CloudPlans } from './CloudPlans'

export function AccountMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  if (!isSupabaseConfigured) return null

  const initial = (user?.email ?? '?').slice(0, 1).toUpperCase()

  async function sendLink() {
    setError(null)
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send link.')
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-sm font-semibold text-fg transition hover:border-accent/60"
        title={user ? user.email ?? 'Account' : 'Sign in'}
        aria-label="Account"
      >
        {user ? initial : '↪'}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[85vw] rounded-2xl border border-line bg-surface p-4 shadow-xl">
          {user ? (
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                  Signed in as
                </p>
                <p className="truncate text-sm font-medium text-fg">{user.email}</p>
              </div>
              <CloudPlans onDone={() => setOpen(false)} />
              <button
                onClick={() => signOut()}
                className="w-full rounded-lg border border-line py-2 text-sm font-medium text-fg transition hover:border-accent/60"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-fg">Sign in to save & share plans</p>
              {sent ? (
                <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
                  Check your email for a magic sign-in link.
                </p>
              ) : (
                <>
                  <div className="flex gap-1.5">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="you@uoguelph.ca"
                      className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-accent/60"
                    />
                    <button
                      onClick={sendLink}
                      disabled={!email.trim()}
                      className="shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-faint">
                    <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
                  </div>
                  <button
                    onClick={() => signInWithGoogle()}
                    className="w-full rounded-lg border border-line py-2 text-sm font-medium text-fg transition hover:border-accent/60"
                  >
                    Continue with Google
                  </button>
                  <p className="text-[11px] leading-relaxed text-faint">
                    Sign-in uses your <strong className="font-medium text-muted">email</strong> only
                    to identify your account. We store degree plans you save (program, terms,
                    courses) in Supabase. Shared links are public only if you turn sharing on.
                    Google does not get access to your plans.{' '}
                    <Link to="/privacy" className="text-accent underline">
                      Privacy Policy
                    </Link>
                  </p>
                </>
              )}
              {error && <p className="text-xs text-rose-500">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
