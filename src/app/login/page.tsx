'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const payload = {
      identifier: formData.get('identifier'),
      password: formData.get('password'),
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.email) {
          router.push(`/verify?email=${encodeURIComponent(data.error.email)}`)
          return
        }
        setError(data.error?.formError ?? 'Incorrect username/email or password')
        setLoading(false)
        return
      }

      router.push(next)
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-medium text-ink">Welcome back</h1>
      <p className="mt-2 text-muted">Log in to continue your screening or view your results.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label htmlFor="identifier" className="field-label">
            Username or email
          </label>
          <input id="identifier" name="identifier" type="text" required autoComplete="username" className="field-input" />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-medium text-accent-dark underline">
              Forgot password?
            </Link>
          </div>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="field-input" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? 'Logging in…' : 'Log in'}
        </button>

        <p className="text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-accent-dark underline">
            Create one
          </Link>
        </p>
      </form>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
