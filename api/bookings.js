import { connectToDatabase } from '../lib/mongo.js'
import { Booking, User } from '../models.js'
import { VENUE_BOOKING_COOLDOWN_MINUTES, VENUE_CAPACITIES } from '../server-constants.js'
import { sendBookingNotification } from '../lib/notificationQueue.js'
import { normalizeBookingRole, getBookingRolePriority } from '../lib/bookingRoles.js'
import { normalizeBookingDateOnly } from '../lib/bookingDate.js'

const BOOKING_ACTIVE_STATUSES = ['approved', 'pending', 'confirmed']

function getRolePriority(role = 'staff') {
  return getBookingRolePriority(role)
}

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

function getAvailabilityInfo(booking) {
  const range = getBookingWindow(booking.time, booking.duration)
  return {
    nextAvailableMinutes: range.availableAfter,
    nextAvailableText: formatMinutesToTime(range.availableAfter)
  }
}

function pickHighestPriorityConflict(bookings, requestedTime, requestedDuration) {
  return bookings
    .filter((booking) => {
      const existingDuration = parseFloat(booking.duration) || 1
      return doTimeRangesOverlap(requestedTime, requestedDuration, booking.time, existingDuration)
    })
    .sort((a, b) => {
      const priorityDiff = getRolePriority(b.userRole || 'staff') - getRolePriority(a.userRole || 'staff')
      if (priorityDiff !== 0) return priorityDiff
      return timeToMinutes(a.time) - timeToMinutes(b.time)
    })[0] || null
}

