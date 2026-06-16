'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-display text-3xl font-medium text-ink">Check your email</h1>
        <p className="mt-2 text-muted">
          If an account exists for <span className="font-medium text-ink">{email}</span>,
          we&apos;ve sent a 6-digit code to reset your password.
        </p>
        <Link href={`/reset-password?email=${encodeURIComponent(email)}`} className="btn-primary mt-8 inline-flex">
          Enter reset code
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-medium text-ink">Reset your password</h1>
      <p className="mt-2 text-muted">
        Enter the email address on your account and we&apos;ll send you a code to reset your
        password.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label htmlFor="email" className="field-label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? 'Sending…' : 'Send reset code'}
        </button>

        <p className="text-sm text-muted">
          <Link href="/login" className="font-medium text-accent-dark underline">
            Back to login
          </Link>
        </p>
      </form>
    </main>
  )
}
