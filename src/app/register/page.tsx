'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type FieldErrors = Record<string, string[]>

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')

  // Check availability automatically as the user types (debounced)...
  useEffect(() => {
    if (username.trim().length < 3) {
      setUsernameStatus('idle')
      return
    }

    const timeout = setTimeout(() => checkUsername(username), 500)
    return () => clearTimeout(timeout)
  }, [username])

  async function checkUsername(value: string) {
    if (value.trim().length < 3) return
    setUsernameStatus('checking')

    try {
      const res = await fetch(`/api/auth/username-available?username=${encodeURIComponent(value)}`)
      const data = await res.json()
      setUsernameStatus(data.available ? 'available' : data.reason ? 'invalid' : 'taken')
    } catch {
      setUsernameStatus('idle')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setFormError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const payload = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      username: formData.get('username'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      password: formData.get('password'),
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setFieldErrors(data.error?.fieldErrors ?? {})
        setFormError(data.error?.formErrors?.[0] ?? 'Please check the form and try again.')
        setLoading(false)
        return
      }

      const verifyUrl = data.warning
        ? `/verify?email=${encodeURIComponent(data.email)}&warning=${encodeURIComponent(data.warning)}`
        : `/verify?email=${encodeURIComponent(data.email)}`

      router.push(verifyUrl)
    } catch {
      setFormError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="font-display text-3xl font-medium text-ink">Create your account</h1>
      <p className="mt-2 text-muted">
        We&apos;ll send a verification code to your email before you can sign in.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="firstName" label="First name" errors={fieldErrors.firstName} required />
          <Field name="lastName" label="Last name" errors={fieldErrors.lastName} required />
        </div>

        <div>
          <label htmlFor="username" className="field-label">
            Username
          </label>
          <div className="flex gap-2">
            <input
              id="username"
              name="username"
              type="text"
              required
              className="field-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <button
              type="button"
              onClick={() => checkUsername(username)}
              className="btn-secondary whitespace-nowrap px-4 py-2 text-sm"
            >
              Check availability
            </button>
          </div>
          <UsernameHint status={usernameStatus} />
          <FieldErrorText errors={fieldErrors.username} />
        </div>

        <Field name="email" label="Email address" type="email" errors={fieldErrors.email} required autoComplete="email" />
        <Field name="phone" label="Phone number" type="tel" errors={fieldErrors.phone} required autoComplete="tel" />
        <Field name="address" label="Address" errors={fieldErrors.address} required autoComplete="street-address" />
        <Field
          name="password"
          label="Password"
          type="password"
          errors={fieldErrors.password}
          required
          autoComplete="new-password"
          hint="At least 8 characters."
        />

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-accent-dark underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  )
}

function Field({
  name,
  label,
  type = 'text',
  errors,
  required,
  autoComplete,
  hint,
}: {
  name: string
  label: string
  type?: string
  errors?: string[]
  required?: boolean
  autoComplete?: string
  hint?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="field-input"
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <FieldErrorText errors={errors} />
    </div>
  )
}

function FieldErrorText({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>
}

function UsernameHint({ status }: { status: UsernameStatus }) {
  if (status === 'idle') return null

  const copy: Record<UsernameStatus, { text: string; className: string }> = {
    idle: { text: '', className: '' },
    checking: { text: 'Checking…', className: 'text-muted' },
    available: { text: 'Username is available', className: 'text-accent-dark' },
    taken: { text: 'That username is taken', className: 'text-red-600' },
    invalid: { text: 'Letters, numbers, and underscores only', className: 'text-red-600' },
  }

  const { text, className } = copy[status]
  return <p className={`mt-1 text-xs ${className}`}>{text}</p>
}
