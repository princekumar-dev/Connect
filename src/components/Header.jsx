import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Settings from './Settings'
import NotificationCenter from './NotificationCenter'

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  // Treat both login and signup as 'auth' pages where we show only the logo
  const isAuthPage = ['/login', '/signup'].includes(location.pathname)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [recentNotificationCount, setRecentNotificationCount] = useState(0)
  const [isSmallViewport, setIsSmallViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    // Tailwind's `lg` breakpoint is 1024px. We consider "small viewport"
    // anything under that so mobile/modal behavior is toggled correctly.
    return window.matchMedia('(max-width: 1023px)').matches
  })

  // Helper function to get active link styles
  const getLinkClassName = (path) => {
    let isActive = location.pathname === path
    
    // Special case: consider /book as part of venues section
    if (path === '/venues' && location.pathname === '/book') {
      isActive = true
    }
    
    return isActive 
      ? "text-[#000000] text-sm font-bold leading-normal" 
      : "text-[#111418] text-sm font-medium leading-normal hover:text-[#000000] hover:font-bold transition-all duration-200"
  }

  useEffect(() => {
    // Check authentication status on component mount
    checkAuthStatus()
    // Update small viewport flag on resize/orientation change so we
    // don't rely purely on CSS classes to hide/show mobile modal.
    const updateViewport = () => {
      setIsSmallViewport(window.matchMedia('(max-width: 1023px)').matches)
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)
    
    // Listen for authentication state changes
    const handleAuthChange = () => {
      checkAuthStatus()
      // Ensure any open mobile panels are closed when auth state changes
      try {
        setIsMobileMenuOpen(false)
        setIsSettingsOpen(false)
      } catch (err) {
        // ignore
      }
    }
    
    window.addEventListener('authStateChanged', handleAuthChange)
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange)
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [])

  useEffect(() => {
    // Ensure route changes never leave behind mobile overlays or body scroll locks.
    setIsMobileMenuOpen(false)
    setIsSettingsOpen(false)
    setIsNotificationOpen(false)
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
    document.body.style.top = ''
    window.dispatchEvent(new Event('settingsModalClose'))
  }, [location.pathname])

  const checkAuthStatus = () => {
    const auth = localStorage.getItem('auth')
    if (auth) {
      try {
        const authData = JSON.parse(auth)
        setIsLoggedIn(authData.isAuthenticated || false)
        setUserEmail(authData.email || '')
        setUserRole(authData.role || '')
      } catch (error) {
        console.error('Error parsing auth data:', error)
        // Fallback to old auth system
        const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
        const email = localStorage.getItem('userEmail')
        const role = localStorage.getItem('userRole')
        
        setIsLoggedIn(loggedIn)
        setUserEmail(email || '')
        setUserRole(role || '')
      }
    } else {
      // Fallback to old auth system
      const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
      const email = localStorage.getItem('userEmail')
      const role = localStorage.getItem('userRole')
      
      setIsLoggedIn(loggedIn)
      setUserEmail(email || '')
      setUserRole(role || '')
    }
  }

  const handleNotificationCountsUpdate = ({ unreadCount = 0, recentCount = 0 } = {}) => {
    setUnreadNotificationCount(unreadCount)
    setRecentNotificationCount(recentCount)
  }

  const loadNotificationCounts = async () => {
    if (!isLoggedIn || !userEmail) {
      setUnreadNotificationCount(0)
      setRecentNotificationCount(0)
      return
    }

    try {
      const response = await fetch(`/api/notifications/user/${encodeURIComponent(userEmail)}?limit=100`, {
        headers: { userEmail }
      })
      const responseText = await response.text()
      let data = {}
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok || !data.success) {
        const details = data.message || responseText || `HTTP ${response.status}`
        throw new Error(details || 'Failed to load notifications')
      }

      setUnreadNotificationCount(data.unreadCount || 0)
      setRecentNotificationCount(data.recentCount || 0)
    } catch (error) {
      console.error('Failed to load notification counts:', error)
      setUnreadNotificationCount(0)
      setRecentNotificationCount(0)
    }
  }

  useEffect(() => {
    loadNotificationCounts()

    if (!isLoggedIn || !userEmail) return undefined

    const intervalId = window.setInterval(() => {
      loadNotificationCounts()
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [isLoggedIn, userEmail])

  const handleLogout = () => {
    // Clear both new and old auth systems
    localStorage.removeItem('auth')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userRole')
    
    setIsLoggedIn(false)
    setUserEmail('')
    setUserRole('')
    
    // Trigger auth state change event
    window.dispatchEvent(new Event('authStateChanged'))
    
    // Close any open menus/settings
    try {
      setIsMobileMenuOpen(false)
      setIsSettingsOpen(false)
    } catch (err) {
      // ignore
    }

    // Use SPA navigation where possible
    try {
      navigate('/')
    } catch (err) {
      window.location.href = '/'
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const currentPath = location.pathname
      
      // If on events or venues page, search within that page
      if (currentPath.includes('/events')) {
        navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`)
        setSearchQuery('')
        return
      } else if (currentPath.includes('/venues')) {
        navigate(`/venues?search=${encodeURIComponent(searchQuery.trim())}`)
        setSearchQuery('')
        return
      }
      
      // Otherwise, do smart search to find best results
      try {
        const query = searchQuery.trim().toLowerCase()
        const [venuesResponse, eventsResponse] = await Promise.all([
          fetch('/api/venues'),
          fetch('/api/events')
        ])
        
        const venuesData = await venuesResponse.json()
        const eventsData = await eventsResponse.json()
        
        const venueMatches = venuesData.success ? 
          venuesData.venues.filter(venue => 
            (venue.venue || '').toLowerCase().includes(query)
          ).length : 0
        
        const eventMatches = eventsData.success ?
          eventsData.events.filter(event =>
            (event.title || '').toLowerCase().includes(query) ||
            (event.description || '').toLowerCase().includes(query) ||
            (event.venue || '').toLowerCase().includes(query) ||
            (event.eventType || '').toLowerCase().includes(query)
          ).length : 0
        
        // Navigate to page with most results
        if (eventMatches > venueMatches) {
          navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`)
        } else if (venueMatches > 0) {
          navigate(`/venues?search=${encodeURIComponent(searchQuery.trim())}`)
        } else {
          navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`)
        }
      } catch (error) {
        console.error('Search error:', error)
        navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`)
      }
      
      setSearchQuery('') // Clear search after navigating
    }
  }

  return (
    <header className={`sticky top-0 z-50 glass-card rounded-[1.35rem] flex items-center justify-between whitespace-nowrap px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-1.5 sm:py-4 mx-2 sm:mx-3 md:mx-4 mt-2 sm:mt-3 md:mt-4 min-h-[52px] sm:min-h-0 border border-white/60 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ${
      isAuthPage
        ? '!bg-white/72 !backdrop-blur-md !border-white/55 !shadow-[0_18px_40px_rgba(15,23,42,0.12)]'
        : '!bg-white md:!bg-[rgba(255,255,255,0.75)]'
    }`}>
      {/* Left Section: Logo, Brand, and Navigation */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 flex-1 min-w-0">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <div className="size-7 sm:size-10 md:size-10">
            <img 
              src="/images/mseclogo.webp" 
              alt="MSEC Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <h2 className="text-sm sm:text-lg md:text-xl font-bold tracking-[-0.015em] whitespace-nowrap">
              <span className="text-[#111418]">MSEC</span> <span className="wave-text">Connect</span>
            </h2>
          </div>
        </div>

  {/* Desktop Navigation - Close to Logo */}
  {!isAuthPage && (
          <nav className="hidden lg:flex items-center gap-5 xl:gap-6">
            <Link className={getLinkClassName('/')} to="/">Home</Link>
            <Link className={getLinkClassName('/venues')} to="/venues">Venues</Link>
            <Link className={getLinkClassName('/events')} to="/events">Events</Link>
            {isLoggedIn && userRole === 'admin' && (
              <Link className={getLinkClassName('/bookings')} to="/bookings">Bookings</Link>
            )}
            {isLoggedIn && userRole === 'admin' && (
              <Link className={getLinkClassName('/manage-users')} to="/manage-users">Manage Users</Link>
            )}
            {isLoggedIn && userRole !== 'admin' && (
              <Link className={getLinkClassName('/booking-status')} to="/booking-status">Booking Status</Link>
            )}
            <Link className={getLinkClassName('/contact')} to="/contact">Contact</Link>
          </nav>
        )}
      </div>

      {/* Right Section: Search and Actions */}
  {!isAuthPage && (
        <div className="hidden lg:flex items-center gap-3 xl:gap-4">
          <form onSubmit={handleSearch} className="relative !h-10 w-48 xl:w-56">
            {/* Glass-morphism input: translucent bg, subtle border, backdrop blur */}
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#60758a] pointer-events-none z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="form-input w-full h-full text-[#111418] focus:outline-0 focus:ring-0 border border-white/10 bg-white/30 backdrop-blur-sm placeholder:text-[#60758a] pl-10 pr-3 text-sm font-normal leading-normal rounded-xl relative z-0"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(e)
                }
              }}
            />
          </form>
          
          <div className="flex items-center gap-2">
            {!isLoggedIn ? (
              <Link
                to="/login"
                className="flex min-w-[70px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#3d99f5] text-white text-sm font-bold leading-normal tracking-[0.015em] whitespace-nowrap shadow-lg shadow-blue-500/20 transition-transform hover:scale-[1.02]"
              >
                <span className="truncate">Login</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2 relative">
                <button
                  onClick={() => {
                    setIsNotificationOpen((prev) => !prev)
                    setIsSettingsOpen(false)
                  }}
                  className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/60 hover:bg-white/90 border border-white/60 shadow-sm transition-all"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <svg className="w-5 h-5 text-[#111418]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>

                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 font-bold text-center">
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                  )}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className="flex items-center gap-2 px-3 h-10 rounded-xl bg-white/55 hover:bg-white/90 border border-white/60 shadow-sm transition-all group"
                    title="Settings"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3d99f5] to-[#2b87e3] flex items-center justify-center shadow-md shadow-blue-500/20">
                      <span className="text-sm font-bold text-white">
                        {userEmail?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-[#111418] hidden xl:inline truncate max-w-[150px] group-hover:text-[#3d99f5]">
                      {userEmail}
                    </span>
                    <svg 
                      className={`w-4 h-4 text-[#60758a] transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* Desktop Settings Dropdown */}
                  {!isSmallViewport && isSettingsOpen && (
                    <Settings 
                      isOpen={isSettingsOpen} 
                      onClose={() => setIsSettingsOpen(false)}
                      userEmail={userEmail}
                      userRole={userRole}
                    />
                  )}
                </div>
              </div>
            )}
            <Link
              to="/book"
              className="flex min-w-[70px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-[#3d99f5] text-white text-sm font-bold leading-normal tracking-[0.015em] whitespace-nowrap shadow-lg shadow-blue-500/20 transition-transform hover:scale-[1.02]"
            >
              <span className="truncate">Book</span>
            </Link>
          </div>
        </div>
      )}

      {/* Mobile Actions */}
  {!isAuthPage && (
        <div className="lg:hidden flex items-center gap-0.5 self-center">
          {isLoggedIn && (
            <>
              <button
                onClick={() => {
                  setIsNotificationOpen(true)
                  setIsSettingsOpen(false)
                }}
                  className="flex items-center justify-center w-8 h-8 text-[#111418] hover:bg-white/80 rounded-xl bg-white/55 border border-white/60 shadow-sm transition-all duration-200 flex-shrink-0 relative"
                aria-label="Notifications"
                title="Notifications"
              >
                <svg className="w-[18px] h-[18px] sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 font-bold text-center">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setIsSettingsOpen(true)
                  setIsNotificationOpen(false)
                }}
                className="flex items-center justify-center w-8 h-8 text-[#111418] hover:bg-white/80 rounded-xl bg-white/55 border border-white/60 shadow-sm transition-all duration-200 flex-shrink-0"
                aria-label="Open settings"
                title={userEmail || 'Open settings'}
              >
                <svg className="w-[18px] h-[18px] sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </>
          )}
          {!isLoggedIn && (
            <Link
              to="/login"
              className="flex min-w-[72px] items-center justify-center rounded-xl h-10 px-4 bg-[#3d99f5] text-white text-sm font-bold whitespace-nowrap shadow-lg shadow-blue-500/20 transition-transform hover:scale-[1.02]"
            >
              <span className="truncate">Login</span>
            </Link>
          )}
        </div>
      )}

      {/* Settings Modal for Mobile */}
      {isSettingsOpen && isSmallViewport && (
        <Settings 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          userEmail={userEmail}
          userRole={userRole}
          isMobile={true}
        />
      )}

      {isLoggedIn && (
        <NotificationCenter
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
          userEmail={userEmail}
          onCountsUpdate={handleNotificationCountsUpdate}
        />
      )}
    </header>
  )
}

export default Header
