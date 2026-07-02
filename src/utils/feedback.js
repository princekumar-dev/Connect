const DEFAULT_TOAST_DURATION = 4200

function dispatchFeedbackEvent(name, detail) {
  if (typeof window === 'undefined') return false
  window.dispatchEvent(new CustomEvent(name, { detail }))
  return true
}

export function showAppToast(message, type = 'info', options = {}) {
  if (!message) return
  dispatchFeedbackEvent('app:toast', {
    message,
    type,
    duration: options.duration ?? DEFAULT_TOAST_DURATION,
    title: options.title
  })
}

export function showAppAlert(message, options = {}) {
  if (!message) return

  const dispatched = dispatchFeedbackEvent('app:alert', {
    message,
    title: options.title || 'Notice',
    type: options.type || 'info',
    confirmText: options.confirmText || 'OK'
  })

  if (!dispatched && typeof window !== 'undefined') {
    window.alert(message)
  }
}
