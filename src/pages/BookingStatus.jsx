import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog, Toast } from '../components/NotificationModal'
import CalendarExportModal from '../components/CalendarExportModal'

function BookingStatus() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isConnected, setIsConnected] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [updatingIds, setUpdatingIds] = useState(new Set())
  const navigate = useNavigate()
  
  // Notification states
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, bookingId: null })
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' })
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)

  useEffect(() => {
    // Check authentication and redirect if not logged in
    const auth = localStorage.getItem('auth')
    const isLoggedIn = localStorage.getItem('isLoggedIn')
    const userEmailFromStorage = localStorage.getItem('userEmail')
    const userRole = localStorage.getItem('userRole')

    // Handle both auth systems
    if (auth) {
      try {
        const authData = JSON.parse(auth)
        if (!authData.isAuthenticated) {
          navigate('/login')
          return
        }
        setUserEmail(authData.email)
        // Only actual admin role gets admin privileges, not principal/secretary (case-insensitive)
        setIsAdmin(authData.role?.toLowerCase() === 'admin' || authData.email === 'admin@msec.edu.in')
      } catch (error) {
        navigate('/login')
        return
      }
    } else if (isLoggedIn === 'true' && userEmailFromStorage) {
      // Fallback to old auth system
      setUserEmail(userEmailFromStorage)
      // Only actual admin role gets admin privileges (case-insensitive)
      setIsAdmin(userRole?.toLowerCase() === 'admin' || userEmailFromStorage === 'admin@msec.edu.in')
    } else {
      navigate('/login')
      return
    }

    // Check server connection after a small delay
    setTimeout(() => {
      checkServerConnection()
    }, 500)
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadUserBookings()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [navigate])

  // Separate useEffect to load bookings when userEmail or isAdmin is set
  useEffect(() => {
    if (userEmail) {
      console.log('User email set, loading bookings for:', userEmail, 'isAdmin:', isAdmin)
      loadUserBookings()
    }
  }, [userEmail, isAdmin])

  const checkServerConnection = async () => {
    try {
      const response = await fetch('/api/venues', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      })
      
      if (response.ok) {
        setIsConnected(true)
        console.log('Server connection: OK')
      } else {
        console.log('Server connection: Failed with status', response.status)
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Server connection error:', error)
      setIsConnected(false)
      
      // Retry after 2 seconds
      setTimeout(() => {
        checkServerConnection()
      }, 2000)
    }
  }

  const loadUserBookings = async () => {
    if (!userEmail) {
      console.log('No user email available, cannot load bookings')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      console.log('Loading bookings for user:', userEmail, 'isAdmin:', isAdmin)
      
      const headers = {
        'Content-Type': 'application/json',
        'userEmail': userEmail
      }
      
      // Add admin flag for admin users
      if (isAdmin) {
        headers['isAdmin'] = 'true'
      }
      
      const response = await fetch('/api/bookings', { headers })

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings (${response.status})`)
      }

      const data = await response.json()
      console.log('Received bookings data:', data)
      console.log('Number of bookings returned:', data.bookings ? data.bookings.length : 0)
      console.log('User email used for filtering:', userEmail)
      
      // The API already filters bookings by user email, so we can use them directly
      setBookings(data.bookings || [])
      setLastUpdated(new Date())
      setIsConnected(true) // API call successful
      
      if (data.bookings && data.bookings.length > 0) {
        console.log('Bookings loaded successfully:', data.bookings.map(b => ({ id: b._id, venue: b.venue, email: b.email })))
      } else {
        console.log('No bookings found for user:', userEmail)
      }
      
    } catch (error) {
      console.error('Error loading bookings:', error)
      setError(error.message)
      setIsConnected(false) // API call failed
    } finally {
      setLoading(false)
    }
  }

  const refreshBookings = () => {
    // Show connecting state while we refresh
    setIsConnected(null)
    setLoading(true)
    loadUserBookings().then(() => {
      showNotification('Bookings refreshed', 'success')
    }).finally(() => {
      setLoading(false)
    })
  }

  const showNotification = (message, type = 'success') => {
    // Simple notification - you can enhance this with a proper notification system
    console.log(`${type.toUpperCase()}: ${message}`)
  }

  const updateBookingStatus = async (bookingId, newStatus) => {
    if (!isAdmin) return
    // mark as updating to prevent duplicates and show disabled state
    setUpdatingIds(prev => new Set(prev).add(bookingId))
    try {
      const response = await fetch('/api/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookingId, status: newStatus })
      })

      const data = await response.json()
      
      if (data.success) {
        setBookings(prev => 
          prev.map(booking => 
            booking._id === bookingId 
              ? { ...booking, status: newStatus }
              : booking
          )
        )
        showNotification(`Booking ${newStatus} successfully!`, 'success')
        // notify other parts of the app and other tabs
        try {
          const stamp = Date.now().toString()
          localStorage.setItem('bookings-updated', stamp)
        } catch (e) {}
        try {
          window.dispatchEvent(new CustomEvent('bookings:updated', { detail: { bookingId, status: newStatus } }))
        } catch (e) {}
      } else {
        showNotification(`Error: ${data.error}`, 'error')
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      showNotification('Failed to update booking status. Please try again.', 'error')
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(bookingId)
        return next
      })
    }
  }

  // Listen for bookings updates from other tabs or parts of the app and refresh
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'bookings-updated') {
        loadUserBookings()
      }
    }

    const handleEvent = (e) => {
      loadUserBookings()
    }

    let bc
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('bookings')
        bc.onmessage = () => loadUserBookings()
      }
    } catch (e) {}

    window.addEventListener('storage', handleStorage)
    window.addEventListener('bookings:updated', handleEvent)
    // Listen for messages from service worker (push -> SW -> clients)
    const swMessageHandler = (e) => {
      try {
        // event from navigator.serviceWorker or window message event
        const msg = e.data || (e && e.detail) || null
        if (msg && msg.type === 'bookings:updated') {
          loadUserBookings()
        }
      } catch (err) {}
    }
    // Attach both possible listeners for broader browser compatibility
    try { navigator.serviceWorker?.addEventListener?.('message', swMessageHandler) } catch (err) {}
    try { window.addEventListener('message', swMessageHandler) } catch (err) {}

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('bookings:updated', handleEvent)
      try {
        if (bc) { bc.close() }
      } catch (e) {}
      try { navigator.serviceWorker?.removeEventListener?.('message', swMessageHandler) } catch (err) {}
      try { window.removeEventListener('message', swMessageHandler) } catch (err) {}
    }
  }, [userEmail, isAdmin])

  const deleteBooking = async (bookingId) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'userEmail': userEmail  // Pass user email for authorization
        },
        body: JSON.stringify({ bookingId })
      })

      const data = await response.json()
      
      if (data.success) {
        setBookings(prev => prev.filter(booking => booking._id !== bookingId))
        setToast({ isOpen: true, message: 'Booking deleted successfully!', type: 'success' })
      } else {
        setToast({ isOpen: true, message: `Error: ${data.error}`, type: 'error' })
      }
    } catch (error) {
      console.error('Error deleting booking:', error)
      setToast({ isOpen: true, message: 'Failed to delete booking. Please try again.', type: 'error' })
    }
  }
  
  const handleDeleteClick = (bookingId) => {
    setConfirmDialog({ isOpen: true, bookingId })
  }

  const handleDeleteConfirm = () => {
    if (confirmDialog.bookingId) {
      deleteBooking(confirmDialog.bookingId)
    }
  }

  const getBookingStatus = (booking) => {
    const bookingDateTime = new Date(booking.date + 'T' + (booking.time || '00:00'))
    const now = new Date()
    const isUpcoming = bookingDateTime > now
    const isPast = bookingDateTime < now
    const isToday = bookingDateTime.toDateString() === now.toDateString()
    
    // Priority: Check explicit status first
    if (booking.status === 'cancelled') {
      return { 
        text: 'Cancelled', 
        class: 'bg-red-100 text-red-800',
        icon: '❌',
        description: booking.movedReason || 'Booking was cancelled'
      }
    } else if (booking.status === 'rejected') {
      return { 
        text: 'Rejected', 
        class: 'bg-red-100 text-red-800',
        icon: '⛔',
        description: 'Booking was not approved'
      }
    } else if (booking.status === 'pending') {
      return { 
        text: 'Pending Approval', 
        class: 'bg-yellow-100 text-yellow-800',
        icon: '⏳',
        description: 'Awaiting admin approval'
      }
    } else if (booking.status === 'approved' || booking.status === 'confirmed') {
      // Both 'approved' and 'confirmed' mean the booking is confirmed
      if (isPast) {
        return { 
          text: 'Completed', 
          class: 'bg-gray-100 text-gray-800',
          icon: '✓',
          description: 'Event has concluded'
        }
      } else if (isToday) {
        return { 
          text: 'Today - Confirmed', 
          class: 'bg-orange-100 text-orange-800 animate-pulse',
          icon: '📅',
          description: 'Your event is today!'
        }
      } else if (isUpcoming) {
        return { 
          text: 'Confirmed', 
          class: 'bg-green-100 text-green-800',
          icon: '✅',
          description: 'Booking confirmed and scheduled'
        }
      }
      return { 
        text: 'Confirmed', 
        class: 'bg-green-100 text-green-800',
        icon: '✅',
        description: 'Booking is confirmed'
      }
    }
    
    // Fallback for unknown status
    return { 
      text: booking.status || 'Unknown', 
      class: 'bg-gray-100 text-gray-800',
      icon: '❓',
      description: 'Status unknown'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  // (Spinner removed - color differentiation is sufficient)
  return (
    <>
      <style>
        {`
          .booking-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border: 1px solid #e2e8f0;
            transition: all 0.3s ease;
          }
          
          .booking-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          }
          
          .loading-spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3d99f5;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 smooth-scroll no-mobile-anim">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="glass-card no-mobile-backdrop relative p-8 mb-8 rounded-3xl shadow-2xl mobile-smoothest-scroll">
              <div className="text-center mb-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
                  {isAdmin ? 'All Bookings Management' : 'My Booking Status'}
                </h1>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  {isAdmin ? 'Manage and review all venue bookings' : 'View and track your venue bookings'}
                  {userEmail && (
                    <span className="block text-sm mt-2 font-medium text-blue-600">
                      Logged in as: {userEmail} {isAdmin && <span className="font-bold">(Admin)</span>}
                    </span>
                  )}
                </p>
                
                {/* connection indicator moved to the right side (replacing the old Refresh position) */}
                
                {lastUpdated && (
                  <p className="text-[#637588] text-xs font-normal leading-normal mt-3">
                    Last updated: {lastUpdated.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        isConnected === null ? 'bg-yellow-500 animate-pulse' : 
                        isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-xs text-[#637588]">
                        {isConnected === null ? 'Checking connection...' :
                         isConnected ? 'Connected' : 'Connection failed'}
                      </span>
                    </div>
                </div>

                <div className="flex-shrink-0">
                  <button 
                    onClick={refreshBookings}
                    disabled={loading}
                    className="glass-button flex items-center gap-2 px-4 py-2 text-[#3d99f5] rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="loading-spinner"></div>
                <p className="ml-3 text-[#637588]">Loading your bookings...</p>
              </div>
            )}

            {/* Error Message */}
            {error && !loading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="font-medium text-red-800">Unable to load bookings</p>
                <p className="text-sm mt-1 text-red-600">{error}</p>
                <button 
                  onClick={refreshBookings}
                  className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            {/* No Bookings Message */}
            {!loading && !error && bookings.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m6 0h6m-6 0v6m0-6V6a3 3 0 013-3h6a3 3 0 013 3v6m0 0v6m0-6h6m-6 0H9m12 6v6m0-6h6m-6 0H9"></path>
                  </svg>
                </div>
                <p className="font-medium text-lg mb-2 text-yellow-800">No Bookings Found</p>
                <p className="text-sm mb-4 text-yellow-600">You haven't made any venue bookings yet.</p>
                <button 
                  onClick={() => navigate('/book')}
                  className="inline-flex items-center px-4 py-2 bg-[#3d99f5] text-white rounded-lg font-medium hover:bg-[#2980e6] transition-colors"
                >
                  Book a Venue
                </button>
              </div>
            )}

            {/* Bookings List */}
            {!loading && !error && bookings.length > 0 && (
              <div className="grid gap-4">
                {bookings.map((booking, index) => {
                  const status = getBookingStatus(booking)
                  
                  return (
                    <div key={booking.id || index} className="booking-card rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          {/* Venue Display with Switch Indicator - only show for bookings that were actually moved */}
                          {booking.originalVenue && booking.movedReason ? (
                            <div className="mb-2">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-[#111418]">
                                  {booking.venue || 'Venue'}
                                </h3>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                  🔄 Venue Switched
                                </span>
                              </div>
                              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                                <p className="text-sm text-blue-800 font-medium">
                                  📍 Original Venue: <span className="line-through">{booking.originalVenue}</span>
                                </p>
                                <p className="text-sm text-green-700 font-medium mt-1">
                                  📍 New Venue: <span className="font-bold">{booking.venue}</span>
                                </p>
                                {booking.movedReason && (
                                  <p className="text-xs text-blue-700 mt-2 italic">
                                    ℹ️ {booking.movedReason}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <h3 className="text-xl font-bold text-[#111418] mb-1">
                              {booking.venue || 'Venue'}
                            </h3>
                          )}
                          
                          {booking.organizer && (
                            <p className="text-[#637588] text-sm">Organized by {booking.organizer}</p>
                          )}
                          {isAdmin && booking.email && (
                            <p className="text-[#637588] text-sm font-medium">
                              📧 {booking.email}
                            </p>
                          )}
                          <p className="text-[#637588] text-xs font-medium">
                            Booked on: {formatDate(booking.createdAt || booking.bookedAt || booking.date)}
                          </p>
                          {booking.bookedAt && (
                            <p className="text-[#637588] text-xs font-medium">
                              Booked at: {new Date(booking.bookedAt).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                hour12: true 
                              })}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${status.class} flex items-center gap-1`} title={status.description}>
                            <span>{status.icon}</span>
                            <span>{status.text}</span>
                          </div>
                          {/* Show movedReason only for cancelled bookings without originalVenue */}
                          {status.description && booking.movedReason && booking.status === 'cancelled' && !booking.originalVenue && (
                            <p className="text-xs text-red-600 italic max-w-xs text-right">
                              {booking.movedReason}
                            </p>
                          )}
                          
                          {/* Admin Controls - Approve/Reject (Admin only) */}
                          {isAdmin && ['pending','approved','rejected'].includes(booking.status) && (() => {
                            const isUpdating = updatingIds.has(booking._id)
                            return (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => updateBookingStatus(booking._id, 'approved')}
                                  disabled={isUpdating || booking.status === 'approved'}
                                  aria-disabled={isUpdating || booking.status === 'approved'}
                                  className={`px-3 py-1 text-white text-xs rounded font-medium transition-all ${isUpdating || booking.status === 'approved' ? 'bg-green-400 opacity-80 cursor-not-allowed ring-0' : 'bg-green-600 hover:bg-green-700 shadow-sm ring-1 ring-green-300'}`}
                                >
                                  <span>✓ Approve</span>
                                </button>
                                <button
                                  onClick={() => updateBookingStatus(booking._id, 'rejected')}
                                  disabled={isUpdating || booking.status === 'rejected'}
                                  aria-disabled={isUpdating || booking.status === 'rejected'}
                                  className={`px-3 py-1 text-white text-xs rounded font-medium transition-all ${isUpdating || booking.status === 'rejected' ? 'bg-red-400 opacity-80 cursor-not-allowed ring-0' : 'bg-red-600 hover:bg-red-700 shadow-sm ring-1 ring-red-300'}`}
                                >
                                  <span>✗ Reject</span>
                                </button>
                              </div>
                            )
                          })()}
                          
                          {/* Delete Button - Available for all users for their own bookings */}
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleDeleteClick(booking._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-[0px] rounded font-medium transition-colors"
                              title="Delete this booking"
                            >
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7m5 4v6m4-6v6M15 3H9l1 4h4l1-4z" />
                              </svg>
                              <span className="text-xs">Delete</span>
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-4">
                        <div>
                          <p className="text-[#637588] text-xs font-medium uppercase tracking-wide mb-1">Date</p>
                          <p className="text-[#111418] font-medium">{formatDate(booking.date)}</p>
                        </div>
                        <div className="pl-2 sm:pl-0">
                          <p className="text-[#637588] text-xs font-medium uppercase tracking-wide mb-1">Time</p>
                          <p className="text-[#111418] font-medium">{booking.time || 'Not specified'}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-[#637588] text-xs font-medium uppercase tracking-wide mb-1">Duration</p>
                        <p className="text-[#111418] font-medium">
                          {booking.duration ? 
                            (booking.duration >= 1 ? 
                              `${booking.duration} hour${booking.duration > 1 ? 's' : ''}` : 
                              `${booking.duration * 60} minutes`) : 
                            'Not specified'}
                        </p>
                      </div>

                      {booking.attendees && (
                        <div className="mb-4">
                          <p className="text-[#637588] text-xs font-medium uppercase tracking-wide mb-1">Attendees</p>
                          <p className="text-[#111418] font-medium">{booking.attendees} people</p>
                        </div>
                      )}

                      <div className="border-t border-[#e2e8f0] pt-4 mb-4">
                        <p className="text-[#637588] text-xs font-medium uppercase tracking-wide mb-1">Booking ID</p>
                        <p className="text-[#111418] text-sm font-mono">{booking.bookingId || booking._id || 'N/A'}</p>
                      </div>

                      <div className="border-t border-[#e2e8f0] pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[#637588] text-xs font-medium uppercase tracking-wide mb-1">Status</p>
                            <p className="text-[#111418] text-sm font-medium">{status.text}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedBooking(booking)
                              setShowExportModal(true)
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors"
                            title="Export to Calendar"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Export
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, bookingId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Booking"
        message="Are you sure you want to delete this booking? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
        message={toast.message}
        type={toast.type}
        duration={3000}
      />

      {/* Calendar Export Modal */}
      <CalendarExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        booking={selectedBooking}
      />
    </>
  );
}

export default BookingStatus;
