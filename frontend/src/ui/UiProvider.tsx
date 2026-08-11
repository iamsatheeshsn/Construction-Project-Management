import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastItem = { id: number; message: string; tone?: 'info' | 'success' | 'error' }

type ConfirmOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type SuccessOptions = {
  title?: string
  message: string
  autoCloseMs?: number
}

type UiContextValue = {
  toast: (message: string, tone?: ToastItem['tone']) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
  success: (options: string | SuccessOptions) => void
}

const UiContext = createContext<UiContextValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(null)
  const confirmResolver = useRef<((value: boolean) => void) | null>(null)
  const [successState, setSuccessState] = useState<(SuccessOptions & { open: boolean }) | null>(null)
  const successTimer = useRef<number | null>(null)
  const toastId = useRef(0)

  const toast = useCallback((message: string, tone: ToastItem['tone'] = 'info') => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve
      setConfirmState({ ...options, open: true })
    })
  }, [])

  const closeConfirm = (value: boolean) => {
    confirmResolver.current?.(value)
    confirmResolver.current = null
    setConfirmState(null)
  }

  const success = useCallback((options: string | SuccessOptions) => {
    const opts = typeof options === 'string' ? { message: options } : options
    if (successTimer.current) window.clearTimeout(successTimer.current)
    setSuccessState({
      title: opts.title ?? 'Success',
      message: opts.message,
      autoCloseMs: opts.autoCloseMs ?? 2200,
      open: true,
    })
    successTimer.current = window.setTimeout(() => {
      setSuccessState(null)
    }, opts.autoCloseMs ?? 2200)
  }, [])

  const value = useMemo(() => ({ toast, confirm, success }), [toast, confirm, success])

  return (
    <UiContext.Provider value={value}>
      {children}

      {confirmState?.open && (
        <div className="modal-backdrop" role="presentation" onClick={() => closeConfirm(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 id="confirm-title">{confirmState.title}</h2>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {confirmState.message}
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={confirmState.danger ? 'danger' : undefined}
                style={confirmState.danger ? { background: 'var(--danger)', color: '#fff' } : undefined}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {successState?.open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSuccessState(null)}>
          <div className="modal-card success" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon" aria-hidden>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2>{successState.title}</h2>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {successState.message}
              </p>
            </div>
            <div className="modal-actions">
              <button type="button" className="accent" onClick={() => setSuccessState(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toast-host" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone ?? 'info'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </UiContext.Provider>
  )
}

export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used within UiProvider')
  return ctx
}

export function useConfirm() {
  return useUi().confirm
}

export function useSuccess() {
  return useUi().success
}

export function useToast() {
  return useUi().toast
}
