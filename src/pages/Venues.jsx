import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import VenueCalendar from '../components/VenueCalendar'
import CalendarExportModal from '../components/CalendarExportModal'

const STATUS_STYLES = {
  available: {
    overlayClass: 'bg-green-500/90 text-white',
    inlineClass: 'bg-green-100 text-green-700',
    dotClass: 'bg-green-500',
    icon: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ),
    label: 'Available'
  },
  occupied: {
    overlayClass: 'bg-red-500/90 text-white',
    inlineClass: 'bg-red-100 text-red-700',
    dotClass: 'bg-red-500',
    icon: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    label: 'Occupied'
  },
  buffer: {
    overlayClass: 'bg-orange-500/90 text-white',
    inlineClass: 'bg-orange-100 text-orange-700',
    dotClass: 'bg-orange-500',
    icon: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3a1 1 0 00.293.707l2 2a1 1 0 101.414-1.414L11 9.586V7z" clipRule="evenodd" />
      </svg>
    ),
    label: 'Buffer Time'
  }
}

function getStatusMeta(status, statusMessage) {
  const normalizedStatus = STATUS_STYLES[status] ? status : 'available'
  const styles = STATUS_STYLES[normalizedStatus]

  return {
    ...styles,
    status: normalizedStatus,
    fullLabel: statusMessage || styles.label
  }
}

