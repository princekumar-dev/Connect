import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmDialog, Toast } from '../components/NotificationModal'
import { PageSkeleton } from '../components/Skeleton'
import { showAppToast } from '../utils/feedback'
import * as XLSX from 'xlsx'

function Events() {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const addButtonRef = useRef(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    eventType: '',
    image: null
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(searchQuery)

  // Keep local input synced with URL param
  useEffect(() => {
    setSearchInput(searchQuery)
  }, [searchQuery])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const q = (searchInput || '').trim()
    if (q) setSearchParams({ search: q })
    else setSearchParams({})
  }

  // Debounce input -> update URL/searchQuery so filtering is live
  useEffect(() => {
    const handler = setTimeout(() => {
      const q = (searchInput || '').trim()
      if (q) setSearchParams({ search: q })
      else setSearchParams({})
    }, 300)
    return () => clearTimeout(handler)
  }, [searchInput])
  const [isImporting, setIsImporting] = useState(false)
  const [userRole, setUserRole] = useState('')
  
  // Notification states
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, eventId: null })
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' })

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredEvents = useMemo(() => {
    if (!normalizedSearch) return events

    return events.filter((event) => {
      const title = (event.title || '').toLowerCase()
      const description = (event.description || '').toLowerCase()
      const venue = (event.venue || '').toLowerCase()
      const eventType = (event.eventType || '').toLowerCase()

      return (
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        venue.includes(normalizedSearch) ||
        eventType.includes(normalizedSearch)
      )
    })
  }, [events, normalizedSearch])

  // Function to get default image based on event type
  const getDefaultEventImage = (eventType) => {
    const imageMap = {
      'Workshop': '/images/Workshop.webp',
      'Seminar': '/images/seminar.webp',
      'Conference': '/images/Conference.webp',
      'Alumni Talk': '/images/alumni-talk.webp',
      'Meeting': '/images/meeting.webp',
      'Competition': '/images/Competition.webp',
      'Cultural': '/images/Cultural.webp',
      'Sports': '/images/sports.webp',
      'Other': '/images/others.webp'
    }
    return imageMap[eventType] || '/images/others.webp'
  }

  useEffect(() => {
    fetchEvents()
    checkUserRole()
  }, [])

  const checkUserRole = () => {
    const auth = localStorage.getItem('auth')
    if (auth) {
      try {
        const authData = JSON.parse(auth)
        setUserRole(authData.role || '')
      } catch (error) {
        // Fallback to old auth system
        const role = localStorage.getItem('userRole')
        setUserRole(role || '')
      }
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      const data = await response.json()
      if (data.success) {
        setEvents(data.events)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImageUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', 'venue_images')

    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/your-cloud-name/image/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.secure_url) {
        setFormData(prev => ({
          ...prev,
          image: data.secure_url
        }))
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      showAppToast('Failed to upload image. Please try again.', 'error')
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (data.success) {
        setToast({ isOpen: true, message: 'Event created successfully!', type: 'success' })
        setFormData({
          title: '',
          description: '',
          date: '',
          time: '',
          venue: '',
          eventType: '',
          image: null
        })
        setShowForm(false)
        fetchEvents() // Refresh events list
      } else {
        setToast({ isOpen: true, message: `Error: ${data.error}`, type: 'error' })
      }
    } catch (error) {
      console.error('Error creating event:', error)
      setToast({ isOpen: true, message: 'Failed to create event. Please try again.', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (eventId) => {
    try {
      const response = await fetch('/api/events', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ eventId })
      })

      const data = await response.json()
      
      if (data.success) {
        setToast({ isOpen: true, message: 'Event deleted successfully!', type: 'success' })
        fetchEvents() // Refresh events list
      } else {
        setToast({ isOpen: true, message: `Error: ${data.error}`, type: 'error' })
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      setToast({ isOpen: true, message: 'Failed to delete event. Please try again.', type: 'error' })
    }
  }

  const handleExcelImport = (e) => {
    const file = e.target.files[0]
    if (!file) return

    console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size)

    setIsImporting(true)
    const reader = new FileReader()

    reader.onerror = (error) => {
      console.error('FileReader error:', error)
      setToast({ 
        isOpen: true, 
        message: 'Failed to read file. Please try again.', 
        type: 'error' 
      })
      setIsImporting(false)
      e.target.value = ''
    }

    reader.onload = async (event) => {
      try {
        console.log('File loaded, size:', event.target.result.byteLength)
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        console.log('Workbook read, sheets:', workbook.SheetNames)
        
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        console.log('Parsed rows:', jsonData.length)
        console.log('Sample data:', jsonData[0])

        // Validate and format the data
        const eventsToImport = jsonData.map(row => ({
          title: row.title || row.Title || '',
          description: row.description || row.Description || '',
          date: row.date || row.Date || '',
          time: row.time || row.Time || '',
          venue: row.venue || row.Venue || '',
          eventType: row.eventType || row.EventType || row['Event Type'] || '',
          image: row.image || row.Image || null
        })).filter(event => event.title && event.date && event.venue)

        if (eventsToImport.length === 0) {
          setToast({ 
            isOpen: true, 
            message: 'No valid events found in Excel file. Make sure columns include: title, date, venue', 
            type: 'error' 
          })
          setIsImporting(false)
          return
        }

        // Send bulk import request to backend
        const response = await fetch('/api/events/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ events: eventsToImport })
        })

        const result = await response.json()
        
        if (result.success) {
          setToast({ 
            isOpen: true, 
            message: `Successfully imported ${eventsToImport.length} event${eventsToImport.length !== 1 ? 's' : ''}!`, 
            type: 'success' 
          })
          fetchEvents()
        } else {
          console.error('Import failed:', result)
          setToast({ isOpen: true, message: `Error: ${result.error || 'Unknown error'}`, type: 'error' })
        }
      } catch (error) {
        console.error('Error importing Excel file:', error)
        console.error('Error stack:', error.stack)
        setToast({ 
          isOpen: true, 
          message: `Failed to import Excel file: ${error.message || 'Please check the file format.'}`, 
          type: 'error' 
        })
      } finally {
        setIsImporting(false)
        // Reset file input
        e.target.value = ''
      }
    }

    reader.readAsArrayBuffer(file)
  }

  const downloadSampleExcel = () => {
    // Create sample data
    const sampleData = [
      {
        title: 'Sample Event 1',
        description: 'This is a sample event description',
        date: '2025-10-20',
        time: '10:00',
        venue: 'KRS Seminar Hall',
        eventType: 'Workshop',
        image: 'https://example.com/image.jpg (optional)'
      },
      {
        title: 'Sample Event 2',
        description: 'Another sample event',
        date: '2025-10-25',
        time: '14:00',
        venue: 'MS Auditorium',
        eventType: 'Seminar',
        image: ''
      }
    ]

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Events')

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // title
      { wch: 40 }, // description
      { wch: 12 }, // date
      { wch: 8 },  // time
      { wch: 20 }, // venue
      { wch: 15 }, // eventType
      { wch: 35 }  // image
    ]

    // Download file
    XLSX.writeFile(workbook, 'events_sample_template.xlsx')
  }

  if (isLoading) {
    return <PageSkeleton route="/events" />
  }
  
  const handleDeleteClick = (eventId) => {
    setConfirmDialog({ isOpen: true, eventId })
  }

  const handleDeleteConfirm = () => {
    if (confirmDialog.eventId) {
      handleDelete(confirmDialog.eventId)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 smooth-scroll mobile-smoothest-scroll no-mobile-anim">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
                {searchQuery ? `Search Results for "${searchQuery}"` : userRole === 'admin' ? 'Events Management' : 'Upcoming Events'}
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {searchQuery 
                  ? `Found ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} matching your search.`
                  : userRole === 'admin' ? 'Manage upcoming events and create new ones.' : 'Browse and discover upcoming events at MSEC.'
                }
              </p>
              {searchQuery && (
                <Link to="/events" className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Clear search and show all events
                </Link>
              )}
              {/* Search Bar (styled like Venues) */}
              <div className="flex justify-center mb-8 mt-6">
                <div className="relative max-w-md w-full">
                  <form onSubmit={handleSearchSubmit} className="glass-card no-mobile-backdrop flex items-center rounded-2xl shadow-lg relative mobile-smoothest-scroll">
                    <div className="flex items-center justify-center pl-4 sm:pl-6">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search events..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-gray-900 focus:outline-0 focus:ring-0 h-full placeholder:text-gray-500 px-3 sm:px-4 text-sm sm:text-base md:text-lg font-medium leading-normal border-0 bg-transparent mobile-form-input tablet-form-input desktop-form-input"
                    />
                    
                  </form>
                </div>
              </div>
            </div>
            {/* Admin Controls */}
            {userRole === 'admin' && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <button
                  ref={addButtonRef}
                  onClick={() => setShowForm(!showForm)}
                  className="glass-button flex items-center gap-2 px-6 py-3 text-blue-600 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105"
                  aria-haspopup="dialog"
                  aria-controls="add-event-modal"
                  aria-label="Add event"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {showForm ? 'Cancel' : 'Add Event'}
                </button>
                
                <label className="glass-button flex items-center gap-2 px-6 py-3 text-green-600 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelImport}
                    disabled={isImporting}
                    className="hidden"
                  />
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  {isImporting ? 'Importing...' : 'Import Excel'}
                </label>
                
                <button
                  onClick={downloadSampleExcel}
                  className="glass-button flex items-center gap-2 px-6 py-3 text-gray-600 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105"
                  title="Download sample Excel template"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Template
                </button>
              </div>
            )}
          </div>

        {/* Add Event Form rendered as modal (when admin) */}
        {showForm && (
          <div className="fixed inset-0 z-50 p-4 flex items-center justify-center pt-8 sm:pt-12 lg:pt-16" aria-hidden={!showForm}>
            <div
              onClick={() => {
                setShowForm(false)
                setTimeout(() => addButtonRef.current?.focus(), 0)
              }}
              onMouseDown={() => {
                setShowForm(false)
                setTimeout(() => addButtonRef.current?.focus(), 0)
              }}
              onTouchStart={() => {
                setShowForm(false)
                setTimeout(() => addButtonRef.current?.focus(), 0)
              }}
              className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm no-mobile-backdrop"
            />

            <div
              id="add-event-modal"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="relative glass-modal rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold">Create New Event</h3>
                <button onClick={() => { setShowForm(false); setTimeout(() => addButtonRef.current?.focus(), 0) }} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 mobile-gap-4 tablet-gap-6 desktop-gap-8">
                  <div>
                    <label className="flex flex-col">
                      <p className="text-[#111418] text-sm sm:text-base font-medium leading-normal pb-2">Event Title *</p>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter event title"
                        className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-12 sm:h-14 placeholder:text-[#60758a] p-3 sm:p-4 text-sm sm:text-base mobile-form-input tablet-form-input desktop-form-input"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="flex flex-col">
                      <p className="text-[#111418] text-sm sm:text-base font-medium leading-normal pb-2">Venue *</p>
                      <input
                        type="text"
                        name="venue"
                        value={formData.venue}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter venue"
                        className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-12 sm:h-14 placeholder:text-[#60758a] p-3 sm:p-4 text-sm sm:text-base"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="flex flex-col">
                      <p className="text-[#111418] text-sm sm:text-base font-medium leading-normal pb-2">Event Type</p>
                      <select
                        name="eventType"
                        value={formData.eventType}
                        onChange={handleInputChange}
                        className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-14 placeholder:text-[#60758a] p-4"
                      >
                        <option value="">Select event type</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Seminar">Seminar</option>
                        <option value="Conference">Conference</option>
                        <option value="Alumni Talk">Alumni Talk</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Competition">Competition</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Sports">Sports</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                  </div>

                  <div>
                    <label className="flex flex-col min-w-40">
                      <p className="text-[#111418] text-base font-medium leading-normal pb-2">Date *</p>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-14 placeholder:text-[#60758a] p-4"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="flex flex-col min-w-40">
                      <p className="text-[#111418] text-base font-medium leading-normal pb-2">Time *</p>
                      <input
                        type="time"
                        name="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        required
                        className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-14 placeholder:text-[#60758a] p-4"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="flex flex-col min-w-40">
                    <p className="text-[#111418] text-base font-medium leading-normal pb-2">Description *</p>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter event description"
                      rows="4"
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0  placeholder:text-[#60758a] p-4"
                    />
                  </label>
                </div>

                <div>
                  <label className="flex flex-col min-w-40">
                    <p className="text-[#111418] text-base font-medium leading-normal pb-2">Event Image (Optional)</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                      className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-14 placeholder:text-[#60758a] p-4"
                    />
                    <p className="text-[#60758a] text-sm mt-1">💡 If no image is provided, a default image based on event type will be used.</p>
                    {imageUploading && <p className="text-blue-600 text-sm mt-1">Uploading image...</p>}
                    {formData.image && (
                      <div className="mt-2">
                        <img src={formData.image} alt="Preview" loading="lazy" decoding="async" className="w-32 h-32 object-cover rounded-lg" />
                      </div>
                    )}
                    {!formData.image && formData.eventType && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 mb-1">Preview (default image):</p>
                        <img src={getDefaultEventImage(formData.eventType)} alt="Default preview" loading="lazy" decoding="async" className="w-32 h-32 object-cover rounded-lg opacity-75" />
                      </div>
                    )}
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || imageUploading}
                    className="glass-button flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 text-[#3d99f5] text-base font-bold leading-normal tracking-[0.015em] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="grid gap-6">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchQuery ? 'No events found matching your search.' : 'No events found.'}
              </p>
              {searchQuery && (
                <Link to="/events" className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block">
                  View all events
                </Link>
              )}
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div key={event._id} className="perf-card flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 bg-white rounded-xl border border-[#dbe0e6]">
                <div className="w-full sm:w-32 h-48 sm:h-32 flex-shrink-0">
                  <img 
                    src={event.image || getDefaultEventImage(event.eventType)} 
                    alt={event.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-row justify-between items-start gap-2 mb-3">
                    <h3 className="text-lg sm:text-xl font-bold text-[#111418] break-words flex-1">{event.title}</h3>
                    {userRole === 'admin' && (
                      <button
                        onClick={() => handleDeleteClick(event._id)}
                        className="text-red-500 hover:text-red-700 px-3 py-1 rounded text-sm flex-shrink-0"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-[#60758a] mb-3">{event.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</div>
                    <div><strong>Time:</strong> {event.time}</div>
                    <div><strong>Venue:</strong> {event.venue}</div>
                    {event.eventType && <div><strong>Type:</strong> <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{event.eventType}</span></div>}
                    <div><strong>Created:</strong> {new Date(event.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, eventId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
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

export default Events
