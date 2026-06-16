'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const RESEND_COOLDOWN_S = 60

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendStatus, setResendStatus] = useState<string | null>(
    searchParams.get('warning')
  )

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.formError ?? 'Invalid or expired code')
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  async function handleResend() {
    setResendStatus(null)
    setResendCooldown(RESEND_COOLDOWN_S)

    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResendStatus(data.error?.formError ?? 'Could not resend the code. Try again shortly.')
        return
      }

      setResendStatus('A new code has been sent.')
    } catch {
      setResendStatus('Could not resend the code. Try again shortly.')
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-medium text-ink">Check your email</h1>
      <p className="mt-2 text-muted">
        We sent a 6-digit code to{' '}
        <span className="font-medium text-ink">{email || 'your email address'}</span>. Enter it
        below to verify your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label htmlFor="code" className="field-label">
            Verification code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="field-input text-center text-2xl tracking-[0.5em]"
            placeholder="000000"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading || code.length !== 6} className="btn-primary disabled:opacity-60">
          {loading ? 'Verifying…' : 'Verify account'}
        </button>

        <div className="text-sm text-muted">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="font-medium text-accent-dark underline disabled:no-underline disabled:text-muted"
          >
            {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
          </button>
          {resendStatus && <p className="mt-1">{resendStatus}</p>}
        </div>
      </form>
    </main>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}
