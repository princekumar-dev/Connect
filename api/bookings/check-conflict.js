import { connectToDatabase } from '../../lib/mongo.js'
import { Booking } from '../../models.js'

// Helper function to check if two time ranges overlap
function doTimeRangesOverlap(time1, duration1, time2, duration2) {
  // Convert time strings (HH:MM) to minutes since midnight
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  const start1 = timeToMinutes(time1)
  const end1 = start1 + (duration1 * 60)
  const start2 = timeToMinutes(time2)
  const end2 = start2 + (duration2 * 60)

  // Ranges overlap if: start1 < end2 AND start2 < end1
  return start1 < end2 && start2 < end1
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }

  try {
    await connectToDatabase()

    const { venue, date, time, duration } = req.query

    if (!venue || !date || !time || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Venue, date, time, and duration are required'
      })
    }

    const requestedDuration = parseFloat(duration) || 1

    // Check for existing bookings on the same venue and date
    const bookingDate = new Date(date)
    const existingBookings = await Booking.find({
      venue,
      date: bookingDate,
      status: { $in: ['approved', 'pending'] }
    })

    // Check for time range overlaps
    const conflict = existingBookings.find(booking => {
      const existingDuration = parseFloat(booking.duration) || 1
      return doTimeRangesOverlap(
        time,
        requestedDuration,
        booking.time,
        existingDuration
      )
    })

    if (conflict) {
      return res.status(200).json({
        success: true,
        hasConflict: true,
        conflict: {
          venue: conflict.venue,
          date: conflict.date,
          time: conflict.time,
          duration: conflict.duration,
          organizer: conflict.organizer,
          email: conflict.email,
          bookedBy: conflict.userRole || 'user',
          status: conflict.status
        }
      })
    }

    return res.status(200).json({
      success: true,
      hasConflict: false
    })
  } catch (error) {
    console.error('Error checking booking conflict:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to check booking conflict'
    })
  }
}
