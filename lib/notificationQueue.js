import { getUserSubscriptions, storeNotification } from './notificationService.js'
import webpush from 'web-push'

// Notification Queue Manager
class NotificationQueueManager {
  constructor() {
    this.queue = new Map() // userEmail -> notification queue
    this.processing = new Map() // userEmail -> processing status
    this.rateLimits = new Map() // userEmail -> { count, resetTime }
    this.batchTimers = new Map() // userEmail -> timer for batching
    
    // Configuration
    this.MAX_NOTIFICATIONS_PER_MINUTE = 5
    this.BATCH_DELAY_MS = 3000 // Wait 3 seconds to batch notifications
    this.RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
  }

  // Check if user is within rate limits
  checkRateLimit(userEmail) {
    const now = Date.now()
    const userLimit = this.rateLimits.get(userEmail)
    
    if (!userLimit || now > userLimit.resetTime) {
      // Reset or create new rate limit window
      this.rateLimits.set(userEmail, {
        count: 0,
        resetTime: now + this.RATE_LIMIT_WINDOW_MS
      })
      return true
    }
    
    return userLimit.count < this.MAX_NOTIFICATIONS_PER_MINUTE
  }

  // Add notification to queue with batching
  queueNotification(userEmail, notification, options = {}) {
    console.log(`📬 Queueing notification for ${userEmail}: ${notification.title}`)
    
    // ALL booking notifications should be sent instantly to prevent delays
    // This includes: created, approved, rejected, deleted, cancelled, reassigned
    const instantTypes = ['created', 'approved', 'rejected', 'deleted', 'cancelled', 'reassigned']
    const isInstant = instantTypes.includes(notification.type) || options.instant
    
    if (isInstant) {
      console.log(`⚡ Instant notification (${notification.type}) - sending immediately without delay`)
      // Send instantly without batching delay
      this.sendSingleNotification(userEmail, notification)
      return
    }
    
    // Only batch non-booking notifications (future feature)
    // Initialize queue if not exists
    if (!this.queue.has(userEmail)) {
      this.queue.set(userEmail, [])
    }
    
    // Add to queue
    this.queue.get(userEmail).push({
      ...notification,
      timestamp: Date.now()
    })
    
    // Clear existing batch timer if any
    if (this.batchTimers.has(userEmail)) {
      clearTimeout(this.batchTimers.get(userEmail))
    }
    
    // Set batch timer for remaining notification types
    const timer = setTimeout(() => {
      this.processBatchForUser(userEmail)
    }, this.BATCH_DELAY_MS)
    
    this.batchTimers.set(userEmail, timer)
  }

  // Process batched notifications for a user
  async processBatchForUser(userEmail) {
    if (this.processing.get(userEmail)) {
      console.log(`📧 Skipping batch for ${userEmail} - already processing`)
      return
    }
    
    const notifications = this.queue.get(userEmail) || []
    if (notifications.length === 0) return
    
    this.processing.set(userEmail, true)
    this.queue.set(userEmail, []) // Clear queue
    
    try {
      console.log(`📦 Processing ${notifications.length} notifications for ${userEmail}`)
      
      // Check rate limit
      if (!this.checkRateLimit(userEmail)) {
        console.log(`⚠️ Rate limit exceeded for ${userEmail}, delaying notifications`)
        
        // Re-queue notifications for later
        setTimeout(() => {
          notifications.forEach(notif => this.queueNotification(userEmail, notif))
        }, this.RATE_LIMIT_WINDOW_MS)
        
        this.processing.set(userEmail, false)
        return
      }
      
      if (notifications.length === 1) {
        // Single notification - send as is
        await this.sendSingleNotification(userEmail, notifications[0])
      } else {
        // Multiple notifications - batch them
        await this.sendBatchedNotification(userEmail, notifications)
      }
      
      // Update rate limit counter
      const userLimit = this.rateLimits.get(userEmail)
      if (userLimit) {
        userLimit.count += 1
      }
      
    } catch (error) {
      console.error(`❌ Error processing notifications for ${userEmail}:`, error)
    } finally {
      this.processing.set(userEmail, false)
    }
  }

