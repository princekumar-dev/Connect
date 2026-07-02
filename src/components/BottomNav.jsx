import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

function BottomNav() {
  const location = useLocation()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    const syncAuth = () => {
      const auth = localStorage.getItem('auth')
      if (auth) {
        try {
          const authData = JSON.parse(auth)
          setIsLoggedIn(Boolean(authData.isAuthenticated))
          setUserRole(authData.role || '')
          return
        } catch (error) {
          // Fall through to legacy keys
        }
      }

      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true')
      setUserRole(localStorage.getItem('userRole') || '')
    }

    syncAuth()
    window.addEventListener('authStateChanged', syncAuth)
    return () => window.removeEventListener('authStateChanged', syncAuth)
  }, [])

  if (!isLoggedIn) return null

  const bookingItem =
    userRole === 'admin'
      ? { name: 'Bookings', path: '/bookings', icon: 'bookings' }
      : { name: 'Status', path: '/booking-status', icon: 'status' }

  const navItems = [
    { name: 'Home', path: '/', icon: 'home' },
    { name: 'Venues', path: '/venues', icon: 'venues' },
    { name: 'Events', path: '/events', icon: 'events' },
    bookingItem
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/venues') return location.pathname === '/venues' || location.pathname === '/book'
    return location.pathname.startsWith(path)
  }

  const renderIcon = (icon) => {
    switch (icon) {
      case 'home':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        )
      case 'venues':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )
      case 'events':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      case 'bookings':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      case 'status':
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
    }
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-2 pb-2 safe-area-inset-bottom">
      <div className="mx-auto max-w-[720px] rounded-t-3xl border border-white/70 bg-white/90 backdrop-blur-xl shadow-[0_-12px_36px_rgba(15,23,42,0.12)] px-2 py-2">
        <div className="flex items-center justify-around gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex min-w-[60px] flex-col items-center justify-center rounded-2xl px-2 py-2 transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-blue-50 text-[#2563eb] shadow-sm ring-1 ring-blue-100'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-[#2563eb]'
              }`}
              aria-label={item.name}
            >
              {renderIcon(item.icon)}
              <span className={`mt-1 text-[11px] leading-none ${isActive(item.path) ? 'font-bold' : 'font-medium'}`}>
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default BottomNav
