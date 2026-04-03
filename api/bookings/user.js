import { MongoClient, ObjectId } from 'mongodb'
import { connectToDatabase } from '../../lib/mongo.js'

// Express handler for user bookings
const userBookingsHandler = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, userEmail')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get database connection
    const { db } = await connectToDatabase()
    
    // Get user email from headers or query params (handle case sensitivity)
    const userEmail = req.headers.useremail || req.headers['useremail'] || req.headers['userEmail'] || req.query.userEmail
    
    console.log('API Debug - User email from request:', userEmail)
    console.log('API Debug - Request headers:', req.headers)
    
    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' })
    }

    // Fetch user's bookings from the database - filter by logged-in user's email only
    const bookings = await db.collection('bookings')
      .find({ email: userEmail })  // Only get bookings made by this specific user
      .sort({ date: -1, time: -1 }) // Sort by date and time, newest first
      .toArray()

    console.log(`API Debug - Found ${bookings.length} bookings for user: ${userEmail}`)

    // Format the response
    const formattedBookings = bookings.map(booking => ({
      id: booking._id.toString(),
      venue: booking.venue,
      date: booking.date,
      time: booking.time,
      attendees: booking.attendees,
      organizer: booking.organizer || booking.userEmail,
      status: booking.status || 'confirmed',
      bookedAt: booking.createdAt || booking.bookedAt,
      userEmail: booking.userEmail,
      reassignedInfo: booking.reassignedInfo
    }))

    res.status(200).json({ 
      success: true,
      bookings: formattedBookings,
      count: formattedBookings.length
    })

  } catch (error) {
    console.error('Error fetching user bookings:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch bookings',
      message: error.message 
    })
  }
}

export default userBookingsHandler