import { connectToDatabase } from '../../lib/mongo.js'
import { Booking } from '../../models.js'
import { VENUE_BOOKING_COOLDOWN_MINUTES } from '../../server-constants.js'
import { normalizeBookingRole, getBookingRolePriority } from '../../lib/bookingRoles.js'
import { normalizeBookingDateOnly } from '../../lib/bookingDate.js'

const BOOKING_ACTIVE_STATUSES = ['approved', 'pending', 'confirmed']

function timeToMinutes(timeStr) {
  const [hours, minutes] = String(timeStr || '00:00').split(':').map(Number)
  return (hours * 60) + minutes
}

function formatMinutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`
}

function getBookingWindow(time, duration) {
  const start = timeToMinutes(time)
  const bookingDurationMinutes = Math.round((parseFloat(duration) || 1) * 60)
  const bookingEnd = start + bookingDurationMinutes
  return {
    start,
    bookingEnd,
    availableAfter: bookingEnd + VENUE_BOOKING_COOLDOWN_MINUTES
  }
}

function doTimeRangesOverlap(time1, duration1, time2, duration2) {
  const range1 = getBookingWindow(time1, duration1)
  const range2 = getBookingWindow(time2, duration2)
  return range1.start < range2.availableAfter && range2.start < range1.availableAfter
}

function pickHighestPriorityConflict(bookings, requestedTime, requestedDuration) {
  const requested = parseFloat(requestedDuration) || 1
  return (
    bookings
      .filter((booking) => {
        const existingDuration = parseFloat(booking.duration) || 1
        return doTimeRangesOverlap(requestedTime, requested, booking.time, existingDuration)
      })
      .sort((a, b) => {
        const priorityDiff =
          getBookingRolePriority(b.userRole || 'staff') - getBookingRolePriority(a.userRole || 'staff')
        if (priorityDiff !== 0) return priorityDiff
        return timeToMinutes(a.time) - timeToMinutes(b.time)
      })[0] || null
  )
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
    if (!venue || !date || !time || duration === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Venue, date, time, and duration are required'
      })
    }

    const requestedDuration = parseFloat(duration) || 1
    const bookingDate = normalizeBookingDateOnly(date)
    if (!bookingDate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date'
      })
    }
    const dayEnd = new Date(bookingDate.getTime() + 86400000)

    const existingBookings = await Booking.find({
      venue,
      date: { $gte: bookingDate, $lt: dayEnd },
      status: { $in: BOOKING_ACTIVE_STATUSES }
    })

    const conflict = pickHighestPriorityConflict(existingBookings, time, requestedDuration)

    if (conflict) {
      const range = getBookingWindow(conflict.time, conflict.duration)
      const nextAvailableTime = formatMinutesToTime(range.availableAfter)
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
          bookedBy: normalizeBookingRole(conflict.userRole || 'staff'),
          status: conflict.status,
          nextAvailableTime,
          cooldownMinutes: VENUE_BOOKING_COOLDOWN_MINUTES
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
