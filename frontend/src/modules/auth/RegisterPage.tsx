import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from './AuthContext'
import { FormField, getFieldErrors, requireFields, type FieldErrors } from '../../ui'
import { APP_NAME, BrandMark } from '../../brand'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    company_name: '',
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const nextErrors = requireFields(form, {
      company_name: 'Company name is required.',
      name: 'Your name is required.',
      email: 'Work email is required.',
      password: 'Password is required.',
      password_confirmation: 'Confirm your password.',
    })
    if (form.password && form.password_confirmation && form.password !== form.password_confirmation) {
      nextErrors.password_confirmation = 'Passwords do not match.'
    }
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors)
      setError('Please complete the required fields.')
      return
    }

    setSubmitting(true)
    try {
      await register(form)
      navigate('/admin/dashboard')
    } catch (err) {
      setFieldErrors(getFieldErrors(err))
      if (axios.isAxiosError(err)) {
        const errors = err.response?.data?.errors
        const first = errors ? Object.values(errors).flat()[0] : null
        setError((first as string) ?? err.response?.data?.message ?? 'Registration failed')
      } else {
        setError('Registration failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-brand">
          <BrandMark size={42} />
          <div>
            <p className="eyebrow">{APP_NAME}</p>
            <h1>Create workspace</h1>
          </div>
        </div>
        <p className="muted">Create a {APP_NAME} workspace with an owner account and primary company.</p>

        {error && <div className="error">{error}</div>}

        <FormField label="Company name" required error={fieldErrors.company_name}>
          <input value={form.company_name} onChange={(e) => update('company_name', e.target.value)} />
        </FormField>
        <FormField label="Your name" required error={fieldErrors.name}>
          <input value={form.name} onChange={(e) => update('name', e.target.value)} />
        </FormField>
        <FormField label="Work email" required error={fieldErrors.email}>
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </FormField>
        <FormField label="Password" required error={fieldErrors.password}>
          <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} />
        </FormField>
        <FormField label="Confirm password" required error={fieldErrors.password_confirmation}>
          <input
            type="password"
            value={form.password_confirmation}
            onChange={(e) => update('password_confirmation', e.target.value)}
          />
        </FormField>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create workspace'}
        </button>

        <p className="footer-link">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
