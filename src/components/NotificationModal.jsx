import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const TYPE_STYLES = {
  success: {
    accent: 'emerald',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
      </svg>
    ),
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    button: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/30',
    progress: 'bg-emerald-500'
  },
  error: {
    accent: 'red',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    tone: 'border-red-200 bg-red-50 text-red-700',
    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500/30',
    progress: 'bg-red-500'
  },
  warning: {
    accent: 'amber',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    tone: 'border-amber-200 bg-amber-50 text-amber-700',
    button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/30',
    progress: 'bg-amber-500'
  },
  info: {
    accent: 'blue',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16h-1v-4h-1m1-4h.01M12 22a10 10 0 100-20 10 10 0 000 20z" />
      </svg>
    ),
    tone: 'border-blue-200 bg-blue-50 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/30',
    progress: 'bg-blue-500'
  }
}

function getStyle(type) {
  return TYPE_STYLES[type] || TYPE_STYLES.info
}

// Confirmation Dialog Component
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const style = getStyle(type === 'danger' ? 'error' : type)

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm no-mobile-backdrop"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] animate-slideUp">
        {/* Icon */}
        <div className={`mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full border ${style.tone}`}>
          {style.icon}
        </div>

        {/* Title */}
        <h3 className="px-6 pt-4 text-center text-xl font-bold text-slate-950">
          {title}
        </h3>

        {/* Message */}
        <p className="px-6 pt-2 text-center text-sm leading-6 text-slate-600">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3 p-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`flex-1 rounded-xl px-4 py-2.5 ${style.button} font-semibold text-white shadow-lg transition-colors duration-200 focus:outline-none focus:ring-4`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Toast Notification Component
export function Toast({ isOpen, onClose, message, type = 'success', duration = 3000 }) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  const style = getStyle(type)

  const toastContent = (
    <div className="fixed z-[1100] pointer-events-none top-3 left-3 right-3 sm:top-6 sm:left-auto sm:right-6 sm:w-[26rem] animate-slideInTop sm:animate-slideInRight">
      <div className="notification-card pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border border-white/70 bg-white/95 px-4 py-4 text-slate-900 shadow-[0_20px_55px_rgba(15,23,42,0.22)] backdrop-blur-xl">
        {/* Icon */}
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${style.tone}`}>
          {style.icon}
        </div>

        {/* Message */}
        <p className="min-w-0 flex-1 pt-1 text-sm font-semibold leading-5 text-slate-800">{message}</p>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-500/10"
          aria-label="Dismiss notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress bar */}
        {duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
            <div 
              className={`h-full ${style.progress}`}
              style={{
                animation: `shrink ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(toastContent, document.body)
}

// Alert Dialog (non-blocking, like alert but styled)
export function AlertDialog({ isOpen, onClose, title, message, type = 'info' }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const style = getStyle(type)

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm no-mobile-backdrop"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] animate-slideUp">
        {/* Icon */}
        <div className={`mx-auto mt-6 flex h-12 w-12 items-center justify-center rounded-full border ${style.tone}`}>
          {style.icon}
        </div>

        {/* Title */}
        {title && (
          <h3 className="px-6 pt-4 text-center text-xl font-bold text-slate-950">
            {title}
          </h3>
        )}

        {/* Message */}
        <p className="px-6 pt-2 text-center text-sm leading-6 text-slate-600">
          {message}
        </p>

        {/* Button */}
        <div className="p-6">
        <button
          onClick={onClose}
          className={`w-full rounded-xl px-4 py-2.5 ${style.button} font-semibold text-white shadow-lg transition-colors duration-200 focus:outline-none focus:ring-4`}
        >
          OK
        </button>
        </div>
      </div>
    </div>
  )
}

export function GlobalFeedbackHost() {
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'info', duration: 4200 })
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info', confirmText: 'OK' })

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, isOpen: false }))
  }, [])

  const closeAlert = useCallback(() => {
    setAlertDialog(prev => ({ ...prev, isOpen: false }))
  }, [])

  useEffect(() => {
    const handleToast = (event) => {
      const detail = event.detail || {}
      setToast({
        isOpen: true,
        message: detail.message || '',
        type: detail.type || 'info',
        duration: detail.duration ?? 4200
      })
    }

    const handleAlert = (event) => {
      const detail = event.detail || {}
      setAlertDialog({
        isOpen: true,
        title: detail.title || 'Notice',
        message: detail.message || '',
        type: detail.type || 'info',
        confirmText: detail.confirmText || 'OK'
      })
    }

    window.addEventListener('app:toast', handleToast)
    window.addEventListener('app:alert', handleAlert)
    return () => {
      window.removeEventListener('app:toast', handleToast)
      window.removeEventListener('app:alert', handleAlert)
    }
  }, [])

  return (
    <>
      <Toast
        isOpen={toast.isOpen}
        onClose={closeToast}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
      />
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={closeAlert}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </>
  )
}
