import { connectToDatabase } from './lib/mongo.js'
import { Event, Booking } from './models.js'
import { getUserSubscriptions, storeNotification } from './lib/notificationService.js'
import webpush from 'web-push'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Configure web-push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BI3ZQwdtuxxYpepMvZjy5xkuzLbnsjG8J1jfBkGMi0AzbhWDocIASZkq6ocisfwCTnYCHuogo_O-PJSuyfGWwkU'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'hfn59n2ZF4qdGGl1kiuZ_zglStMTBIqN0CxC49jXUMc'

webpush.setVapidDetails(
  'mailto:support@msecconnect.edu',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

// Helper function to send event notifications
async function sendEventNotification(userEmail, title, body, eventData = {}) {
  try {
    console.log(`📅 Sending event notification to ${userEmail}: ${title}`)
    
    // Get user's push subscriptions
    const { subscriptions } = await getUserSubscriptions(userEmail)
    
    if (subscriptions && subscriptions.length > 0) {
      // Create a UNIQUE tag for each notification to prevent browser merging
      // Tag includes: eventId, date, timestamp, and random component for absolute uniqueness
      const randomId = Math.random().toString(36).substring(2, 9)
      const uniqueTag = `event-${eventData.eventId || eventData.bookingId || 'general'}-${eventData.eventDate || 'unknown'}-${Date.now()}-${randomId}`
      
      const payload = JSON.stringify({
        title,
        body,
        icon: '/images/android-chrome-192x192.png',
        badge: '/images/favicon-32x32.png',
        tag: uniqueTag, // UNIQUE tag prevents notification grouping/merging
        requireInteraction: false,
        renotify: true, // Always show as new notification
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events`,
        data: { type: 'event-reminder', ...eventData, notificationId: uniqueTag }
      })

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub.subscription, payload)
          console.log(`✅ Event notification sent to ${userEmail} with tag: ${uniqueTag}`)
        } catch (error) {
          console.error(`❌ Failed to send event notification to ${userEmail}:`, error.message)
        }
      }
    } else {
      console.log(`📧 No subscriptions for ${userEmail} - skipping event notification`)
    }

    // Store notification in database
    await storeNotification({
      userEmail,
      title,
      body,
      type: 'event-reminder',
      data: eventData
    })

  } catch (error) {
    console.error('Error sending event notification:', error)
  }
}

// Function to check today's events
async function checkTodaysEvents() {
  try {
    console.log('🔍 Checking for today\'s events...')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find events happening today
    const todaysEvents = await Event.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    })

    // Filter out events that have already ended
    const currentTime = new Date()
    const upcomingEvents = todaysEvents.filter(event => {
      // Parse event time (format: "HH:MM" or "HH:MM AM/PM")
      const timeStr = event.time.trim()
      const timeParts = timeStr.match(/(\d+):(\d+)/)
      
      if (timeParts) {
        const hours = parseInt(timeParts[1])
        const minutes = parseInt(timeParts[2])
        
        // Create a Date object for the event time today
        const eventTime = new Date()
        eventTime.setHours(hours, minutes, 0, 0)
        
        // Only include events that haven't ended yet (current time < event time)
        return currentTime < eventTime
      }
      
      return true // Include events if time parsing fails (safety fallback)
    })

    console.log(`📅 Found ${todaysEvents.length} events today (${upcomingEvents.length} upcoming, ${todaysEvents.length - upcomingEvents.length} already ended)`)

    if (upcomingEvents.length > 0) {
      // Find all users with bookings for today's events
      const todaysBookings = await Booking.find({
        date: {
          $gte: today,
          $lt: tomorrow
        },
        status: 'approved'
      })

      console.log(`📋 Found ${todaysBookings.length} approved bookings today`)

      // Filter out bookings that have already ended
      const upcomingBookings = todaysBookings.filter(booking => {
        const timeStr = booking.time.trim()
        const timeParts = timeStr.split('-')[0].match(/(\d+):(\d+)/)
        
        if (timeParts) {
          const hours = parseInt(timeParts[1])
          const minutes = parseInt(timeParts[2])
          const bookingTime = new Date()
          bookingTime.setHours(hours, minutes, 0, 0)
          return currentTime < bookingTime
        }
        return true
      })

      console.log(`📋 ${upcomingBookings.length} bookings haven't started yet`)

      // Send notifications to users with bookings today
      const notifiedUsers = new Set()
      
      for (const booking of upcomingBookings) {
        if (!notifiedUsers.has(booking.email)) {
          await sendEventNotification(
            booking.email,
            '📅 Your Event is Today!',
            `Don't forget: You have a booking for ${booking.venue} today at ${booking.time}. Purpose: ${booking.purpose}`,
            { 
              bookingId: booking._id,
              venue: booking.venue,
              time: booking.time,
              eventDate: 'today'
            }
          )
          notifiedUsers.add(booking.email)
        }
      }

      // Also notify about general events happening today (only upcoming ones)
      for (const event of upcomingEvents) {
        // Get all users who might be interested (excluding admin)
        const allUsers = ['staff@msec.edu.in', 'hod@msec.edu.in', 'principal@msec.edu.in']
        
        console.log(`📧 Sending notifications for today's event: ${event.title}`)
        
        for (const userEmail of allUsers) {
          // Send notification for each event with unique title including event name
          await sendEventNotification(
            userEmail,
            `🎉 Today: ${event.title}`,
            `${event.title} is happening today at ${event.time} in ${event.venue}. ${event.description}`,
            {
              eventId: event._id,
              eventTitle: event.title,
              venue: event.venue,
              time: event.time,
              eventDate: 'today'
            }
          )
        }
      }
    }

  } catch (error) {
    console.error('Error checking today\'s events:', error)
  }
}

// Function to check tomorrow's events
async function checkTomorrowsEvents() {
  try {
    console.log('🔍 Checking for tomorrow\'s events...')
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const dayAfter = new Date(tomorrow)
    dayAfter.setDate(dayAfter.getDate() + 1)

    // Find events happening tomorrow
    const tomorrowsEvents = await Event.find({
      date: {
        $gte: tomorrow,
        $lt: dayAfter
      }
    })

    console.log(`📅 Found ${tomorrowsEvents.length} events tomorrow`)

    if (tomorrowsEvents.length > 0) {
      // Find all users with bookings for tomorrow's events
      const tomorrowsBookings = await Booking.find({
        date: {
          $gte: tomorrow,
          $lt: dayAfter
        },
        status: 'approved'
      })

      console.log(`📋 Found ${tomorrowsBookings.length} approved bookings tomorrow`)

      // Send notifications to users with bookings tomorrow
      const notifiedUsers = new Set()
      
      for (const booking of tomorrowsBookings) {
        // Send a notification for each booking, even if user has multiple
        await sendEventNotification(
          booking.email,
          '📅 Reminder: Event Tomorrow!',
          `Just a reminder: You have a booking for ${booking.venue} tomorrow at ${booking.time}-${booking.endTime || 'end'}. Venue: ${booking.venue}`,
          { 
            bookingId: booking._id,
            venue: booking.venue,
            time: booking.time,
            eventDate: 'tomorrow'
          }
        )
      }

      // Also notify about general events happening tomorrow
      for (const event of tomorrowsEvents) {
        // Get all users who might be interested (excluding admin)
        const allUsers = ['staff@msec.edu.in', 'hod@msec.edu.in', 'principal@msec.edu.in']
        
        console.log(`📧 Sending notifications for event: ${event.title}`)
        
        for (const userEmail of allUsers) {
          // Send notification for each event with unique title including event name
          await sendEventNotification(
            userEmail,
            `🔔 Tomorrow: ${event.title}`,
            `Reminder: ${event.title} is scheduled for tomorrow at ${event.time} in ${event.venue}. ${event.description}`,
            {
              eventId: event._id,
              eventTitle: event.title,
              venue: event.venue,
              time: event.time,
              eventDate: 'tomorrow'
            }
          )
        }
      }
    }

  } catch (error) {
    console.error('Error checking tomorrow\'s events:', error)
  }
}

// Main function to run event notifications
async function runEventNotifications() {
  try {
    console.log('🚀 Starting event notification service...')
    await connectToDatabase()
    
    await checkTodaysEvents()
    await checkTomorrowsEvents()
    
    console.log('✅ Event notification check completed')
  } catch (error) {
    console.error('❌ Event notification service error:', error)
  }
}

// Export functions for use in other modules
export { runEventNotifications, checkTodaysEvents, checkTomorrowsEvents, sendEventNotification }

// If this file is run directly, execute the notifications
if (import.meta.url === `file://${process.argv[1]}`) {
  runEventNotifications().then(() => {
    console.log('📅 Event notification service finished')
    process.exit(0)
  }).catch(error => {
    console.error('❌ Service failed:', error)
    process.exit(1)
  })
}