  // Send single notification
  async sendSingleNotification(userEmail, notification) {
    try {
      const { subscriptions } = await getUserSubscriptions(userEmail)
      
      if (!subscriptions || subscriptions.length === 0) {
        console.log(`📧 No subscriptions for ${userEmail}`)
        return
      }
      
      console.log(`📧 Sending single notification to ${userEmail}: ${notification.title}`)
      
      // Create UNIQUE tag for each notification to prevent browser merging
      const randomId = Math.random().toString(36).substring(2, 9)
      const uniqueTag = `booking-${notification.data?.bookingId || 'general'}-${notification.type || 'notification'}-${Date.now()}-${randomId}`
      
      console.log(`   🏷️  Unique Tag: ${uniqueTag}`)
      
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: '/images/android-chrome-192x192.png',
        badge: '/images/favicon-32x32.png',
        tag: uniqueTag, // UNIQUE tag prevents notification merging
        vibrate: [200, 100, 200],
        requireInteraction: true,
        silent: false,
        renotify: true, // Always show as new notification
        url: notification.url || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking-status`,
        data: { ...notification.data, notificationId: uniqueTag, url: notification.url || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking-status` }
      })

      // Send to all user devices
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub.subscription, payload)
          console.log(`✅ Notification sent to ${userEmail}`)
        } catch (error) {
          console.error(`❌ Failed to send to ${userEmail}:`, error.message)
        }
      }

      // Store in database
      await storeNotification({
        userEmail,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        data: notification.data
      })

    } catch (error) {
      console.error(`❌ Error sending single notification:`, error)
    }
  }

  // Send batched notification (multiple bookings combined)
  async sendBatchedNotification(userEmail, notifications) {
    try {
      const { subscriptions } = await getUserSubscriptions(userEmail)
      
      if (!subscriptions || subscriptions.length === 0) {
        console.log(`📧 No subscriptions for ${userEmail}`)
        return
      }
      
      console.log(`📦 Sending batched notification to ${userEmail} (${notifications.length} items)`)
      
      // Group notifications by type
      const groupedByType = notifications.reduce((acc, notif) => {
        if (!acc[notif.type]) acc[notif.type] = []
        acc[notif.type].push(notif)
        return acc
      }, {})
      
      // Create summary notification
      let title = '📅 Multiple Booking Updates'
      let body = ''
      
      Object.entries(groupedByType).forEach(([type, notifs]) => {
        const count = notifs.length
        switch (type) {
          case 'created':
            body += `✅ ${count} booking${count > 1 ? 's' : ''} submitted\n`
            break
          case 'approved':
            body += `✅ ${count} booking${count > 1 ? 's' : ''} approved\n`
            break
          case 'rejected':
            body += `❌ ${count} booking${count > 1 ? 's' : ''} rejected\n`
            break
          case 'cancelled':
            body += `🚫 ${count} booking${count > 1 ? 's' : ''} cancelled\n`
            break
          case 'reassigned':
            body += `🔄 ${count} venue${count > 1 ? 's' : ''} reassigned\n`
            break
        }
      })
      
      body += `\nTap to view details for all ${notifications.length} updates.`

      // Create UNIQUE tag for batched notification
      const randomId = Math.random().toString(36).substring(2, 9)
      const uniqueTag = `batch-${userEmail.split('@')[0]}-${Date.now()}-${randomId}`

      const payload = JSON.stringify({
        title,
        body: body.trim(),
        icon: '/images/android-chrome-192x192.png',
        badge: '/images/favicon-32x32.png',
        tag: uniqueTag, // UNIQUE tag prevents notification merging
        vibrate: [200, 100, 200],
        requireInteraction: true,
        silent: false,
        renotify: true, // Always show as new notification
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking-status`,
        data: { 
          type: 'batched',
          count: notifications.length,
          items: notifications.map(n => n.data),
          notificationId: uniqueTag,
          url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking-status`
        }
      })

      // Send to all user devices
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub.subscription, payload)
          console.log(`✅ Batched notification sent to ${userEmail}`)
        } catch (error) {
          console.error(`❌ Failed to send batched to ${userEmail}:`, error.message)
        }
      }

      // Store individual notifications in database
      for (const notification of notifications) {
        await storeNotification({
          userEmail,
          title: notification.title,
          body: notification.body,
          type: notification.type,
          data: notification.data
        })
      }

    } catch (error) {
      console.error(`❌ Error sending batched notification:`, error)
    }
  }

  // Force process all queued notifications (for shutdown)
  async flushAll() {
    console.log('🔄 Flushing all queued notifications...')
    
    // Clear all batch timers
    this.batchTimers.forEach(timer => clearTimeout(timer))
    this.batchTimers.clear()
    
    // Process all queued notifications
    const promises = Array.from(this.queue.keys()).map(userEmail => 
      this.processBatchForUser(userEmail)
    )
    
    await Promise.all(promises)
    console.log('✅ All notifications flushed')
  }
}

