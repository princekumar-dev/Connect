import { VENUE_CAPACITIES } from '../server-constants.js'
import { connectToDatabase } from '../lib/mongo.js'
import { Booking } from '../models.js'

// Helper to convert 24h time to 12h format
function formatTime12Hour(time24) {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Helper to get real-time venue status
function getVenueStatus(bookings, venueName) {
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes() // Current time in minutes
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  console.log(`Checking status for ${venueName} at ${now.toLocaleTimeString()}`)
  
  // Get today's bookings for this venue
  const todaysBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.date)
    return booking.venue === venueName && 
           bookingDate >= todayStart &&
           bookingDate < new Date(todayStart.getTime() + 24 * 60 * 60 * 1000) &&
           booking.status === 'approved'
  })

  console.log(`Found ${todaysBookings.length} bookings for ${venueName} today`)

  if (todaysBookings.length === 0) {
    return { status: 'available', message: 'Available for booking' }
  }

  // Check each booking to see if venue is currently occupied or in buffer
  for (const booking of todaysBookings) {
    const [hours, minutes] = booking.time.split(':').map(Number)
    const bookingStartMinutes = hours * 60 + minutes
    const duration = booking.duration || 1
    const bookingEndMinutes = bookingStartMinutes + (duration * 60)
    
    // Get venue capacity for buffer calculation
    const capacity = VENUE_CAPACITIES[venueName] || 0
    const bufferMinutes = capacity > 250 ? 30 : 15
    const bookingEndWithBuffer = bookingEndMinutes + bufferMinutes

    // Check if currently in use
    if (currentTime >= bookingStartMinutes && currentTime < bookingEndMinutes) {
      const endHours = Math.floor(bookingEndMinutes / 60)
      const endMins = bookingEndMinutes % 60
      const endTime24 = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
      const endTime12 = formatTime12Hour(endTime24)
      console.log(`${venueName} is OCCUPIED until ${endTime12}`)
      return { 
        status: 'occupied', 
        message: `In use until ${endTime12}`,
        nextAvailable: bookingEndWithBuffer
      }
    }

    // Check if in buffer time
    if (currentTime >= bookingEndMinutes && currentTime < bookingEndWithBuffer) {
      const bufferEndHours = Math.floor(bookingEndWithBuffer / 60)
      const bufferEndMins = bookingEndWithBuffer % 60
      const bufferEndTime24 = `${bufferEndHours.toString().padStart(2, '0')}:${bufferEndMins.toString().padStart(2, '0')}`
      const bufferEndTime12 = formatTime12Hour(bufferEndTime24)
      console.log(`${venueName} is in BUFFER until ${bufferEndTime12}`)
      return { 
        status: 'buffer', 
        message: `In buffer time until ${bufferEndTime12}`,
        nextAvailable: bookingEndWithBuffer
      }
    }
  }

  // Find next booking to show when it will be occupied
  const futureBookings = todaysBookings.filter(booking => {
    const [hours, minutes] = booking.time.split(':').map(Number)
    const bookingStartMinutes = hours * 60 + minutes
    return bookingStartMinutes > currentTime
  }).sort((a, b) => {
    const aTime = a.time.split(':').map(Number)
    const bTime = b.time.split(':').map(Number)
    return (aTime[0] * 60 + aTime[1]) - (bTime[0] * 60 + bTime[1])
  })

  if (futureBookings.length > 0) {
    const nextBookingTime12 = formatTime12Hour(futureBookings[0].time)
    console.log(`${venueName} is AVAILABLE, next booking at ${nextBookingTime12}`)
    return { 
      status: 'available', 
      message: `Available now. Next booking at ${nextBookingTime12}`
    }
  }

  console.log(`${venueName} is AVAILABLE for the rest of the day`)
  return { status: 'available', message: 'Available for booking' }
}

export default async function handler(req, res) {
  // CORS is already handled by the cors middleware in server.js
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'GET') {
    try {
      await connectToDatabase()
      
      // Fetch all approved bookings
      const bookings = await Booking.find({ status: 'approved' }).lean()
      
      // Build venue data with real-time status
      const venues = Object.entries(VENUE_CAPACITIES || {}).map(([venue, capacity]) => {
        const venueStatus = getVenueStatus(bookings, venue)
        return {
          venue,
          capacity,
          available: venueStatus.status === 'available',
          status: venueStatus.status,
          statusMessage: venueStatus.message,
          nextAvailable: venueStatus.nextAvailable
        }
      })

      return res.status(200).json({
        success: true,
        venues,
        count: venues.length
      })
    } catch (error) {
      console.error('Error fetching venues:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch venues'
      })
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  })
}