import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', triggerRef }) {
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    if (!isMobile) return
    const prevOverflow = document.body.style.overflow
    const prevPosition = document.body.style.position
    const prevTop = document.body.style.top
    const scrollY = window.scrollY || 0
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.position = prevPosition
      document.body.style.top = prevTop
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  const handleClose = () => {
    onClose()
    setTimeout(() => triggerRef?.current?.focus(), 0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center pt-8 sm:pt-12 lg:pt-16" role="dialog" aria-modal="true" aria-label={title}>
      <div
        onClick={handleClose}
        onMouseDown={handleClose}
        onTouchStart={handleClose}
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm no-mobile-backdrop"
      />
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className={`relative glass-modal rounded-2xl p-6 ${maxWidth} w-full max-h-[90vh] overflow-auto`}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full" aria-label="Close dialog">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
