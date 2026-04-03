import { connectToDatabase } from './lib/mongo.js'
import { storePushSubscription, getUserSubscriptions } from './lib/notificationService.js'
import webpush from 'web-push'
import dotenv from 'dotenv'

dotenv.config()

console.log('🔧 MANUAL ADMIN SUBSCRIPTION FIX FOR WINDOWS EDGE\n')
console.log('=' .repeat(80))

async function fixAdminSubscription() {
  try {
    await connectToDatabase()
    
    const adminEmail = 'admin@msec.edu.in'
    
    console.log('\n📋 STEP 1: Check Current Subscription')
    console.log('-' .repeat(80))
    
    const currentSubs = await getUserSubscriptions(adminEmail)
    console.log(`Current subscriptions: ${currentSubs.subscriptions?.length || 0}`)
    
    if (currentSubs.subscriptions && currentSubs.subscriptions.length > 0) {
      console.log('\n✅ Admin already has a subscription:')
      currentSubs.subscriptions.forEach((sub, index) => {
        console.log(`\nSubscription ${index + 1}:`)
        console.log(`  Email: ${sub.userEmail}`)
        console.log(`  Endpoint: ${sub.subscription.endpoint.substring(0, 60)}...`)
        console.log(`  Created: ${sub.createdAt}`)
        console.log(`  Active: ${sub.active}`)
      })
      
      console.log('\n📋 STEP 2: Testing Existing Subscription')
      console.log('-' .repeat(80))
      
      // Test the existing subscription
      const testSub = currentSubs.subscriptions[0]
      
      try {
        const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
        const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
        
        webpush.setVapidDetails(
          'mailto:support@msecconnect.edu',
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY
        )
        
        console.log('📤 Sending test notification to admin...')
        
        await webpush.sendNotification(
          testSub.subscription,
          JSON.stringify({
            title: '✅ Admin Notifications Fixed!',
            body: 'Your notifications are working on Windows Edge! This is a test notification.',
            icon: '/images/android-chrome-192x192.png',
            badge: '/images/favicon-32x32.png',
            tag: 'admin-test-' + Date.now(),
            requireInteraction: false,
            renotify: true,
            timestamp: Date.now(),
            data: { 
              url: '/',
              type: 'admin-test'
            }
          })
        )
        
        console.log('✅ Test notification sent successfully!')
        console.log('\n📱 CHECK WINDOWS EDGE:')
        console.log('   - Check Windows Action Center (Win + A)')
        console.log('   - Check browser notification popup')
        console.log('   - Check bottom-right corner of screen')
        
      } catch (error) {
        console.error('\n❌ Error sending test notification:', error.message)
        
        if (error.message.includes('unexpected response code')) {
          console.log('\n⚠️  SUBSCRIPTION IS INVALID/EXPIRED')
          console.log('-' .repeat(80))
          console.log('The subscription endpoint is no longer valid.')
          console.log('\n🔧 FIXING: Deleting old subscription...')
          
          const mongoose = await connectToDatabase()
          const db = mongoose.connection.db
          const collection = db.collection('push_subscriptions')
          
          await collection.deleteMany({ userEmail: adminEmail })
          console.log('✅ Deleted old subscription')
          console.log('\n📌 NEXT STEPS:')
          console.log('1. Admin needs to re-enable notifications in the app')
          console.log('2. Go to: http://localhost:3000')
          console.log('3. Login as admin@msec.edu.in')
          console.log('4. Go to Settings')
          console.log('5. Click "Enable Notifications"')
          console.log('6. Allow when browser prompts')
        }
      }
      
    } else {
      console.log('❌ No subscription found for admin@msec.edu.in')
      console.log('\n📌 ADMIN NEEDS TO ENABLE NOTIFICATIONS:')
      console.log('-' .repeat(80))
      console.log('\n🔍 Let me check if there are ANY subscriptions in database...')
      
      const mongoose = await connectToDatabase()
      const db = mongoose.connection.db
      const collection = db.collection('push_subscriptions')
      
      const allSubs = await collection.find({}).toArray()
      console.log(`\nTotal subscriptions in database: ${allSubs.length}`)
      
      if (allSubs.length > 0) {
        console.log('\n📋 Active subscriptions:')
        allSubs.forEach((sub, index) => {
          console.log(`${index + 1}. ${sub.userEmail} - Created: ${sub.createdAt}`)
        })
      }
      
      console.log('\n' + '=' .repeat(80))
      console.log('🔧 HOW TO FIX - ENABLE NOTIFICATIONS IN WINDOWS EDGE:')
      console.log('=' .repeat(80))
      console.log('\n📌 Option 1: Use the app')
      console.log('   1. Open: http://localhost:3000')
      console.log('   2. Login as admin@msec.edu.in')
      console.log('   3. Click Settings (gear icon)')
      console.log('   4. Scroll to "Push Notifications"')
      console.log('   5. Click "Enable Notifications" button')
      console.log('   6. Click "Allow" when Edge prompts')
      console.log('')
      console.log('📌 Option 2: Use the test page')
      console.log('   1. Open: http://localhost:3000/notification-test.html')
      console.log('   2. Click "🔔 Enable Notifications"')
      console.log('   3. Click "Allow" when Edge prompts')
      console.log('   4. Test with the buttons on the page')
      console.log('')
      console.log('⚠️  If Edge shows "Blocked" or permission is denied:')
      console.log('   1. Click the 🔒 lock icon in address bar')
      console.log('   2. Click "Permissions for this site"')
      console.log('   3. Find "Notifications" dropdown')
      console.log('   4. Change from "Block" to "Allow"')
      console.log('   5. Refresh the page and try again')
      console.log('')
      console.log('💡 After enabling, run this script again to verify:')
      console.log('   node fix-admin-subscription.js')
    }
    
    console.log('\n' + '=' .repeat(80))
    console.log('📊 WINDOWS EDGE NOTIFICATION REQUIREMENTS:')
    console.log('=' .repeat(80))
    console.log('\n✅ Required for notifications to work:')
    console.log('   1. Windows Notifications: Enabled (Windows Settings > Notifications)')
    console.log('   2. Edge Notifications: Allowed (Edge Settings > Site Permissions)')
    console.log('   3. Site Permission: Granted (Lock icon > Notifications > Allow)')
    console.log('   4. Push Subscription: Registered (happens when you click Enable)')
    console.log('   5. Focus Assist: OFF or Priority (Win + A > Focus assist)')
    console.log('')
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

fixAdminSubscription()