async function findAlternativeVenue(originalVenue, date, time, attendees, duration) {
  try {
    const requestedAttendees = Number(attendees) || 0
    const dayStart = normalizeBookingDateOnly(date)
    if (!dayStart) return null
    const dayEnd = new Date(dayStart.getTime() + 86400000)

    const venues = Object.entries(VENUE_CAPACITIES)
      .map(([venue, capacity]) => ({ venue, capacity }))
      .sort((a, b) => a.capacity - b.capacity)

    const suitableVenues = venues.filter(
      (venueOption) => venueOption.venue !== originalVenue && venueOption.capacity >= requestedAttendees
    )

    for (const venueOption of suitableVenues) {
      const potentialConflicts = await Booking.find({
        venue: venueOption.venue,
        date: { $gte: dayStart, $lt: dayEnd },
        status: { $in: BOOKING_ACTIVE_STATUSES }
      })

      const requestedDuration = parseFloat(duration) || 1
      const hasConflict = potentialConflicts.some((booking) => {
        const existingDuration = parseFloat(booking.duration) || 1
        return doTimeRangesOverlap(time, requestedDuration, booking.time, existingDuration)
      })

      if (!hasConflict) {
        return {
          venue: venueOption.venue,
          capacity: venueOption.capacity,
          reason: 'auto-reassigned'
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error finding alternative venue:', error)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    await connectToDatabase()

    switch (req.method) {
      case 'GET':
        if (req.query.venue && req.query.date && req.query.time && req.query.duration !== undefined) {
          return await checkConflict(req, res)
        }
        return await getBookings(req, res)
      case 'POST':
        return await createBooking(req, res)
      case 'PUT':
        return await updateBooking(req, res)
      case 'DELETE':
        return await deleteBooking(req, res)
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        })
    }
  } catch (error) {
    console.error('Bookings API error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

async function getBookings(req, res) {
  try {
    const userEmail = String(req.headers.useremail || req.query.userEmail || '').trim().toLowerCase()
    const isAdmin = req.headers.isadmin === 'true' || req.headers.isAdmin === 'true' || req.query.isAdmin === 'true'
    const scope = req.query.scope

    if (scope === 'calendar') {
      const normalizedUserEmail = String(userEmail || '').trim().toLowerCase()
      const approvedBookings = await Booking.find({ status: { $in: ['approved', 'confirmed'] } }).sort({ date: 1, time: 1 }).lean()
      const userPendingBookings = normalizedUserEmail
        ? await Booking.find({ email: normalizedUserEmail, status: 'pending' }).sort({ date: 1, time: 1 }).lean()
        : []

      const calendarBookings = [...approvedBookings, ...userPendingBookings]
      return res.status(200).json({
        success: true,
        bookings: calendarBookings,
        count: calendarBookings.length,
        userSpecific: false,
        isAdmin: false,
        scope: 'calendar'
      })
    }

    const adminRoles = ['admin', 'principal', 'secretary']
    let isUserAdmin = false
    if (userEmail) {
      const escapedEmail = userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const adminUser = await User.findOne({ email: userEmail }) || await User.findOne({ email: new RegExp(`^${escapedEmail}$`, 'i') })
      if (adminUser && (isAdmin || adminRoles.includes(normalizeBookingRole(adminUser.role)))) {
        isUserAdmin = adminRoles.includes(normalizeBookingRole(adminUser.role))
      }
    }

    if (isUserAdmin) {
      const allBookings = await Booking.find().sort({ createdAt: -1 }).lean()
      return res.status(200).json({
        success: true,
        bookings: allBookings,
        count: allBookings.length,
        userSpecific: false,
        isAdmin: true
      })
    }

    if (userEmail) {
      const userBookings = await Booking.find({ email: userEmail }).sort({ createdAt: -1 }).lean()
      return res.status(200).json({
        success: true,
        bookings: userBookings,
        count: userBookings.length,
        userSpecific: true,
        isAdmin: false
      })
    }

    return res.status(200).json({
      success: true,
      bookings: [],
      count: 0,
      userSpecific: false,
      isAdmin: false
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    })
  }
}

async function createBooking(req, res) {
  try {
    const bookingData = req.body
    const headerEmail = req.headers.useremail || req.headers['user-email']
    const headerRole = req.headers.userrole || req.headers['user-role']
    const fallbackEmail = bookingData?.email
    const requesterEmail = String(headerEmail || fallbackEmail || '').trim().toLowerCase()

    let userRole = 'staff'
    let shouldAutoApprove = false
    if (requesterEmail) {
      const escapedEmail = requesterEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const user = await User.findOne({ email: requesterEmail }) || await User.findOne({ email: new RegExp(`^${escapedEmail}$`, 'i') })
      if (user) {
        userRole = normalizeBookingRole(user.role)
        shouldAutoApprove = !!user.autoApprove
      } else if (headerRole) {
        userRole = normalizeBookingRole(headerRole)
      }
    }

    const role = normalizeBookingRole(userRole)
    const requesterPriority = getRolePriority(role)
    const bookingDate = normalizeBookingDateOnly(bookingData.date)
    if (!bookingDate) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking date.'
      })
    }

    if (!bookingData.venue || typeof bookingData.venue !== 'string' || bookingData.venue.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Venue is required.' })
    }
    if (bookingData.venue.length > 100) {
      return res.status(400).json({ success: false, error: 'Venue name must be under 100 characters.' })
    }

    if (!bookingData.time || !/^\d{2}:\d{2}$/.test(bookingData.time)) {
      return res.status(400).json({ success: false, error: 'Time must be in HH:MM format.' })
    }

    const requestedDuration = parseFloat(bookingData.duration) || 1
    if (requestedDuration < 0.5 || requestedDuration > 8) {
      return res.status(400).json({ success: false, error: 'Duration must be between 0.5 and 8 hours.' })
    }

    const attendees = Number(bookingData.attendees) || 0
    if (attendees < 1 || attendees > 5000) {
      return res.status(400).json({ success: false, error: 'Attendees must be between 1 and 5000.' })
    }

    if (bookingData.purpose && bookingData.purpose.length > 500) {
      return res.status(400).json({ success: false, error: 'Purpose must be under 500 characters.' })
    }
    if (bookingData.organizer && bookingData.organizer.length > 100) {
      return res.status(400).json({ success: false, error: 'Organizer name must be under 100 characters.' })
    }

    // Sunday only holiday rule (UTC calendar day).
    if (bookingDate.getUTCDay() === 0) {
      return res.status(400).json({
        success: false,
        error: 'Sunday is a holiday. Hall booking is not allowed on Sundays.'
      })
    }

    const dayEnd = new Date(bookingDate.getTime() + 86400000)
    const potentialConflicts = await Booking.find({
      venue: bookingData.venue,
      date: { $gte: bookingDate, $lt: dayEnd },
      status: { $in: BOOKING_ACTIVE_STATUSES }
    })

    const existingBooking = pickHighestPriorityConflict(
      potentialConflicts,
      bookingData.time,
      requestedDuration
    )

    let status = 'pending'
    let reassignmentInfo = null

    if (existingBooking) {
      const existingRole = normalizeBookingRole(existingBooking.userRole || 'staff')
      const existingPriority = getRolePriority(existingRole)
      const availabilityInfo = getAvailabilityInfo(existingBooking)

      if (requesterPriority <= existingPriority) {
        return res.status(400).json({
          success: false,
          error: `Venue booked by ${existingBooking.organizer} (${existingRole}) at ${existingBooking.time}. It will be available again at ${availabilityInfo.nextAvailableText} after a ${VENUE_BOOKING_COOLDOWN_MINUTES}-minute cooldown.`,
          conflict: {
            venue: existingBooking.venue,
            date: existingBooking.date,
            time: existingBooking.time,
            duration: existingBooking.duration,
            organizer: existingBooking.organizer,
            bookedBy: existingRole,
            nextAvailableTime: availabilityInfo.nextAvailableText,
            cooldownMinutes: VENUE_BOOKING_COOLDOWN_MINUTES
          }
        })
      }

      const originalVenue = existingBooking.originalVenue || existingBooking.venue
      const alternativeVenue = await findAlternativeVenue(
        existingBooking.venue,
        existingBooking.date,
        existingBooking.time,
        existingBooking.attendees || bookingData.attendees,
        existingBooking.duration
      )

      if (alternativeVenue) {
        existingBooking.originalVenue = originalVenue
        existingBooking.venue = alternativeVenue.venue
        existingBooking.venueCapacity = alternativeVenue.capacity
        existingBooking.movedReason = `Automatically moved to ${alternativeVenue.venue} because a higher-priority ${role} booking needed ${originalVenue}.`
        existingBooking.status = 'approved'
        await existingBooking.save()

        reassignmentInfo = {
          id: existingBooking._id,
          previousUser: existingBooking.organizer,
          previousRole: existingRole,
          previousEmail: existingBooking.email,
          originalVenue,
          newVenue: alternativeVenue.venue,
          date: existingBooking.date,
          time: existingBooking.time,
          action: 'reassigned',
          reason: existingBooking.movedReason
        }
      } else {
        existingBooking.status = 'cancelled'
        existingBooking.movedReason = `Cancelled because a higher-priority ${role} booking needed ${originalVenue}, and no suitable alternative venue was available.`
        await existingBooking.save()

        reassignmentInfo = {
          id: existingBooking._id,
          previousUser: existingBooking.organizer,
          previousRole: existingRole,
          previousEmail: existingBooking.email,
          originalVenue,
          date: existingBooking.date,
          time: existingBooking.time,
          action: 'cancelled',
          reason: existingBooking.movedReason
        }
      }

      status = 'approved'
    } else if (shouldAutoApprove) {
      // Only explicitly auto-approved accounts skip pending when no conflict.
      status = 'approved'
    }

    const { bookingId: _ignored, ...cleanBookingData } = bookingData
    const booking = new Booking({
      ...cleanBookingData,
      date: bookingDate,
      userRole,
      priority: requesterPriority,
      status,
      approvedBy: status === 'approved' ? requesterEmail : undefined,
      approvalDate: status === 'approved' ? new Date() : undefined
    })

    await booking.save()
    await sendBookingNotification(booking, 'created', reassignmentInfo || {})

    if (reassignmentInfo?.action === 'reassigned') {
      const affectedBooking = await Booking.findById(reassignmentInfo.id)
      if (affectedBooking) {
        await sendBookingNotification(affectedBooking, 'reassigned', {
          originalVenue: reassignmentInfo.originalVenue,
          reason: reassignmentInfo.reason
        })
      }
    } else if (reassignmentInfo?.action === 'cancelled') {
      await sendBookingNotification({
        email: reassignmentInfo.previousEmail,
        venue: reassignmentInfo.originalVenue,
        date: reassignmentInfo.date,
        time: reassignmentInfo.time,
        _id: reassignmentInfo.id
      }, 'cancelled', {
        reason: reassignmentInfo.reason
      })
    }

    let message = 'Booking created and pending approval.'
    if (status === 'approved' && reassignmentInfo?.action === 'reassigned') {
      message = `Booking created and auto-approved. The previous ${reassignmentInfo.previousRole} booking by ${reassignmentInfo.previousUser} was moved from ${reassignmentInfo.originalVenue} to ${reassignmentInfo.newVenue}.`
    } else if (status === 'approved' && reassignmentInfo?.action === 'cancelled') {
      message = `Booking created and auto-approved. The previous ${reassignmentInfo.previousRole} booking by ${reassignmentInfo.previousUser} was cancelled because no suitable alternative venue was available.`
    } else if (status === 'approved') {
      message = 'Booking created and auto-approved.'
    }

    return res.status(201).json({
      success: true,
      booking,
      message,
      reassignment: reassignmentInfo
    })
  } catch (error) {
    console.error('Error creating booking:', error)

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID already exists'
      })
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create booking'
    })
  }
}

