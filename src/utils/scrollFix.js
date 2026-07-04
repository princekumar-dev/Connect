/**
 * Utility to keep the document scrollable even when dialogs/modals open.
 * Copied from the Academics project to keep the MSEC Connect clone snappy.
 */
export function ensureBodyScrollable() {
  const forceScrollable = () => {
    if (document.documentElement.classList.contains('auth-page')) return

    if (document.body.style.overflow === 'hidden') {
      const hasOpenModal = document.querySelector('[role="dialog"]') ||
        document.querySelector('.modal') ||
        document.querySelector('[data-modal-open="true"]')

      if (!hasOpenModal) {
        console.warn('Body overflow was stuck as hidden, fixing...')
        document.body.style.overflow = ''
      }
    }

    document.documentElement.style.height = 'auto'
    document.documentElement.style.minHeight = '100%'
    document.documentElement.style.overflowY = 'auto'
    document.documentElement.style.overflowX = 'hidden'

    if (document.body.style.overflow !== 'hidden') {
      document.body.style.height = 'auto'
      document.body.style.minHeight = '100%'
      document.body.style.overflowY = 'auto'
      document.body.style.overflowX = 'hidden'
    }

    document.documentElement.style.touchAction = 'auto'
    document.body.style.touchAction = 'auto'

    const styleId = 'force-scroll-style'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.innerHTML = `
      * { 
        touch-action: pan-y !important; 
      }
      .no-scroll {
        touch-action: none !important;
      }
    `
      document.head.appendChild(style)
    }
  }

  forceScrollable()
  setTimeout(forceScrollable, 100)
  setTimeout(forceScrollable, 500)
  setTimeout(forceScrollable, 1000)
  setTimeout(forceScrollable, 2000)

  const interval = setInterval(forceScrollable, 2000)
  return () => clearInterval(interval)
}

if (typeof window !== 'undefined') {
  const applyImmediateFix = () => {
    if (document.documentElement.classList.contains('auth-page')) return
    document.body.style.overflow = ''
    document.body.style.overflowY = 'auto'
    document.body.style.height = 'auto'
    document.body.style.minHeight = '100%'
    document.documentElement.style.height = 'auto'
    document.documentElement.style.minHeight = '100%'
    document.documentElement.style.overflowY = 'auto'
    void document.body.offsetHeight
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyImmediateFix)
  } else {
    applyImmediateFix()
  }

  window.addEventListener('load', () => {
    setTimeout(() => {
      if (document.documentElement.classList.contains('auth-page')) return
      document.body.style.overflow = ''
      document.body.style.overflowY = 'auto'
      document.documentElement.style.overflowY = 'auto'
      void document.body.offsetHeight
    }, 100)
  })
}
