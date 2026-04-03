import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Toast, AlertDialog } from '../components/NotificationModal'

const BOOKING_COOLDOWN_MINUTES = 30
const ROLE_PRIORITY = {
  secretary: 4,
  principal: 3,
  admin: 2,
  staff: 1
}

function Book() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    venue: searchParams.get('hall') || '',
    date: '',
    time: '',
    duration: '1', // Duration in hours, default 1 hour
    attendees: '',
    organizer: '',
    email: '',
    purpose: '',
    purposeCategory: 'Other'
  })
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [venues, setVenues] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [conflictWarning, setConflictWarning] = useState(null)
  
  // Notification states
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' })
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' })

  const purposeCategories = ['Alumni Talk', 'Workshop', 'Seminar', 'Events', 'Other']

  useEffect(() => {
    // Check authentication and get user info
    const checkAuth = () => {
      const auth = localStorage.getItem('auth')
      const isLoggedIn = localStorage.getItem('isLoggedIn')
      const userEmail = localStorage.getItem('userEmail')
      const userName = localStorage.getItem('userName')

      if (auth) {
        try {
          const authData = JSON.parse(auth)
          if (authData.isAuthenticated) {
            setLoggedInUser(authData)
            setFormData(prev => ({
              ...prev,
              email: authData.email,
              organizer: authData.name || authData.email
            }))
          } else {
            navigate('/login')
          }
        } catch (error) {
          navigate('/login')
        }
      } else if (isLoggedIn === 'true' && userEmail) {
        // Fallback to old auth system
        const userData = {
          email: userEmail,
          name: userName || userEmail
        }
        setLoggedInUser(userData)
        setFormData(prev => ({
          ...prev,
          email: userEmail,
          organizer: userName || userEmail
        }))
      } else {
        navigate('/login')
      }
    }

    checkAuth()
    fetchVenues()
  }, [navigate])

  useEffect(() => {
    if (formData.attendees) {
      fetchRecommendations()
    }
  }, [formData.attendees])

  useEffect(() => {
    const hall = searchParams.get('hall')
    const date = searchParams.get('date')
    const time = searchParams.get('time')
    if (!hall && !date && !time) return
    setFormData((prev) => ({
      ...prev,
      ...(hall ? { venue: hall } : {}),
      ...(date ? { date } : {}),
      ...(time ? { time } : {})
    }))
  }, [searchParams])

  const fetchVenues = async () => {
    try {
      const response = await fetch('/api/venues')
      const data = await response.json()
      if (data.success) {
        setVenues(data.venues)
      }
    } catch (error) {
      console.error('Error fetching venues:', error)
    }
  }

  const fetchRecommendations = async () => {
    if (!formData.attendees || formData.attendees <= 0) return
    
    try {
      const response = await fetch(`/api/venues/recommend/${formData.attendees}`)
      const data = await response.json()
      if (data.success) {
        setRecommendations(data.venues)
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target

    if (name === 'date' && value) {
      const selectedDate = new Date(`${value}T00:00:00`)
      if (selectedDate.getDay() === 0) {
        setToast({ isOpen: true, message: 'Sunday is a holiday. Please choose another day.', type: 'warning' })
        return
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Check for conflicts when venue, date, or time changes
    if (name === 'venue' || name === 'date' || name === 'time' || name === 'duration') {
      const newData = { ...formData, [name]: value }
      if (newData.venue && newData.date && newData.time && newData.duration) {
        checkConflict(newData.venue, newData.date, newData.time, newData.duration)
      } else {
        setConflictWarning(null)
      }
    }
  }

  const getRolePriority = (role) => ROLE_PRIORITY[(role || 'staff').toLowerCase()] || ROLE_PRIORITY.staff

  // Helper function to calculate end time with cooldown.
  const calculateEndTime = (startTime, durationHours) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const bookingEndMinutes = startMinutes + (durationHours * 60)
    const endMinutes = bookingEndMinutes + BOOKING_COOLDOWN_MINUTES
    const endHours = Math.floor(endMinutes / 60) % 24
    const endMins = endMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
  }

  const checkConflict = async (venue, date, time, duration) => {
    if (!venue || !date || !time || !duration) {
      setConflictWarning(null)
      return
    }

    try {
      const response = await fetch(
        `/api/bookings/check-conflict?venue=${encodeURIComponent(venue)}&date=${date}&time=${encodeURIComponent(time)}&duration=${duration}`
      )
      const data = await response.json()

      if (data.success && data.hasConflict) {
        const conflict = data.conflict
        const userRole =
          loggedInUser?.role ||
          (typeof localStorage !== 'undefined' ? localStorage.getItem('userRole') : null) ||
          'staff'
        const conflictRole = conflict.bookedBy || 'staff'
        
        // Format duration for display
        const conflictDuration = conflict.duration || 1
        const durationText = conflictDuration >= 1 
          ? `${conflictDuration} hour${conflictDuration > 1 ? 's' : ''}` 
          : `${conflictDuration * 60} minutes`
        
        // Calculate when the hall will be free
        const endTime = conflict.nextAvailableTime || calculateEndTime(conflict.time, conflictDuration)
        
        // Determine if current user can override
        const currentPriority = getRolePriority(userRole)
        const conflictPriority = getRolePriority(conflictRole)
        
        if (currentPriority <= conflictPriority) {
          setConflictWarning({
            message: `⚠️ Venue booked by ${conflict.organizer} at ${conflict.time}. Free after ${endTime}.`,
            canOverride: false,
            conflict
          })
        } else {
          setConflictWarning({
            message: `ℹ️ Venue booked by ${conflict.organizer} at ${conflict.time}. Free after ${endTime}. Your booking will override theirs.`,
            canOverride: true,
            conflict
          })
        }
      } else {
        setConflictWarning(null)
      }
    } catch (error) {
      console.error('Error checking conflict:', error)
      setConflictWarning(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const requesterEmail = loggedInUser?.email || formData.email
      const requesterRole =
        loggedInUser?.role ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('userRole') : '') ||
        ''
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'userEmail': requesterEmail,
          'userRole': requesterRole
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (data.success) {
        // Show server message if present
        const message = data.message || 'Booking created successfully!'
        setToast({ isOpen: true, message, type: 'success' })

        // Clear conflict warning
        setConflictWarning(null)

        // Always take user to booking status after a successful booking.
        setTimeout(() => navigate('/booking-status'), 1200)
      } else {
        // Show detailed error message including conflict info if available
        if (data.conflict) {
          const conflictDuration = data.conflict.duration || 1
          const endTime = data.conflict.nextAvailableTime || calculateEndTime(data.conflict.time, conflictDuration)
          const conflictMsg = `Venue booked by ${data.conflict.organizer} (${data.conflict.bookedBy || 'staff'}) at ${data.conflict.time}. Available again at ${endTime} after a ${BOOKING_COOLDOWN_MINUTES}-minute cooldown.`
          setAlertDialog({ 
            isOpen: true, 
            title: '❌ Booking Conflict', 
            message: conflictMsg, 
            type: 'error' 
          })
        } else {
          setToast({ isOpen: true, message: data.error, type: 'error' })
        }
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      setToast({ isOpen: true, message: 'Failed to create booking. Please try again.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 smooth-scroll mobile-smoothest-scroll mobile-form-optimized no-mobile-anim">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 sm:pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
                Book a Venue
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Fill out the form below to book your preferred venue for your event. All fields are required.
              </p>
            </div>
          </div>

          {/* Booking Form */}
          <div className="glass-card no-mobile-backdrop p-6 rounded-2xl bg-white bg-opacity-90 shadow-md mobile-form-optimized">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
            {/* Venue Selection */}
            <div>
              <label className="flex flex-col">
                <p className="text-[#111418] text-sm sm:text-base font-medium leading-normal pb-2">Venue *</p>
                <select
                  name="venue"
                  value={formData.venue}
                  onChange={handleInputChange}
                  required
                  className="glass-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-12 sm:h-14 placeholder:text-[#60758a] p-3 sm:p-4 text-sm sm:text-base"
                >
                  <option value="">Select a venue</option>
                  {venues.map((venue) => (
                    <option key={venue.venue} value={venue.venue}>
                      {venue.venue} (Capacity: {venue.capacity})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Date */}
            <div>
              <label className="flex flex-col">
                <p className="text-[#111418] text-sm sm:text-base font-medium leading-normal pb-2">Date *</p>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-14 placeholder:text-[#60758a] p-4 mobile-form-input tablet-form-input desktop-form-input mobile-form-optimized"
                />
              </label>
            </div>

            {/* Time */}
            <div>
              <label className="flex flex-col min-w-40">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">Start Time *</p>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required
                  className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-14 placeholder:text-[#60758a] p-4 mobile-form-input tablet-form-input desktop-form-input mobile-form-optimized"
                />
              </label>
            </div>

            {/* Duration */}
            <div>
              <label className="flex flex-col min-w-40">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">Duration (hours) *</p>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  required
                  className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-14 placeholder:text-[#60758a] p-4 mobile-form-input tablet-form-input desktop-form-input mobile-form-optimized"
                >
                  <option value="0.5">30 minutes</option>
                  <option value="1">1 hour</option>
                  <option value="1.5">1.5 hours</option>
                  <option value="2">2 hours</option>
                  <option value="2.5">2.5 hours</option>
                  <option value="3">3 hours</option>
                  <option value="3.5">3.5 hours</option>
                  <option value="4">4 hours</option>
                  <option value="5">5 hours</option>
                  <option value="6">6 hours</option>
                  <option value="8">8 hours (Full Day)</option>
                </select>
              </label>
            </div>

            {/* Conflict Warning */}
            {conflictWarning && (
              <div className="md:col-span-2">
                <div className={`p-4 rounded-lg border-2 ${
                  conflictWarning.canOverride 
                    ? 'bg-yellow-50 border-yellow-400' 
                    : 'bg-red-50 border-red-400'
                }`}>
                  <p className={`text-sm font-semibold ${
                    conflictWarning.canOverride ? 'text-yellow-800' : 'text-red-800'
                  }`}>
                    {conflictWarning.message}
                  </p>
                  {!conflictWarning.canOverride && (
                    <p className="text-xs text-red-600 mt-2">
                      Please choose a different time or wait until the 30-minute cooldown ends.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Attendees */}
            <div>
              <label className="flex flex-col min-w-40">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">Number of Attendees *</p>
                <input
                  type="number"
                  name="attendees"
                  value={formData.attendees}
                  onChange={handleInputChange}
                  required
                  min="1"
                  placeholder="Enter number of attendees"
                  className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-14 placeholder:text-[#60758a] p-4 mobile-form-input tablet-form-input desktop-form-input mobile-form-optimized"
                />
              </label>
              
              {/* Venue Recommendations */}
              {recommendations.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">Recommended venues for {formData.attendees} attendees:</p>
                  <div className="space-y-1">
                    {recommendations.map((rec) => (
                      <div key={rec.venue} className={`text-sm ${rec.suitable ? 'text-green-700' : 'text-red-700'}`}>
                        {rec.venue} (Capacity: {rec.capacity}) - {rec.suitable ? 'Suitable' : 'Too small'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Organizer */}
            <div>
              <label className="flex flex-col min-w-40">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">
                  Organizer Name * <span className="text-xs text-[#60758a]">(Auto-filled, can be edited)</span>
                </p>
                <input
                  type="text"
                  name="organizer"
                  value={formData.organizer}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter organizer name"
                  className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-14 placeholder:text-[#60758a] p-4 mobile-form-input tablet-form-input desktop-form-input mobile-form-optimized"
                />
              </label>
            </div>

            {/* Email (Auto-filled from logged-in user) */}
            <div>
              <label className="flex flex-col min-w-40">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">
                  Email * <span className="text-xs text-[#60758a]">(Auto-filled from your account)</span>
                </p>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  readOnly
                  required
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 border border-[#dbe0e6] bg-gray-50 h-14 placeholder:text-[#60758a] p-4 cursor-not-allowed mobile-form-input tablet-form-input desktop-form-input mobile-form-optimized"
                />
              </label>
            </div>

            {/* Purpose Category */}
            <div className="md:col-span-2">
              <label className="flex flex-col min-w-40">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">Purpose Category *</p>
                <select
                  name="purposeCategory"
                  value={formData.purposeCategory}
                  onChange={handleInputChange}
                  required
                  className="glass-input form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0 h-14 placeholder:text-[#60758a] p-4 mobile-form-input tablet-form-input desktop-form-input mobile-form-optimized"
                >
                  {purposeCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Purpose Description */}
            <div className="md:col-span-2">
              <label className="flex flex-col min-w-40">
                <p className="text-[#111418] text-base font-medium leading-normal pb-2">Purpose Description *</p>
                <textarea
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  required
                  placeholder="Describe the purpose of your event"
                  rows="4"
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] focus:outline-0 focus:ring-0  placeholder:text-[#60758a] p-4 mobile-form-input tablet-form-input desktop-form-input mobile-form-optimized"
                />
              </label>
            </div>
          </div>

          {/* Booking Summary */}
          {(formData.venue || formData.date || formData.time || formData.organizer) && (
            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Booking Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {formData.venue && <div><strong>Venue:</strong> {formData.venue}</div>}
                {formData.date && <div><strong>Date:</strong> {formData.date}</div>}
                {formData.time && <div><strong>Time:</strong> {formData.time}</div>}
                {formData.attendees && <div><strong>Attendees:</strong> {formData.attendees}</div>}
                {formData.organizer && <div><strong>Organizer:</strong> {formData.organizer}</div>}
                {formData.email && <div><strong>Email:</strong> {formData.email}</div>}
                {formData.purposeCategory && <div><strong>Category:</strong> {formData.purposeCategory}</div>}
                {formData.purpose && <div className="md:col-span-2"><strong>Purpose:</strong> {formData.purpose}</div>}
              </div>
            </div>
          )}

              {/* Submit Button */}
              <div className="flex justify-center pt-8">
                <button
                  type="submit"
                  disabled={isLoading || (conflictWarning && !conflictWarning.canOverride)}
                  className="glass-button flex min-w-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl h-14 px-8 text-blue-600 text-lg font-bold leading-normal tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
                >
                  <span className="truncate">
                    {isLoading ? 'Booking...' : 
                     (conflictWarning && !conflictWarning.canOverride) ? 'Slot Unavailable' :
                     (conflictWarning && conflictWarning.canOverride) ? 'Book & Override' :
                     'Book Venue'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
        message={toast.message}
        type={toast.type}
        duration={3000}
      />

      {/* Alert Dialog for conflicts */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </div>
  )
}

export default Book
