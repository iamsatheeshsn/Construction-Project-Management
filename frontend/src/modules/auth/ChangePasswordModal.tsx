import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import * as authApi from '../../services/auth/authApi'
import { FormField, getErrorMessage, getFieldErrors, useSuccess, type FieldErrors } from '../../ui'

type Props = {
  open: boolean
  onClose: () => void
}

const MIN_LENGTH = 8

function emptyForm() {
  return {
    current_password: '',
    password: '',
    password_confirmation: '',
  }
}

export function ChangePasswordModal({ open, onClose }: Props) {
  const success = useSuccess()
  const [form, setForm] = useState(emptyForm())
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(form),
    onSuccess: () => {
      setForm(emptyForm())
      setFieldErrors({})
      setError(null)
      onClose()
      success({ title: 'Password updated', message: 'Your password has been changed successfully.' })
    },
    onError: (err: unknown) => {
      setFieldErrors(getFieldErrors(err))
      setError(getErrorMessage(err, 'Unable to change password'))
    },
  })

  if (!open) return null

  function handleClose() {
    if (mutation.isPending) return
    setForm(emptyForm())
    setFieldErrors({})
    setError(null)
    onClose()
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const errors: FieldErrors = {}
    if (!form.current_password) {
      errors.current_password = 'Enter your current password.'
    }
    if (form.password.length < MIN_LENGTH) {
      errors.password = `Password must be at least ${MIN_LENGTH} characters.`
    }
    if (form.password_confirmation !== form.password) {
      errors.password_confirmation = 'Passwords do not match.'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    mutation.mutate()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="modal-card password-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="password-modal-heading">
            <span className="password-modal-icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h2 id="change-password-title">Change password</h2>
              <p className="muted small">Enter your current password and choose a new one.</p>
            </div>
          </div>
          <button type="button" className="ghost" onClick={handleClose} aria-label="Close" disabled={mutation.isPending}>
            ✕
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <form className="password-modal-form" onSubmit={onSubmit}>
          <div className="modal-form-scroll form-grid">
          <FormField label="Current password" required error={fieldErrors.current_password}>
            <input
              type="password"
              autoComplete="current-password"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              disabled={mutation.isPending}
            />
          </FormField>
          <FormField label="New password" required error={fieldErrors.password}>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={mutation.isPending}
            />
          </FormField>
          {!fieldErrors.password && <p className="password-modal-hint">Minimum {MIN_LENGTH} characters.</p>}
          <FormField label="Confirm new password" required error={fieldErrors.password_confirmation}>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
              disabled={mutation.isPending}
            />
          </FormField>
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={handleClose} disabled={mutation.isPending}>
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
