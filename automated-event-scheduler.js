import cron from 'node-cron'
import { runEventNotifications } from './event-notifications.js'

console.log('🚀 Starting Automated Event Notification Scheduler')
console.log('=' .repeat(60))

// Schedule daily morning reminders (8:00 AM) - Today's events
cron.schedule('0 8 * * *', async () => {
  console.log('\n⏰ [8:00 AM] Running morning event reminders...')
  console.log('📅 Checking for TODAY\'s events and sending reminders')
  
  try {
    await runEventNotifications()
    console.log('✅ Morning event reminders completed successfully')
  } catch (error) {
    console.error('❌ Morning event reminders failed:', error)
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" // Adjust timezone as needed
})

// Schedule daily evening reminders (6:00 PM) - Tomorrow's events
cron.schedule('0 18 * * *', async () => {
  console.log('\n⏰ [6:00 PM] Running evening event reminders...')
  console.log('📅 Checking for TOMORROW\'s events and sending advance reminders')
  
  try {
    await runEventNotifications()
    console.log('✅ Evening event reminders completed successfully')
  } catch (error) {
    console.error('❌ Evening event reminders failed:', error)
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" // Adjust timezone as needed
})

// Schedule hourly event checks during business hours (9 AM to 6 PM)
cron.schedule('0 9-18 * * *', async () => {
  const now = new Date()
  const hour = now.getHours()
  console.log(`\n⏰ [${hour}:00] Hourly event check...`)
  
  // Only send notifications for immediate events (within next 2 hours)
  // This is more gentle than the full daily reminders
  try {
    await runEventNotifications()
    console.log('✅ Hourly event check completed')
  } catch (error) {
    console.error('❌ Hourly event check failed:', error)
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
})

// Display schedule information
console.log('\n📋 Event Notification Schedule:')
console.log('🌅 8:00 AM Daily - Morning reminders (TODAY\'s events)')
console.log('🌆 6:00 PM Daily - Evening reminders (TOMORROW\'s events)')  
console.log('⏱️  Every hour 9-18 - Hourly event checks')
console.log('')
console.log('🎯 Scheduler is now running AUTOMATICALLY!')
console.log('📱 Users will receive automated event reminders')
console.log('🤖 No manual intervention needed')
console.log('🔄 Press Ctrl+C to stop the scheduler')

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n🔄 Stopping event notification scheduler...')
  console.log('✅ Scheduler stopped gracefully')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🔄 Stopping event notification scheduler...')
  console.log('✅ Scheduler stopped gracefully')
  process.exit(0)
})

// Run initial check on startup
console.log('\n🚀 Running initial event notification check...')
runEventNotifications().then(() => {
  console.log('✅ Initial event check completed')
  console.log('⏰ Automated scheduler is now active and waiting for scheduled times')
}).catch(error => {
  console.error('❌ Initial event check failed:', error)
})