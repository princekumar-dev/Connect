import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog, Toast } from '../components/NotificationModal'
import RefreshButton from '../components/RefreshButton'
import { showNotification } from '../utils/notifications'
import { BookingListSkeleton } from '../components/Skeleton'
import { authFetch } from '../utils/api'

function Bookings() {
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isConnected, setIsConnected] = useState(null) // null = checking, true = connected, false = failed
  const [updatingIds, setUpdatingIds] = useState(new Set())
  const navigate = useNavigate()
  
  // Notification states
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, bookingId: null })
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' })
  
  const statusOptions = ['pending', 'approved', 'rejected', 'cancelled']
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  }
  const statusIcons = {
    pending: '⏳',
    approved: '✅',
    rejected: '⛔',
    cancelled: '❌'
  }

  useEffect(() => {
    // Check if user is admin - this page is only for admins
    const authData = localStorage.getItem('auth')
    const isLoggedInData = localStorage.getItem('isLoggedIn')
    
    if (authData) {
      try {
        const parsedAuth = JSON.parse(authData)
        // Only actual admins can access this page, not principal/secretary
        if (parsedAuth.email && (parsedAuth.role === 'admin' || parsedAuth.role === 'principal' || parsedAuth.role === 'secretary' || parsedAuth.email === 'admin@msec.edu.in')) {
          const email = parsedAuth.email
          setUserEmail(email)
          setIsAdmin(true)
          fetchAllBookings(email)
          return
        } else {
          // Not admin, redirect to booking status (their own bookings)
          navigate('/booking-status')
          return
        }
      } catch (error) {
        console.error('Error parsing auth data:', error)
        // Fallback to old auth system
        if (isLoggedInData === 'true') {
          const role = localStorage.getItem('userRole')
          if (role === 'admin') {
            const email = localStorage.getItem('userEmail')
            setUserEmail(email || '')
            setIsAdmin(true)
            fetchAllBookings(email || '')
            return
          } else {
            navigate('/booking-status')
            return
          }
        }
      }
    }
    
    if (isLoggedInData) {
      const role = localStorage.getItem('userRole')
      if (role === 'admin') {
        const email = localStorage.getItem('userEmail')
        setUserEmail(email || '')
        setIsAdmin(true)
        fetchAllBookings(email || '')
        return
      } else {
        navigate('/booking-status')
        return
      }
    }
    
    // If no valid authentication found, redirect to login
    navigate('/login')
  }, [navigate])

  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        const response = await authFetch('/api/debug', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        if (response.ok) {
          console.log('Server connection: Success')
          setIsConnected(true)
        } else {
          console.log('Server connection: Failed with status', response.status)
          setIsConnected(false)
        }
      } catch (error) {
        console.error('Server connection error:', error)
        setIsConnected(false)
        // Retry connection after 2 seconds
        setTimeout(() => {
          checkServerConnection()
        }, 2000)
      }
    }
    
    if (userEmail) {
      checkServerConnection()
    }
  }, [userEmail])

  const fetchAllBookings = async (emailOverride = userEmail) => {
    try {
      const response = await authFetch('/api/bookings', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'userEmail': emailOverride,
          'isAdmin': 'true' // This tells the API to return ALL bookings
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setBookings(data.bookings || [])
        setLastUpdated(new Date())
        setIsConnected(true)
      } else {
        console.error('Failed to fetch bookings:', data.error)
        setBookings([])
        setIsConnected(false)
        setToast({ isOpen: true, message: `Error: ${data.error}`, type: 'error' })
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setBookings([])
      setIsConnected(false)
      
      // Show user-friendly error message
      if (error.message.includes('Failed to fetch')) {
        setToast({ isOpen: true, message: 'Cannot connect to server. Please check if the backend is running.', type: 'error' })
      } else {
        setToast({ isOpen: true, message: 'Failed to load bookings. Please try again.', type: 'error' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const updateBookingStatus = async (bookingId, newStatus) => {
    // Prevent duplicate updates
    setUpdatingIds(prev => new Set(prev).add(bookingId))
    try {
      const response = await authFetch('/api/bookings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'userEmail': userEmail,
          'isAdmin': 'true'
        },
        body: JSON.stringify({
          bookingId,
          status: newStatus
        })
      })
      const data = await response.json()
      
      if (data.success) {
        setBookings(bookings.map(booking => 
          booking._id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        ))
        setLastUpdated(new Date())
        setIsConnected(true)
        let movedMessage = ''
        if (data.reassignment && data.reassignment.action === 'reassigned') {
          movedMessage = ` Previous booking moved to ${data.reassignment.newVenue}.`
        } else if (data.reassignment && data.reassignment.action === 'cancelled') {
          movedMessage = ' Previous booking was cancelled because no suitable venue was available.'
        }
        setToast({ isOpen: true, message: `Booking ${newStatus} successfully!${movedMessage}`, type: 'success' })
  // trigger immediate browser notification + cross-tab updates
  try { showNotification(`Booking ${newStatus}`, { body: `Booking ${bookingId} was ${newStatus}` }) } catch (e) {}
        // notify other tabs/pages that bookings updated
        try {
          const stamp = Date.now().toString()
          localStorage.setItem('bookings-updated', stamp)
        } catch (e) {
          // ignore
        }
        try {
          window.dispatchEvent(new CustomEvent('bookings:updated', { detail: { bookingId, status: newStatus } }))
        } catch (e) {}
        // broadcast via BroadcastChannel if available for immediate cross-tab delivery
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('bookings')
            bc.postMessage({ bookingId, status: newStatus })
            bc.close()
          }
        } catch (e) {}
      } else {
        console.error('Failed to update booking status:', data.error)
        setIsConnected(false)
        setToast({ isOpen: true, message: `Error: ${data.error}`, type: 'error' })
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      setIsConnected(false)
      setToast({ isOpen: true, message: 'Failed to update booking status. Please try again.', type: 'error' })
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(bookingId)
        return next
      })
    }
  }

  const deleteBooking = async (bookingId) => {
    try {
      const response = await authFetch('/api/bookings', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'userEmail': userEmail,
          'isAdmin': 'true'
        },
        body: JSON.stringify({
          bookingId
        })
      })
      const data = await response.json()
      
      if (data.success) {
        setBookings(bookings.filter(booking => booking._id !== bookingId))
        setLastUpdated(new Date())
        setIsConnected(true)
  setToast({ isOpen: true, message: 'Booking deleted successfully!', type: 'success' })
  // notify other tabs and show browser notification
  try { showNotification('Booking deleted', { body: `Booking ${bookingId} was deleted by admin` }) } catch (e) {}
  try { localStorage.setItem('bookings-updated', Date.now().toString()) } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('bookings:updated', { detail: { bookingId, action: 'deleted' } })) } catch (e) {}
  try { if (typeof BroadcastChannel !== 'undefined') { const bc = new BroadcastChannel('bookings'); bc.postMessage({ bookingId, action: 'deleted' }); bc.close(); } } catch(e) {}
      } else {
        console.error('Failed to delete booking:', data.error)
        setIsConnected(false)
        setToast({ isOpen: true, message: `Error: ${data.error}`, type: 'error' })
      }
    } catch (error) {
      console.error('Error deleting booking:', error)
      setIsConnected(false)
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

  const refreshBookings = () => {
    setIsLoading(true)
    setIsConnected(null) // Reset connection status
    fetchAllBookings() // This will also update connection status
  }

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true
    if (filter === 'pending') return booking.status === 'pending'
    if (filter === 'approved') return booking.status === 'approved'
    if (filter === 'rejected') return booking.status === 'rejected' || booking.status === 'cancelled'
    return true
  })

  const getBookingStatus = (booking) => {
    const dateStr = new Date(booking.date).toISOString().slice(0, 10)
    const bookingDateTime = new Date(dateStr + 'T' + (booking.time || '00:00'))
    const isPast = bookingDateTime < new Date()
    
    if (booking.status === 'pending') {
      return { 
        text: 'Pending', 
        class: 'bg-yellow-100 text-yellow-800',
        icon: '⏳',
        description: 'Awaiting approval'
      }
    } else if (booking.status === 'approved') {
      if (isPast) {
        return { 
          text: 'Completed', 
          class: 'bg-blue-100 text-blue-800',
          icon: '✓',
          description: 'Event completed'
        }
      }
      return { 
        text: 'Approved', 
        class: 'bg-green-100 text-green-800',
        icon: '✅',
        description: 'Booking confirmed'
      }
    } else if (booking.status === 'rejected') {
      return { 
        text: 'Rejected', 
        class: 'bg-red-100 text-red-800',
        icon: '⛔',
        description: 'Booking rejected'
      }
    } else if (booking.status === 'cancelled') {
      return { 
        text: 'Cancelled', 
        class: 'bg-gray-100 text-gray-800',
        icon: '❌',
        description: booking.movedReason || 'Booking cancelled'
      }
    }
    return { 
      text: booking.status || 'Unknown', 
      class: 'bg-gray-100 text-gray-800',
      icon: '❓',
      description: 'Status unknown'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // (Spinner removed - color differentiation is sufficient)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 smooth-scroll mobile-smoothest-scroll no-mobile-anim">
      <style>
        {`
          .booking-card {
            background: linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.96) 100%);
            border: 1px solid rgba(226,232,240,0.9);
            transition: all 0.3s ease;
            box-shadow: 0 8px 28px rgba(15,23,42,0.06);
          }
          
          .booking-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 36px rgba(15,23,42,0.1);
          }
          
          .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3d99f5;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="rounded-3xl border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_18px_50px_rgba(15,23,42,0.08)] p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">
                    All Bookings
                  </h1>
                  <p className="text-gray-600 max-w-2xl">
                    Manage and monitor all venue booking requests with live status, priority handling, and fast approvals.
                  </p>
                </div>
              
              {/* Connection Status & Refresh */}
              <div className={`flex items-center gap-3 ${isAdmin ? 'sm:gap-3' : ''} ${isAdmin ? 'w-full sm:w-auto' : ''}`}>
                {isConnected === false && (
                  <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-red-700 border border-red-100">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Server Offline</span>
                  </div>
                )}
                {isConnected === true && (
                  <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-green-700 border border-green-100">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                )}
                {isConnected === null && (
                  <div className="flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-2 text-yellow-700 border border-yellow-100">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm font-medium">Connecting...</span>
                  </div>
                )}
                  <div className={`flex items-center ${isAdmin ? 'ml-auto sm:ml-0' : ''}`}>
                    <RefreshButton isLoading={isLoading} onClick={refreshBookings} />
                  </div>
              </div>
            </div>
          </div>
        </div>

          {/* Filter Buttons */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-white/60 bg-white/75 backdrop-blur-lg p-2 shadow-sm">
              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                    filter === status
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white/80 text-gray-700 hover:bg-white border border-gray-200'
                  }`}
                >
                  {status === 'all' ? 'All Bookings' : status === 'rejected' ? 'Rejected / Cancelled' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {isLoading ? (
              <BookingListSkeleton />
            ) : (
              <>
                {/* Statistics Cards */}
                {bookings.length > 0 && (
                  <>
                    {/* Status Statistics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 p-4 mb-4 rounded-3xl border border-white/60 bg-white/75 backdrop-blur-lg shadow-sm">
                      <div className="bg-blue-50 p-3 sm:p-4 rounded-2xl text-center shadow-sm border border-blue-100">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">{bookings.length}</div>
                        <div className="text-[10px] sm:text-xs text-blue-800 font-medium">Total Bookings</div>
                      </div>
                      <div className="bg-yellow-50 p-3 sm:p-4 rounded-2xl text-center shadow-sm border border-yellow-100">
                        <div className="text-xl sm:text-2xl font-bold text-yellow-600 mb-1">
                          {bookings.filter(b => b.status === 'pending').length}
                        </div>
                        <div className="text-[10px] sm:text-xs text-yellow-800 font-medium">⏳ Pending</div>
                      </div>
                      <div className="bg-green-50 p-3 sm:p-4 rounded-2xl text-center shadow-sm border border-green-100">
                        <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1">
                          {bookings.filter(b => b.status === 'approved').length}
                        </div>
                        <div className="text-[10px] sm:text-xs text-green-800 font-medium">✅ Approved</div>
                      </div>
                      <div className="bg-red-50 p-3 sm:p-4 rounded-2xl text-center shadow-sm border border-red-100">
                        <div className="text-xl sm:text-2xl font-bold text-red-600 mb-1">
                          {bookings.filter(b => b.status === 'rejected' || b.status === 'cancelled').length}
                        </div>
                        <div className="text-[10px] sm:text-xs text-red-800 font-medium">⛔ Rejected / Cancelled</div>
                      </div>
                    </div>

                    {/* Role Distribution */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-4 mb-4 rounded-3xl border border-white/60 bg-white/75 backdrop-blur-lg shadow-sm">
                      <div className="bg-purple-50 p-3 rounded-2xl text-center shadow-sm border border-purple-100">
                        <div className="text-xl font-bold text-purple-600 mb-1">
                          {bookings.filter(b => (b.userRole || '').toLowerCase() === 'admin').length}
                        </div>
                        <div className="text-xs text-purple-800 font-medium">Admin</div>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-2xl text-center shadow-sm border border-indigo-100">
                        <div className="text-xl font-bold text-indigo-600 mb-1">
                          {bookings.filter(b => (b.userRole || '').toLowerCase() === 'principal').length}
                        </div>
                        <div className="text-xs text-indigo-800 font-medium">Principal</div>
                      </div>
                      <div className="bg-cyan-50 p-3 rounded-2xl text-center shadow-sm border border-cyan-100">
                        <div className="text-xl font-bold text-cyan-600 mb-1">
                          {bookings.filter(b => (b.userRole || '').toLowerCase() === 'secretary').length}
                        </div>
                        <div className="text-xs text-cyan-800 font-medium">Secretary</div>
                      </div>
                      <div className="bg-teal-50 p-3 rounded-2xl text-center shadow-sm border border-teal-100">
                        <div className="text-xl font-bold text-teal-600 mb-1">
                          {bookings.filter(b => {
                            const r = (b.userRole || 'staff').toLowerCase()
                            return !['admin', 'principal', 'secretary'].includes(r)
                          }).length}
                        </div>
                        <div className="text-xs text-teal-800 font-medium">Staff</div>
                      </div>
                    </div>
                  </>
                )}

                {/* Bookings List */}
                <div className="space-y-4">
                  {filteredBookings.length === 0 ? (
                    <div className="glass-card no-mobile-backdrop p-12 text-center rounded-3xl border border-white/70 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                      <div className="text-6xl mb-4">📅</div>
                      <h3 className="text-xl font-bold text-gray-700 mb-2">
                        {filter === 'all' 
                          ? 'No bookings found' 
                          : `No ${filter} bookings found`
                        }
                      </h3>
                      <p className="text-gray-600 mb-6">
                        {filter === 'all' 
                          ? 'No users have made any venue booking requests yet.' 
                          : `No ${filter} booking requests found.`
                        }
                      </p>
                      {filter !== 'all' && (
                        <button 
                          onClick={() => setFilter('all')}
                          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                        >
                          View All Bookings
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredBookings.map((booking, index) => {
                      const status = getBookingStatus(booking)
                      const isUpdating = updatingIds.has(booking._id)
                      
                      return (
                        <div key={booking._id || index} className="booking-card rounded-2xl p-4 sm:p-6">
                          {/* Mobile status badge - top right */}
                          <div className="flex justify-between items-start mb-2 sm:hidden">
                            <h3 className="text-lg font-bold text-[#111418] break-words flex-1">
                              {booking.venue || 'Venue'}
                            </h3>
                            <div className="flex flex-col items-end gap-2">
                              <div className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase ${status.class} flex items-center gap-1`} title={status.description}>
                                <span>{status.icon}</span>
                                <span>{status.text}</span>
                              </div>
                              {booking.userRole && (
                                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {booking.userRole}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Desktop layout */}
                          <div className="hidden sm:block">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-[#111418] mb-2">
                                  {booking.venue || 'Venue'}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>📅 {formatDate(booking.date)}</span>
                                  <span>🕐 {booking.time || 'Time not specified'}</span>
                                  <span>👤 {booking.organizer || booking.userEmail || 'Unknown user'}</span>
                                  {booking.userRole && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                      {booking.userRole}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={`px-4 py-2 rounded-full text-sm font-semibold uppercase ${status.class} flex items-center gap-2`} title={status.description}>
                                  <span>{status.icon}</span>
                                  <span>{status.text}</span>
                                </div>
                                {['pending','approved','rejected'].includes(booking.status) && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => updateBookingStatus(booking._id, 'approved')}
                                      disabled={isUpdating || booking.status === 'approved'}
                                      aria-disabled={isUpdating || booking.status === 'approved'}
                                      className={`px-3 py-1 text-white text-sm rounded-xl font-medium transition-all flex items-center gap-2 ${isUpdating || booking.status === 'approved' ? 'bg-green-400 opacity-80 cursor-not-allowed ring-0' : 'bg-green-600 hover:bg-green-700 shadow-sm ring-1 ring-green-300'}`}
                                    >
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      onClick={() => updateBookingStatus(booking._id, 'rejected')}
                                      disabled={isUpdating || booking.status === 'rejected'}
                                      aria-disabled={isUpdating || booking.status === 'rejected'}
                                      className={`px-3 py-1 text-white text-sm rounded-xl font-medium transition-all flex items-center gap-2 ${isUpdating || booking.status === 'rejected' ? 'bg-red-400 opacity-80 cursor-not-allowed ring-0' : 'bg-red-600 hover:bg-red-700 shadow-sm ring-1 ring-red-300'}`}
                                    >
                                      <span>Reject</span>
                                    </button>
                                  </div>
                                )}
                                <button
                                  onClick={() => handleDeleteClick(booking._id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                  title="Delete booking"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Mobile layout details */}
                          <div className="sm:hidden space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 text-xs font-medium mb-1">Date</p>
                                <p className="text-[#111418] font-medium">{formatDate(booking.date)}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs font-medium mb-1">Time</p>
                                <p className="text-[#111418] font-medium">{booking.time || 'Not specified'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs font-medium mb-1">User</p>
                                <p className="text-[#111418] font-medium text-xs break-words">{booking.organizer || booking.userEmail || 'Unknown user'}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 text-xs font-medium mb-1">Actions</p>
                                <div className="flex gap-1">
                                  {['pending','approved','rejected'].includes(booking.status) && (
                                    <>
                                      <button
                                        onClick={() => updateBookingStatus(booking._id, 'approved')}
                                        disabled={isUpdating || booking.status === 'approved'}
                                        aria-disabled={isUpdating || booking.status === 'approved'}
                                        className={`px-2 py-1 text-white text-xs rounded font-medium transition-all flex items-center justify-center ${isUpdating || booking.status === 'approved' ? 'bg-green-400 opacity-80 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-sm'}`}
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={() => updateBookingStatus(booking._id, 'rejected')}
                                        disabled={isUpdating || booking.status === 'rejected'}
                                        aria-disabled={isUpdating || booking.status === 'rejected'}
                                        className={`px-2 py-1 text-white text-xs rounded font-medium transition-all flex items-center justify-center ${isUpdating || booking.status === 'rejected' ? 'bg-red-400 opacity-80 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-sm'}`}
                                      >
                                          ✗
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleDeleteClick(booking._id)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium transition-colors"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Booking Details */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm items-start">
                              <div>
                                <p className="text-gray-500 text-xs font-medium mb-1">Purpose</p>
                                <p className="text-[#111418] font-medium">{booking.purpose || 'Not specified'}</p>
                              </div>

                              <div>
                                <p className="text-gray-500 text-xs font-medium mb-1">Expected Attendees</p>
                                <p className="text-[#111418] font-medium">{booking.expectedAttendees || booking.attendees || 'Not specified'}</p>
                              </div>

                              <div>
                                <p className="text-gray-500 text-xs font-medium mb-1">Contact</p>
                                <p className="text-[#111418] font-medium">{booking.email || booking.contactNumber || booking.organizer || 'Not provided'}</p>
                              </div>

                              <div>
                                <p className="text-gray-500 text-xs font-medium mb-1">Category</p>
                                <p className="text-[#111418] font-medium">{booking.purposeCategory || 'Uncategorized'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
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
    </div>
  )
}

export default Bookings