const Venues = () => {
  const [venues, setVenues] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredVenues = useMemo(() => {
    if (!normalizedSearch) return venues
    return venues.filter((venue) => venue.venue.toLowerCase().includes(normalizedSearch))
  }, [venues, normalizedSearch])

  // Defensive reset: some overlays on other routes lock body scroll.
  // Ensure Venues always starts with normal document scrolling.
  useEffect(() => {
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
    document.body.style.top = ''
    document.body.style.overflow = ''

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }
  }, [])

  // Venue images mapping
  const venueImages = {
    'KRS Seminar Hall': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2rlCnsNR-UIxfZ0nNZolyZ43Pyr4wbO3p6NjlpiLcJqfGo4-6gywzRYgebe49V5NLwYHKio1Km-Wm99VwrDV1atwmIi5CrG_NoZMLX_mOH0HD9VwWVFl_PnDlKZ-9_bbDRy9c5ShrVvy5AbRl17CpKHWGqhjEL0ZXbxjUxbOJ8SiuOQeAukJFr3x1gLhm1WRWsXdHPPyiwoQd7XTFKWqEdUAbI9MEMfyncRv5LUas-pLcJZZcHHNDctfcn7STh3vvCPgGf2Dyh70',
    'Civil Seminar Hall': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDjgOsL-A_REeuufLssM9EaibUxhAZgBKl8mndnm53aGLmLVH3ziHCXfaaHFugP5IVhumadYGjM2GpR-ekOidyzzDYktalRt85wVVvr8wSjrcWZmHSNEHHba6b2gnG_fOqK1DAcocBkPjyB0yvSE31LvjRIlfH70Huu7uI_2JEmB5mXeljDeCwb4_W_HgN5gR2K3Q10NDtl3mytzYbVk3TT2tgpDz1JYfismI5NVzR5tQe17C92ex_uKr6YT3BHaAoxQ5j7ns8FpKs',
    'ECE Seminar Hall': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmDbqEQHXUH4wr8OzixBFXpS311YEI7jTQw9LcPA6te44iHZk46T583WS6nm3l5zDharhmzGVglc4xwDju3sEe4FE6wQA-z7MLQc1B4_Q9DSYPG2xA8leVU6k2EOq4JRAak99vq2haLa2FjVdvV599Y4A3tBUCFvxp88-iECvOU1RxKXG5E86ClsGMozvxFh9P9OE8GgDALOE1xHDYYUdDastf6SydcfBhft71r62Jwf2KSZcxpWHr9hJTeuAuWwSSfV8li5QdYN0',
    'MS Auditorium': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDd8eFSd1-5Wu-7D4PPy3b2KZOeSg2q68ctGvHwSBihGwh-mDrb_xUaQoBNnffDYf1eNzlFp8xlvxhQ05eVsly3b4HNtvn9pKvcyvKV6bu_SNe_HHT17IRLd-67WeadUpB2wntrcLItcpe4TnrgzE9yaI36fTrdx7EbD8N9BCpverP68hnL0LFsOivIdqZxdeM1KtQARdHNqbR00tVzKB66MfxgNnL_xJ2hqEJve-C-xZQerh0VVvbHdULnneqg2iJZiamHDYL1EtU'
  }

  const venueFeatures = {
    'KRS Seminar Hall': ['Audio System', 'Stage', 'Main Auditorium', 'Projector'],
    'Civil Seminar Hall': ['Department Hall', 'Audio System', 'Projector'],
    'ECE Seminar Hall': ['Technical Equipment', 'Audio System', 'Smart Board'],
    'MS Auditorium': ['Multi-Purpose Hall', 'Audio System', 'Stage', 'Large Capacity']
  }

  // Load venues
  useEffect(() => {
    let intervalId

    const loadVenues = async ({ showLoader = false } = {}) => {
      try {
        if (showLoader) {
          setLoading(true)
        }

        const response = await fetch('/api/venues')
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load venues')
        }

        const liveVenues = (data.venues || []).map((venue) => ({
          ...venue,
          features: venueFeatures[venue.venue] || []
        }))

        setVenues(liveVenues)
      } catch (error) {
        console.error('Error loading venues:', error)
        setVenues([])
      } finally {
        if (showLoader) {
          setLoading(false)
        }
      }
    }

    loadVenues({ showLoader: true })

    intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadVenues()
      }
    }, 30000)

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [])
  // URL search params and local input state
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState('')

  // Initialize search state from URL params
  useEffect(() => {
    const q = searchParams.get('search') || ''
    setSearchQuery(q)
    setSearchInput(q)
  }, [searchParams])

  // Debounce local input -> update searchQuery and URL
  useEffect(() => {
    const handler = setTimeout(() => {
      const q = (searchInput || '').trim()
      if (q) {
        setSearchQuery(q)
        setSearchParams({ search: q })
      } else {
        setSearchQuery('')
        setSearchParams({})
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [searchInput])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const q = (searchInput || '').trim()
    if (q) {
      setSearchParams({ search: q })
      setSearchQuery(q)
    } else {
      setSearchParams({})
      setSearchQuery('')
    }
  }

  // Modal handlers
  const open360Video = (venue) => {
    setSelectedVenue(venue)
    setShowVideoModal(true)
  }

  const close360Video = () => {
    setShowVideoModal(false)
    setSelectedVenue(null)
  }

  const openCalendarModal = (venue) => {
    setSelectedVenue(venue)
    setShowCalendarModal(true)
  }

  const closeCalendarModal = () => {
    setShowCalendarModal(false)
    setSelectedVenue(null)
  }

  const handleDateSelect = (date) => {
    console.log('Selected date:', date)
    // Handle date selection logic here
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center smooth-scroll mobile-smoothest-scroll no-mobile-anim">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading venues...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 smooth-scroll mobile-smoothest-scroll no-mobile-anim">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Available Venues'}
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {searchQuery 
                  ? `Found ${filteredVenues.length} venue${filteredVenues.length !== 1 ? 's' : ''} matching your search.`
                  : 'Discover our premium venues with state-of-the-art facilities. Book your perfect space for any event.'
                }
              </p>
              {searchQuery && (
                <Link 
                  to="/venues" 
                  className="inline-flex items-center gap-2 mt-6 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Clear search and show all venues
                </Link>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex justify-center mb-8">
              <div className="relative max-w-md w-full">
                <form onSubmit={handleSearchSubmit} className="glass-card no-mobile-backdrop flex w-full flex-1 items-stretch h-full overflow-hidden rounded-2xl shadow-2xl">
                  <div className="flex items-center justify-center pl-4 sm:pl-6">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search venues..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-gray-900 focus:outline-0 focus:ring-0 h-full placeholder:text-gray-500 px-3 sm:px-4 text-sm sm:text-base md:text-lg font-medium leading-normal border-0 bg-transparent mobile-form-input tablet-form-input desktop-form-input"
                  />
                  
                </form>
              </div>
            </div>
          </div>

          {/* Venues Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mobile-gap-4 tablet-gap-6 desktop-gap-8">
            {filteredVenues.length === 0 ? (
              <div className="col-span-full">
                <div className="glass-card no-mobile-backdrop p-12 text-center mobile-smoothest-scroll">
                  <div className="text-6xl mb-4">🏛️</div>
                  <h3 className="heading-md text-xl text-gray-700 mb-2">
                    {searchQuery ? 'No venues found' : 'No venues available'}
                  </h3>
                  <p className="text-secondary mb-6">
                    {searchQuery ? 'No venues match your search criteria.' : 'No venues are currently available for booking.'}
                  </p>
                  {searchQuery && (
                    <Link 
                      to="/venues" 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      View all venues
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              filteredVenues.map((venue) => {
                const statusMeta = getStatusMeta(venue.status, venue.statusMessage)

                return (
                <div 
                  key={venue.venue} 
                  className="perf-card glass-card no-mobile-backdrop group hover:scale-[1.02] transition-all duration-300 overflow-hidden mobile-card tablet-card desktop-card desktop-hover mobile-smoothest-scroll mobile-venue-card"
                >
                  {/* Venue Image Gallery */}
                  <div className="relative h-48 sm:h-56 overflow-hidden rounded-t-2xl">
                    {venueImages[venue.venue] ? (
                      <img
                        src={venueImages[venue.venue]}
                        alt={venue.venue}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-48 sm:h-56 object-cover rounded-t-2xl"
                        style={{ display: 'block' }}
                      />
                    ) : (
                      <div className="h-48 sm:h-56 bg-gradient-to-br from-blue-100 to-blue-200 rounded-t-2xl flex items-center justify-center">
                        <div className="text-center px-4">
                          <div className="text-3xl sm:text-4xl mb-2">🏛️</div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-700">{venue.venue}</h3>
                        </div>
                      </div>
                    )}
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`inline-flex max-w-[220px] items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${statusMeta.overlayClass}`}>
                        {statusMeta.icon}
                        <span className="truncate">{statusMeta.label}</span>
                      </span>
                    </div>
                    
                    {/* Venue Title Overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="heading-lg text-2xl text-white drop-shadow-lg mb-1">{venue.venue}</h3>
                      <p className="text-white/90 text-sm drop-shadow-lg">Capacity: {venue.capacity} people</p>
                    </div>
                  </div>

                  {/* Venue Details */}
                  <div className="p-6 space-y-4">
                    {/* Capacity & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-secondary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-sm font-medium">{venue.capacity} people</span>
                      </div>
                      <div className="text-right">
                        <span
                          title={statusMeta.fullLabel}
                          className={`inline-flex max-w-[240px] items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.inlineClass}`}
                        >
                          <div className={`h-2 w-2 rounded-full ${statusMeta.dotClass}`}></div>
                          <span className="truncate">{statusMeta.fullLabel}</span>
                        </span>
                      </div>
                    </div>

                    {/* Venue Features */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Features</h4>
                      <div className="flex flex-wrap gap-2">
                        {venue.features.map((feature, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Best Suited For */}
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-1">Best suited for</h5>
                          <p className="text-sm text-secondary">
                            {venue.capacity <= 100 ? 'Small meetings, workshops, seminars' :
                             venue.capacity <= 200 ? 'Medium events, departmental programs' :
                             venue.capacity <= 300 ? 'Large conferences, cultural events' :
                             'Major events, convocations, large gatherings'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => open360Video(venue.venue)}
                        className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Explore</span>
                      </button>
                      
                      <button
                        onClick={() => openCalendarModal(venue.venue)}
                        className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Calendar</span>
                      </button>
                      
                      <Link
                        to={`/book?hall=${encodeURIComponent(venue.venue)}`}
                        className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg col-span-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Book Now</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )})
            )}
          </div>
        </div>
      </div>

      {/* 360° Video Modal */}
      {showVideoModal && selectedVenue && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">360° Virtual Tour - {selectedVenue}</h2>
              <button
                onClick={close360Video}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎥</div>
                <p className="text-gray-600 mb-4">360° Virtual Tour Coming Soon</p>
                <p className="text-sm text-gray-500">Interactive venue exploration will be available soon</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Venue Calendar Modal */}
      {showCalendarModal && selectedVenue && (
  <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm no-mobile-backdrop flex items-center justify-center z-50 p-4">
          <div className="glass-modal rounded-2xl p-4 sm:p-6 max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Availability Calendar - {selectedVenue}</h2>
              <button
                onClick={closeCalendarModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <VenueCalendar 
              venueName={selectedVenue}
              onDateSelect={handleDateSelect}
            />
          </div>
        </div>
      )}

      {/* Calendar Export Modal */}
      <CalendarExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        booking={selectedBooking}
      />
    </div>
  )
}

export default Venues