async function updateBooking(req, res) {
  try {
    const { bookingId, status } = req.body

    if (!bookingId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID and status are required'
      })
    }

    const validStatuses = ['approved', 'rejected', 'cancelled', 'pending']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      })
    }

    const userEmail = String(req.headers.useremail || req.query.userEmail || '').trim().toLowerCase()
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      })
    }

    const adminRoles = ['admin', 'principal', 'secretary']
    const escapedEmail = userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const user = await User.findOne({ email: userEmail }) || await User.findOne({ email: new RegExp(`^${escapedEmail}$`, 'i') })
    const userRole = user ? normalizeBookingRole(user.role) : null
    if (!user || !adminRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required to update bookings'
      })
    }

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      })
    }

    let reassignmentInfo = null

    if (status === 'approved') {
      const bookingDate = normalizeBookingDateOnly(booking.date)
      if (!bookingDate) {
        return res.status(400).json({
          success: false,
          error: 'Booking has an invalid date and cannot be approved'
        })
      }

      const dayEnd = new Date(bookingDate.getTime() + 86400000)
      const approvedConflicts = await Booking.find({
        _id: { $ne: booking._id },
        venue: booking.venue,
        date: { $gte: bookingDate, $lt: dayEnd },
        status: { $in: ['approved', 'confirmed'] }
      })

      const existingBooking = pickHighestPriorityConflict(
        approvedConflicts,
        booking.time,
        parseFloat(booking.duration) || 1
      )

      if (existingBooking) {
        const approvingPriority = getRolePriority(booking.userRole || 'staff')
        const existingRole = normalizeBookingRole(existingBooking.userRole || 'staff')
        const existingPriority = getRolePriority(existingRole)
        const availabilityInfo = getAvailabilityInfo(existingBooking)

        if (approvingPriority <= existingPriority) {
          return res.status(409).json({
            success: false,
            error: `Cannot approve this booking because ${existingBooking.venue} is already approved for ${existingBooking.organizer} (${existingRole}) at ${existingBooking.time}. It will be available again at ${availabilityInfo.nextAvailableText}.`,
            conflict: {
              venue: existingBooking.venue,
              date: existingBooking.date,
              time: existingBooking.time,
              duration: existingBooking.duration,
              organizer: existingBooking.organizer,
              bookedBy: existingRole,
              nextAvailableTime: availabilityInfo.nextAvailableText,
              cooldownMinutes: VENUE_BOOKING_COOLDOWN_MINUTES
            }
          })
        }

        const originalVenue = existingBooking.originalVenue || existingBooking.venue
        const alternativeVenue = await findAlternativeVenue(
          existingBooking.venue,
          existingBooking.date,
          existingBooking.time,
          existingBooking.attendees || booking.attendees,
          existingBooking.duration
        )

        if (alternativeVenue) {
          existingBooking.originalVenue = originalVenue
          existingBooking.venue = alternativeVenue.venue
          existingBooking.venueCapacity = alternativeVenue.capacity
          existingBooking.movedReason = `Automatically moved to ${alternativeVenue.venue} because a higher-priority ${normalizeBookingRole(booking.userRole || 'staff')} booking was approved for ${originalVenue}.`
          existingBooking.status = 'approved'
          await existingBooking.save()

          reassignmentInfo = {
            id: existingBooking._id,
            previousUser: existingBooking.organizer,
            previousRole: existingRole,
            previousEmail: existingBooking.email,
            originalVenue,
            newVenue: alternativeVenue.venue,
            date: existingBooking.date,
            time: existingBooking.time,
            action: 'reassigned',
            reason: existingBooking.movedReason
          }

          await sendBookingNotification(existingBooking, 'reassigned', {
            originalVenue,
            reason: existingBooking.movedReason
          })
        } else {
          existingBooking.status = 'cancelled'
          existingBooking.movedReason = `Cancelled because a higher-priority ${normalizeBookingRole(booking.userRole || 'staff')} booking was approved for ${originalVenue}, and no suitable alternative venue was available.`
          await existingBooking.save()

          reassignmentInfo = {
            id: existingBooking._id,
            previousUser: existingBooking.organizer,
            previousRole: existingRole,
            previousEmail: existingBooking.email,
            originalVenue,
            date: existingBooking.date,
            time: existingBooking.time,
            action: 'cancelled',
            reason: existingBooking.movedReason
          }

          await sendBookingNotification(existingBooking, 'cancelled', {
            reason: existingBooking.movedReason
          })
        }
      }
    }

    booking.status = status
    booking.updatedAt = new Date()
    if (status === 'approved') {
      booking.approvalDate = new Date()
      booking.approvedBy = userEmail
    }
    await booking.save()

    if (status === 'approved') {
      await sendBookingNotification(booking, 'approved')
    } else if (status === 'rejected') {
      await sendBookingNotification(booking, 'rejected')
    } else if (status === 'cancelled') {
      await sendBookingNotification(booking, 'cancelled')
    }

    return res.status(200).json({
      success: true,
      booking,
      reassignment: reassignmentInfo
    })
  } catch (error) {
    console.error('Error updating booking:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to update booking'
    })
  }
}