// Global notification queue manager instance
const notificationQueue = new NotificationQueueManager()

// Enhanced notification function with queuing
export async function sendBookingNotification(booking, notificationType, additionalInfo = {}) {
  try {
    console.log(`📧 Queuing ${notificationType} notification for ${booking.email}`)
    
    let title, body
    const bookingDate = new Date(booking.date).toLocaleDateString()
    
    switch (notificationType) {
      case 'created':
        if (booking.status === 'approved') {
          title = '✅ Booking Approved!'
          body = `Your booking for ${booking.venue} on ${bookingDate} at ${booking.time} has been automatically approved.`
        } else {
          title = '📋 Booking Submitted'
          body = `Your booking for ${booking.venue} on ${bookingDate} at ${booking.time} is pending approval.`
        }
        break
      case 'approved':
        title = '✅ Booking Approved!'
        body = `Great news! Your booking for ${booking.venue} on ${bookingDate} at ${booking.time} has been approved.`
        break
      case 'rejected':
        title = '❌ Booking Rejected'
        body = `Sorry, your booking for ${booking.venue} on ${bookingDate} at ${booking.time} has been rejected.`
        break
      case 'cancelled':
        title = '🚫 Booking Cancelled'
        body = `Your booking for ${booking.venue} on ${bookingDate} at ${booking.time} has been cancelled.`
        if (additionalInfo.reason) {
          body += ` Reason: ${additionalInfo.reason}`
        }
        break
      case 'deleted':
        title = '🗑️ Booking Deleted'
        body = `Your booking for ${booking.venue} on ${bookingDate} at ${booking.time} has been deleted.`
        if (additionalInfo.reason) {
          body += ` Reason: ${additionalInfo.reason}`
        }
        break
      case 'reassigned':
        title = '🔄 Venue Changed'
        body = `Your booking has been moved from ${additionalInfo.originalVenue} to ${booking.venue} on ${bookingDate} at ${booking.time}.`
        break
      default:
        title = '📅 Booking Update'
        body = `Your booking for ${booking.venue} on ${bookingDate} at ${booking.time} has been updated.`
    }

    // ALL booking notifications should be sent instantly (no delays)
    // This ensures immediate feedback for users on all booking actions
    
    // Add to notification queue (will be sent instantly based on type)
    notificationQueue.queueNotification(booking.email, {
      title,
      body,
      type: notificationType,
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/booking-status`,
      data: { 
        bookingId: booking._id, 
        type: notificationType,
        venue: booking.venue,
        date: bookingDate,
        time: booking.time,
        ...additionalInfo
      }
    }, { instant: true }) // All booking notifications sent instantly

    console.log(`📬 Notification queued (instant) successfully for ${booking.email}`)

  } catch (error) {
    console.error('❌ Error queuing notification:', error)
  }
}

// Export the queue manager for manual flushing if needed
export { notificationQueue }

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Gracefully shutting down notification system...')
  await notificationQueue.flushAll()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🔄 Gracefully shutting down notification system...')
  await notificationQueue.flushAll()
  process.exit(0)
})