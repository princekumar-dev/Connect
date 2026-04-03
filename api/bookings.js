import { connectToDatabase } from '../lib/mongo.js'
import { Booking, User } from '../models.js'
import { VENUE_CAPACITIES } from '../server-constants.js'
import { sendBookingNotification } from '../lib/notificationQueue.js'

// Note: Notification system now handled by notificationQueue.js with batching and rate limiting

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

  console.log(`Time overlap check:`)
  console.log(`  Booking 1: ${time1} (${start1}min) + ${duration1}hrs = ${end1}min`)
  console.log(`  Booking 2: ${time2} (${start2}min) + ${duration2}hrs = ${end2}min`)
  console.log(`  Overlap check: ${start1} < ${end2} AND ${start2} < ${end1}`)
  console.log(`  Result: ${start1 < end2 && start2 < end1}`)

  // Ranges overlap if: start1 < end2 AND start2 < end1
  return start1 < end2 && start2 < end1
}

// Notification function is now imported from notificationQueue.js with batching and rate limiting

export default async function handler(req, res) {
  // CORS is already handled by the cors middleware in server.js
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    await connectToDatabase()

    switch (req.method) {
      case 'GET':
        // Check if this is a conflict check request
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

// Helper function to find alternative venues
async function findAlternativeVenue(originalVenue, date, time, attendees, duration) {
  try {
    // Get all venues sorted by capacity
    const venues = Object.entries(VENUE_CAPACITIES)
      .map(([venue, capacity]) => ({ venue, capacity }))
      .sort((a, b) => a.capacity - b.capacity) // Sort by capacity ascending
    
    // Filter venues that can accommodate the attendees
    const suitableVenues = venues.filter(v => v.capacity >= attendees && v.venue !== originalVenue)
    
    // Check which venues are available at the same date/time
    for (const venueOption of suitableVenues) {
      // Find all bookings for this venue on the same date
      const potentialConflicts = await Booking.find({
        venue: venueOption.venue,
        date: new Date(date),
        status: { $in: ['approved', 'pending'] }
      })
      
      // Check for time range overlaps
      const requestedDuration = parseFloat(duration) || 1
      const hasConflict = potentialConflicts.some(booking => {
        const existingDuration = parseFloat(booking.duration) || 1
        return doTimeRangesOverlap(time, requestedDuration, booking.time, existingDuration)
      })
      
      if (!hasConflict) {
        // Found an available venue
        return {
          venue: venueOption.venue,
          capacity: venueOption.capacity,
          reason: 'auto-reassigned'
        }
      }
    }
    
    // No suitable alternative found
    return null
  } catch (error) {
    console.error('Error finding alternative venue:', error)
    return null
  }
}

async function getBookings(req, res) {
  try {
    const userEmail = req.headers.useremail || req.query.userEmail
    const isAdmin = req.headers.isadmin === 'true' || req.headers.isAdmin === 'true' || req.query.isAdmin === 'true'
    const scope = req.query.scope
    
    console.log('API Request - userEmail:', userEmail, 'isAdmin flag:', isAdmin)
    console.log('Headers received:', Object.keys(req.headers))

    if (scope === 'calendar') {
      const approvedBookings = await Booking.find({ status: 'approved' }).sort({ date: 1, time: 1 }).lean()
      return res.status(200).json({
        success: true,
        bookings: approvedBookings,
        count: approvedBookings.length,
        userSpecific: false,
        isAdmin: false,
        scope: 'calendar'
      })
    }
    
    // Check if user is admin by email or explicit flag
    // Only actual admin email, not principal/secretary (they have high priority but not admin view)
    const adminEmails = ['admin@msec.edu.in']
    const isUserAdmin = isAdmin || adminEmails.includes(userEmail)
    
    console.log('Is user admin?', isUserAdmin)
    
    if (isUserAdmin) {
      // Admin users get ALL bookings
      console.log('Fetching all bookings for admin user:', userEmail)
      const allBookings = await Booking.find().sort({ createdAt: -1 }).lean()
      console.log(`Found ${allBookings.length} total bookings for admin`)
      
      return res.status(200).json({
        success: true,
        bookings: allBookings,
        count: allBookings.length,
        userSpecific: false,
        isAdmin: true
      })
    }
    
    // Regular users get only their bookings
    if (userEmail) {
      console.log('Fetching bookings for regular user:', userEmail)
      const userBookings = await Booking.find({ email: userEmail }).sort({ createdAt: -1 }).lean()
      console.log(`Found ${userBookings.length} bookings for user: ${userEmail}`)
      
      return res.status(200).json({
        success: true,
        bookings: userBookings,
        count: userBookings.length,
        userSpecific: true,
        isAdmin: false
      })
    }
    
    // No user specified - return empty array
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
    const userEmail = req.headers.useremail

    let userRole = 'user'
    if (userEmail) {
      const user = await User.findOne({ email: userEmail.toLowerCase() })
      if (user) {
        userRole = user.role
      }
    }

    // STEP 1: Check for any existing booking conflicts (same venue/date with overlapping time)
    // Prevent double-booking by checking for any approved or pending booking
    const bookingDate = new Date(bookingData.date)
    const requestedDuration = parseFloat(bookingData.duration) || 1
    
    // Find all bookings for the same venue and date
    const potentialConflicts = await Booking.find({
      venue: bookingData.venue,
      date: bookingDate,
      status: { $in: ['approved', 'pending'] }
    })
    
    // Check for time range overlaps
    const existingBooking = potentialConflicts.find(booking => {
      const existingDuration = parseFloat(booking.duration) || 1
      return doTimeRangesOverlap(
        bookingData.time,
        requestedDuration,
        booking.time,
        existingDuration
      )
    })

    // STEP 2: Determine approval based on role and conflict resolution rules:
    // - If there's a conflict and the existing booking is by principal/secretary:
    //   * Only admin, principal, or secretary can override (reject the new booking)
    //   * HOD/staff/user bookings are REJECTED
    // - If there's a conflict and the existing booking is by lower priority (hod/staff/user):
    //   * Principal/secretary/admin can override (cancel existing, approve new)
    // - If no conflict, auto-approve based on role:
    //   * Principal, Secretary, Admin → auto-approve
    //   * HOD, Staff → auto-approve
    //   * Others → pending
    
    let status = 'pending'
    const role = (userRole || 'user').toLowerCase()

    if (existingBooking) {
      const existingRole = (existingBooking.userRole || 'user').toLowerCase()
      const existingIsPriority = ['principal', 'secretary', 'admin'].includes(existingRole)
      const newIsPriority = ['principal', 'secretary', 'admin'].includes(role)

      if (existingIsPriority) {
        // Cannot override principal/secretary/admin bookings
        return res.status(400).json({
          success: false,
          error: `Venue booked by ${existingBooking.organizer} at ${bookingData.time}. Please choose a different time or venue.`,
          conflict: {
            venue: existingBooking.venue,
            date: existingBooking.date,
            time: existingBooking.time,
            organizer: existingBooking.organizer,
            bookedBy: existingRole
          }
        })
      } else if (newIsPriority) {
        // Principal/secretary/admin can override lower priority bookings (HOD, staff, user)
        // Try to find an alternative venue for HOD/staff bookings (not for regular users)
        
        if (['hod', 'staff'].includes(existingRole)) {
          // HOD/staff bookings: Try to reassign to alternative venue
          const alternativeVenue = await findAlternativeVenue(
            existingBooking.venue,
            existingBooking.date,
            existingBooking.time,
            existingBooking.attendees,
            existingBooking.duration
          )
          
          if (alternativeVenue) {
            // Successfully found alternative - reassign the existing booking
            existingBooking.originalVenue = existingBooking.venue
            existingBooking.venue = alternativeVenue.venue
            existingBooking.venueCapacity = alternativeVenue.capacity
            existingBooking.movedReason = `Venue switched from ${existingBooking.originalVenue} to ${alternativeVenue.venue} - ${role} (${bookingData.organizer}) needed the original venue`
            existingBooking.status = 'approved' // Keep it approved
            await existingBooking.save()
            
            console.log(`✓ Reassigned ${existingRole} booking ${existingBooking._id} from ${existingBooking.originalVenue} to ${alternativeVenue.venue}`)
            status = 'approved'
          } else {
            // No alternative found - cancel the existing booking
            existingBooking.status = 'cancelled'
            existingBooking.movedReason = `Overridden by ${role} (${bookingData.organizer}) - No alternative venue available`
            await existingBooking.save()
            
            console.log(`✗ Cancelled ${existingRole} booking ${existingBooking._id} - No alternative venue available`)
            status = 'approved'
          }
        } else {
          // For regular user bookings: cancel without reassignment attempt
          existingBooking.status = 'cancelled'
          existingBooking.movedReason = `Overridden by ${role} (${bookingData.organizer})`
          await existingBooking.save()
          
          console.log(`✗ Cancelled user booking ${existingBooking._id} - Overridden by ${role}`)
          status = 'approved'
        }
      } else {
        // Both are lower priority - reject the new booking
        return res.status(400).json({
          success: false,
          error: `Venue booked by ${existingBooking.organizer} at ${bookingData.time}. Please choose a different time or venue.`,
          conflict: {
            venue: existingBooking.venue,
            date: existingBooking.date,
            time: existingBooking.time,
            organizer: existingBooking.organizer,
            bookedBy: existingRole
          }
        })
      }
    } else {
      // No conflict - auto-approve based on role
      if (['admin', 'principal', 'secretary', 'hod', 'staff'].includes(role)) {
        status = 'approved'
      } else {
        status = 'pending'
      }
    }

    // Capture reassignment/cancellation info BEFORE creating new booking
    let reassignmentInfo = null
    let affectedBookingInfo = null
    
    if (existingBooking) {
      affectedBookingInfo = {
        id: existingBooking._id,
        previousUser: existingBooking.organizer,
        previousRole: existingBooking.userRole,
        previousEmail: existingBooking.email,
        originalVenue: existingBooking.originalVenue || existingBooking.venue,
        date: existingBooking.date,
        time: existingBooking.time
      }
      
      if (existingBooking.originalVenue) {
        // Booking was reassigned
        reassignmentInfo = {
          ...affectedBookingInfo,
          newVenue: existingBooking.venue,
          action: 'reassigned',
          reason: existingBooking.movedReason
        }
      } else if (existingBooking.status === 'cancelled') {
        // Booking was cancelled
        reassignmentInfo = {
          ...affectedBookingInfo,
          action: 'cancelled',
          reason: existingBooking.movedReason
        }
      }
    }

    const booking = new Booking({
      ...bookingData,
      userRole,
      status,
      approvedBy: status === 'approved' ? userEmail : undefined,
      approvalDate: status === 'approved' ? new Date() : undefined
    })

    await booking.save()

    // Send notification to user about their booking
    await sendBookingNotification(booking, 'created', reassignmentInfo);

    // If someone else's booking was affected, notify them too
    if (reassignmentInfo) {
      if (reassignmentInfo.action === 'reassigned') {
        // Find the affected booking and send reassignment notification
        const affectedBooking = await Booking.findById(reassignmentInfo.id);
        if (affectedBooking) {
          await sendBookingNotification(affectedBooking, 'reassigned', {
            originalVenue: reassignmentInfo.originalVenue,
            reason: reassignmentInfo.reason
          });
        }
      } else if (reassignmentInfo.action === 'cancelled') {
        // Send cancellation notification to the affected user
        const affectedBooking = {
          email: reassignmentInfo.previousEmail,
          venue: reassignmentInfo.originalVenue,
          date: reassignmentInfo.date,
          time: reassignmentInfo.time,
          _id: reassignmentInfo.id
        };
        await sendBookingNotification(affectedBooking, 'cancelled', {
          reason: reassignmentInfo.reason
        });
      }
    }

    // Generate appropriate message based on what happened
    let message = 'Booking created and pending approval.'
    if (status === 'approved') {
      if (reassignmentInfo) {
        if (reassignmentInfo.action === 'reassigned') {
          message = `Booking created and auto-approved! Previous ${reassignmentInfo.previousRole} booking by ${reassignmentInfo.previousUser} was automatically moved from ${reassignmentInfo.originalVenue} to ${reassignmentInfo.newVenue}.`
        } else if (reassignmentInfo.action === 'cancelled') {
          message = `Booking created and auto-approved! Previous ${reassignmentInfo.previousRole} booking by ${reassignmentInfo.previousUser} was cancelled (no alternative venue available).`
        }
      } else {
        message = 'Booking created and auto-approved!'
      }
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

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { 
        status,
        updatedAt: new Date(),
        approvalDate: status === 'approved' ? new Date() : undefined
      },
      { new: true }
    )

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      })
    }

    // Send notification about status update
    console.log(`📧 Sending ${status} notification for booking ${bookingId} to ${booking.email}`)
    
    if (status === 'approved') {
      await sendBookingNotification(booking, 'approved');
      console.log(`✅ Approved notification sent for ${bookingId}`)
    } else if (status === 'rejected') {
      await sendBookingNotification(booking, 'rejected');
      console.log(`❌ Rejected notification sent for ${bookingId}`)
    }

    return res.status(200).json({
      success: true,
      booking
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
    const userEmail = req.headers.useremail || req.query.userEmail

    console.log('Delete booking request:', { bookingId, userEmail, method: req.method })

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID is required'
      })
    }

    // Find the booking first
    const booking = await Booking.findById(bookingId)

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      })
    }

    // Check authorization: only admin or booking owner can delete
    const adminEmails = ['admin@msec.edu.in']
    const isAdmin = adminEmails.includes(userEmail)
    const isOwner = booking.email === userEmail

    console.log(`Delete authorization check:`, {
      userEmail,
      bookingOwner: booking.email,
      isAdmin,
      isOwner
    })

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this booking'
      })
    }

    // Send deletion notification before deleting
    const deleterName = userEmail.split('@')[0] // Extract name from email
    await sendBookingNotification(booking, 'deleted', { 
      reason: isAdmin ? `Deleted by admin (${deleterName})` : `Deleted by ${deleterName}` 
    });

    // Delete the booking
    await Booking.findByIdAndDelete(bookingId)

    console.log(`✓ Booking ${bookingId} deleted by ${userEmail} (${isAdmin ? 'admin' : 'owner'})`)

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
    const bookingDate = new Date(date)

    // Find all bookings for the same venue and date
    const potentialConflicts = await Booking.find({
      venue: venue,
      date: bookingDate,
      status: { $in: ['approved', 'pending'] }
    })

    // Check for time range overlaps
    const conflict = potentialConflicts.find(booking => {
      const existingDuration = parseFloat(booking.duration) || 1
      return doTimeRangesOverlap(time, requestedDuration, booking.time, existingDuration)
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
          bookedBy: conflict.userRole || 'user'
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