async function deleteBooking(req, res) {
  try {
    const bookingId = req.body?.bookingId || req.query?.bookingId
    const userEmail = String(req.headers.useremail || req.query.userEmail || '').trim().toLowerCase()

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID is required'
      })
    }

    const booking = await Booking.findById(bookingId)

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      })
    }

    const adminRoles = ['admin', 'principal', 'secretary']
    const escapedEmail = userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const deleterUser = await User.findOne({ email: userEmail }) || await User.findOne({ email: new RegExp(`^${escapedEmail}$`, 'i') })
    const deleterRole = deleterUser ? normalizeBookingRole(deleterUser.role) : null
    const isAdmin = deleterRole && adminRoles.includes(deleterRole)
    const isOwner = String(booking.email || '').trim().toLowerCase() === userEmail

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this booking'
      })
    }

    const deleterName = userEmail.split('@')[0]
    await sendBookingNotification(booking, 'deleted', {
      reason: isAdmin ? `Deleted by admin (${deleterName})` : `Deleted by ${deleterName}`
    })

    await Booking.findByIdAndDelete(bookingId)

    return res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting booking:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to delete booking'
    })
  }
}

async function checkConflict(req, res) {
  try {
    const { venue, date, time, duration } = req.query

    if (!venue || !date || !time || !duration) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: venue, date, time, duration'
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

    const potentialConflicts = await Booking.find({
      venue,
      date: { $gte: bookingDate, $lt: dayEnd },
      status: { $in: BOOKING_ACTIVE_STATUSES }
    })

    const conflict = pickHighestPriorityConflict(potentialConflicts, time, requestedDuration)

    if (conflict) {
      const availabilityInfo = getAvailabilityInfo(conflict)
      return res.status(200).json({
        success: true,
        hasConflict: true,
        conflict: {
          venue: conflict.venue,
          date: conflict.date,
          time: conflict.time,
          duration: conflict.duration,
          organizer: conflict.organizer,
          bookedBy: normalizeBookingRole(conflict.userRole || 'staff'),
          nextAvailableTime: availabilityInfo.nextAvailableText,
          cooldownMinutes: VENUE_BOOKING_COOLDOWN_MINUTES
        }
      })
    }

    return res.status(200).json({
      success: true,
      hasConflict: false
    })
  } catch (error) {
    console.error('Error checking conflict:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to check conflict'
    })
  }
}
