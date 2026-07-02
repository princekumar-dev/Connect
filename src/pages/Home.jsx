
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isMobilePlaceholder, setIsMobilePlaceholder] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobilePlaceholder(mq.matches)
    update()
    if (mq.addEventListener) mq.addEventListener('change', update)
    else mq.addListener(update)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update)
      else mq.removeListener(update)
    }
  }, [])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setIsSearching(true)
      const query = searchQuery.trim().toLowerCase()
      
      try {
        // Fetch both venues and events to determine which has results
        const [venuesResponse, eventsResponse] = await Promise.all([
          fetch('/api/venues'),
          fetch('/api/events')
        ])
        
        const venuesData = await venuesResponse.json()
        const eventsData = await eventsResponse.json()
        
        // Check for matches in venues
        const venueMatches = venuesData.success ? 
          venuesData.venues.filter(venue => 
            (venue.venue || '').toLowerCase().includes(query)
          ).length : 0
        
        // Check for matches in events
        const eventMatches = eventsData.success ?
          eventsData.events.filter(event =>
            (event.title || '').toLowerCase().includes(query) ||
            (event.description || '').toLowerCase().includes(query) ||
            (event.venue || '').toLowerCase().includes(query) ||
            (event.eventType || '').toLowerCase().includes(query)
          ).length : 0
        
        // Navigate to page with most results, default to events if equal
        if (eventMatches > venueMatches) {
          navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`)
        } else if (venueMatches > 0) {
          navigate(`/venues?search=${encodeURIComponent(searchQuery.trim())}`)
        } else {
          // If no results in either, default to events
          navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`)
        }
      } catch (error) {
        console.error('Search error:', error)
        // Default to events on error
        navigate(`/events?search=${encodeURIComponent(searchQuery.trim())}`)
      } finally {
        setIsSearching(false)
      }
    }
  }

  return (
    <div className="home-page-shell min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 no-mobile-anim">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-1 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="mb-12">
            <div
              className="glass-card no-mobile-backdrop home-hero relative flex min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] flex-col gap-6 sm:gap-8 bg-cover bg-center bg-no-repeat items-center justify-center p-6 sm:p-8 lg:p-12 overflow-hidden rounded-3xl"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.3) 50%, rgba(0, 0, 0, 0.5) 100%), url("/images/campus.webp")`
              }}
            >
              <div className="flex flex-col gap-4 text-center px-4 sm:px-6 max-w-4xl">
                <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight tracking-tight drop-shadow-2xl" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0px 0px 8px rgba(0,0,0,0.5)'}}>
                  Find the Perfect Venue for Your Event
                </h1>
                <p className="text-white text-base sm:text-lg md:text-xl font-medium leading-relaxed drop-shadow-xl max-w-3xl mx-auto" style={{textShadow: '1px 1px 3px rgba(0,0,0,0.8), 0px 0px 6px rgba(0,0,0,0.4)'}}>
                  Discover a wide range of seminar halls and auditoriums at MSEC. Book your ideal space with ease and create memorable events.
                </p>
              </div>
              
              {/* Enhanced Search Bar */}
              <div className="w-full max-w-[304px] sm:max-w-2xl mx-auto">
                <form onSubmit={handleSearch} className="flex w-full">
                  <div className="glass-card no-mobile-backdrop flex w-full items-center overflow-hidden rounded-2xl shadow-2xl">
                    <div className="text-gray-500 flex h-10 sm:h-16 w-9 sm:w-14 flex-shrink-0 items-center justify-center pl-2 sm:pl-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" className="sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 256 256">
                        <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isMobilePlaceholder ? 'Venues or Events' : 'Search for Venues or Events'}
                      className="h-10 sm:h-16 flex w-full min-w-0 flex-1 resize-none overflow-hidden text-gray-900 focus:outline-0 focus:ring-0 placeholder:text-gray-500 px-1 sm:px-4 text-[13px] sm:text-base md:text-lg font-medium leading-normal border-0 bg-transparent"
                    />
                    <div className="flex h-10 sm:h-16 flex-shrink-0 items-center justify-center pr-1.5 sm:pr-3">
                      <button type="submit" disabled={isSearching} className="flex min-w-[76px] sm:min-w-[100px] cursor-pointer items-center justify-center overflow-hidden h-8 sm:h-12 md:h-14 px-3 sm:px-6 text-[13px] sm:text-base md:text-lg text-blue-600 font-bold leading-normal tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent hover:bg-white/20 rounded-xl">
                        <span className="truncate">{isSearching ? 'Searching...' : 'Search'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          
          {/* Featured Venues Section */}
          <div className="mb-12">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-blue-700 text-xs sm:text-sm font-semibold shadow-sm mb-4">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Search-ready venue catalog
                </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 mb-4">
                Featured Venues
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Choose from our premium venues equipped with state-of-the-art facilities
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mobile-gap-4 tablet-gap-6 desktop-gap-8">
            <Link to="/book?hall=KRS Seminar Hall" className="perf-card glass-card no-mobile-backdrop group flex flex-col gap-4 p-4 sm:p-6 cursor-pointer hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl mobile-card tablet-card desktop-card desktop-hover">
              <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2rlCnsNR-UIxfZ0nNZolyZ43Pyr4wbO3p6NjlpiLcJqfGo4-6gywzRYgebe49V5NLwYHKio1Km-Wm99VwrDV1atwmIi5CrG_NoZMLX_mOH0HD9VwWVFl_PnDlKZ-9_bbDRy9c5ShrVvy5AbRl17CpKHWGqhjEL0ZXbxjUxbOJ8SiuOQeAukJFr3x1gLhm1WRWsXdHPPyiwoQd7XTFKWqEdUAbI9MEMfyncRv5LUas-pLcJZZcHHNDctfcn7STh3vvCPgGf2Dyh70"
                  alt="KRS Seminar Hall"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-center">
                <h3 className="text-gray-900 text-lg sm:text-xl font-bold leading-tight mb-2">KRS Seminar Hall</h3>
                <p className="text-gray-600 text-sm font-medium mb-2">Capacity: 200</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Audio System</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Stage</span>
                </div>
              </div>
            </Link>
            
            <Link to="/book?hall=Civil Seminar Hall" className="perf-card glass-card no-mobile-backdrop group flex flex-col gap-4 p-4 sm:p-6 cursor-pointer hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl mobile-card tablet-card desktop-card desktop-hover">
              <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjgOsL-A_REeuufLssM9EaibUxhAZgBKl8mndnm53aGLmLVH3ziHCXfaaHFugP5IVhumadYGjM2GpR-ekOidyzzDYktalRt85wVVvr8wSjrcWZmHSNEHHba6b2gnG_fOqK1DAcocBkPjyB0yvSE31LvjRIlfH70Huu7uI_2JEmB5mXeljDeCwb4_W_HgN5gR2K3Q10NDtl3mytzYbVk3TT2tgpDz1JYfismI5NVzR5tQe17C92ex_uKr6YT3BHaAoxQ5j7ns8FpKs"
                  alt="Civil Seminar Hall"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-center">
                <h3 className="text-gray-900 text-lg sm:text-xl font-bold leading-tight mb-2">Civil Seminar Hall</h3>
                <p className="text-gray-600 text-sm font-medium mb-2">Capacity: 150</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">Department Hall</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Audio System</span>
                </div>
              </div>
            </Link>
            
            <Link to="/book?hall=ECE Seminar Hall" className="perf-card glass-card no-mobile-backdrop group flex flex-col gap-4 p-4 sm:p-6 cursor-pointer hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl mobile-card tablet-card desktop-card desktop-hover">
              <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmDbqEQHXUH4wr8OzixBFXpS311YEI7jTQw9LcPA6te44iHZk46T583WS6nm3l5zDharhmzGVglc4xwDju3sEe4FE6wQA-z7MLQc1B4_Q9DSYPG2xA8leVU6k2EOq4JRAak99vq2haLa2FjVdvV599Y4A3tBUCFvxp88-iECvOU1RxKXG5E86ClsGMozvxFh9P9OE8GgDALOE1xHDYYUdDastf6SydcfBhft71r62Jwf2KSZcxpWHr9hJTeuAuWwSSfV8li5QdYN0"
                  alt="ECE Seminar Hall"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-center">
                <h3 className="text-gray-900 text-lg sm:text-xl font-bold leading-tight mb-2">ECE Seminar Hall</h3>
                <p className="text-gray-600 text-sm font-medium mb-2">Capacity: 150</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Smart Board</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Audio System</span>
                </div>
              </div>
            </Link>
            
            <Link to="/book?hall=MS Auditorium" className="perf-card glass-card no-mobile-backdrop group flex flex-col gap-4 p-4 sm:p-6 cursor-pointer hover:scale-105 hover:shadow-2xl transition-all duration-300 rounded-2xl mobile-card tablet-card desktop-card desktop-hover">
              <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDd8eFSd1-5Wu-7D4PPy3b2KZOeSg2q68ctGvHwSBihGwh-mDrb_xUaQoBNnffDYf1eNzlFp8xlvxhQ05eVsly3b4HNtvn9pKvcyvKV6bu_SNe_HHT17IRLd-67WeadUpB2wntrcLItcpe4TnrgzE9yaI36fTrdx7EbD8N9BCpverP68hnL0LFsOivIdqZxdeM1KtQARdHNqbR00tVzKB66MfxgNnL_xJ2hqEJve-C-xZQerh0VVvbHdULnneqg2iJZiamHDYL1EtU"
                  alt="MS Auditorium"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-center">
                <h3 className="text-gray-900 text-lg sm:text-xl font-bold leading-tight mb-2">MS Auditorium</h3>
                <p className="text-gray-600 text-sm font-medium mb-2">Capacity: 500</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">Main Auditorium</span>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Stage</span>
                </div>
              </div>
            </Link>
            </div>
          </div>
          
          {/* Contact Us Section */}
          <div className="mb-6 sm:mb-12">
            <div className="glass-card no-mobile-backdrop p-8 text-center rounded-3xl">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4">Get in Touch</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Have questions or need assistance? Our team is here to help you create the perfect event experience.
              </p>
              <Link to="/contact" className="glass-button inline-flex items-center gap-3 px-8 py-4 text-blue-600 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
