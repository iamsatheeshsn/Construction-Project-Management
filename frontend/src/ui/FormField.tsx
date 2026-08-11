import type { ReactNode } from 'react'

type FormFieldProps = {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
  className?: string
}

/** Stable field chrome: asterisk for required, reserved inline error slot (no layout jump). */
export function FormField({ label, required, error, children, className }: FormFieldProps) {
  return (
    <div className={`field${error ? ' has-error' : ''}${className ? ` ${className}` : ''}`}>
      <div className="field-label">
        {label}
        {required ? (
          <span className="req" aria-hidden="true">
            *
          </span>
        ) : null}
      </div>
      {children}
      <div className={`field-error${error ? ' is-visible' : ''}`} role={error ? 'alert' : undefined}>
        {error || '\u00a0'}
      </div>
    </div>
  )
}
