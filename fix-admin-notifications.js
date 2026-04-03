import { connectToDatabase } from './lib/mongo.js'
import mongoose from 'mongoose'
import { sendEventNotification } from './event-notifications.js'

console.log('🔧 FIXING ADMIN NOTIFICATIONS FOR WINDOWS CHROME/EDGE\n')
console.log('=' .repeat(80))

async function fixAdminNotifications() {
  try {
    await connectToDatabase()
    
    console.log('\n📋 STEP 1: Checking Admin Push Subscription')
    console.log('-' .repeat(80))
    
    // Define PushSubscription schema
    const PushSubscriptionSchema = new mongoose.Schema({
      userEmail: { type: String, required: true },
      subscription: { type: Object, required: true },
      createdAt: { type: Date, default: Date.now }
    })
    
    const PushSubscription = mongoose.models.PushSubscription || 
                             mongoose.model('PushSubscription', PushSubscriptionSchema)
    
    // Check admin subscription
    const adminEmail = 'admin@msec.edu.in'
    const adminSub = await PushSubscription.findOne({ userEmail: adminEmail })
    
    if (!adminSub) {
      console.log('❌ Admin has NO push subscription registered')
      console.log('\n📌 TO FIX THIS:')
      console.log('-' .repeat(80))
      console.log('1. Open the app: http://localhost:3000')
      console.log('2. Login as admin@msec.edu.in')
      console.log('3. Go to Settings')
      console.log('4. Click "Enable Notifications"')
      console.log('5. Allow notifications when browser prompts')
      console.log('\n💡 OR use the test page:')
      console.log('   http://localhost:3000/notification-test.html')
      console.log('')
      
      console.log('\n🧪 Testing notification delivery WITHOUT subscription...')
      console.log('-' .repeat(80))
      
      try {
        await sendEventNotification(
          adminEmail,
          '🧪 Test Notification (No Subscription)',
          'This will not be delivered because admin has no push subscription',
          { type: 'test', timestamp: Date.now() }
        )
        console.log('⚠️  As expected: Notification queued but not delivered (no subscription)')
      } catch (error) {
        console.log('❌ Error:', error.message)
      }
      
      console.log('\n' + '=' .repeat(80))
      console.log('❌ CANNOT SEND NOTIFICATIONS TO ADMIN')
      console.log('=' .repeat(80))
      console.log('\n🔑 SOLUTION:')
      console.log('Admin MUST enable notifications in the browser first!')
      console.log('\nThe admin needs to:')
      console.log('1. Login to the app')
      console.log('2. Enable browser notifications')
      console.log('3. This will create a push subscription')
      console.log('4. Then notifications will work')
      
    } else {
      console.log('✅ Admin has a push subscription')
      console.log('📅 Created:', adminSub.createdAt)
      console.log('🔗 Endpoint:', adminSub.subscription.endpoint.substring(0, 60) + '...')
      
      console.log('\n📋 STEP 2: Testing Admin Notification Delivery')
      console.log('-' .repeat(80))
      
      // Test notification
      try {
        await sendEventNotification(
          adminEmail,
          '🧪 Admin Test Notification - Windows',
          'This is a test notification for admin@msec.edu.in on Windows Chrome/Edge browser',
          { 
            type: 'admin-test',
            timestamp: Date.now(),
            browser: 'Windows Chrome/Edge'
          }
        )
        console.log('✅ Test notification sent successfully!')
        console.log('\n📱 CHECK YOUR BROWSER:')
        console.log('   - Windows Action Center (Win + A)')
        console.log('   - Browser notification popup')
        console.log('   - Bottom-right corner of screen')
        
      } catch (error) {
        console.log('❌ Error sending notification:', error.message)
        
        if (error.message.includes('unexpected response code')) {
          console.log('\n⚠️  PUSH SUBSCRIPTION EXPIRED/INVALID')
          console.log('-' .repeat(80))
          console.log('The admin\'s push subscription is no longer valid.')
          console.log('\nThis happens when:')
          console.log('- Browser cache was cleared')
          console.log('- Browser data was reset')
          console.log('- Subscription endpoint expired')
          console.log('\n🔧 TO FIX:')
          console.log('1. Delete the old subscription from database')
          console.log('2. Admin re-enables notifications in app')
          console.log('\nRun this command to delete old subscription:')
          console.log('node -e "require(\'./lib/mongo.js\').connectToDatabase().then(() => { const mongoose = require(\'mongoose\'); mongoose.model(\'PushSubscription\').deleteOne({userEmail: \'admin@msec.edu.in\'}).then(() => {console.log(\'Deleted\'); process.exit(0)})})"')
        }
      }
    }
    
    console.log('\n' + '=' .repeat(80))
    console.log('📊 WINDOWS CHROME/EDGE NOTIFICATION CHECKLIST')
    console.log('=' .repeat(80))
    console.log('')
    console.log('✅ Check these on admin\'s computer:')
    console.log('')
    console.log('1. Windows Notification Settings:')
    console.log('   - Windows Settings > System > Notifications')
    console.log('   - Ensure notifications are enabled')
    console.log('   - Check "Get notifications from apps and senders" is ON')
    console.log('')
    console.log('2. Browser Notification Permission:')
    console.log('   Chrome/Edge: Settings > Privacy > Notifications')
    console.log('   - Ensure site is in "Allowed" list')
    console.log('   - NOT in "Blocked" list')
    console.log('')
    console.log('3. Focus Assist (Do Not Disturb):')
    console.log('   - Press Win + A (Action Center)')
    console.log('   - Check Focus Assist is OFF or "Priority only"')
    console.log('   - NOT in "Alarms only" mode')
    console.log('')
    console.log('4. Browser Push Subscription:')
    console.log('   - Admin must enable notifications in app settings')
    console.log('   - Permission must be "granted" (not "denied")')
    console.log('')
    
    console.log('\n' + '=' .repeat(80))
    console.log('🔗 QUICK LINKS FOR ADMIN')
    console.log('=' .repeat(80))
    console.log('\n1. Enable Notifications:')
    console.log('   http://localhost:3000 → Login → Settings → Enable Notifications')
    console.log('\n2. Test Notifications:')
    console.log('   http://localhost:3000/notification-test.html')
    console.log('\n3. Re-run this test:')
    console.log('   node fix-admin-notifications.js')
    console.log('')
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

fixAdminNotifications()
