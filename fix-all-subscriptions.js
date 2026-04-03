import { connectToDatabase } from './lib/mongo.js';
import webpush from 'web-push';

// VAPID Keys from environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BI3ZQwdtuxxYpepMvZjy5xkuzLbnsjG8J1jfBkGMi0AzbhWDocIASZkq6ocisfwCTnYCHuogo_O-PJSuyfGWwkU';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'hfn59n2ZF4qdGGl1kiuZ_zglStMTBIqN0CxC49jXUMc';

// Configure web-push
webpush.setVapidDetails(
  'mailto:support@msecconnect.edu',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Fix all subscriptions in the database
async function fixAllSubscriptions() {
  console.log('\n🔧 FIXING ALL PUSH SUBSCRIPTIONS\n');
  console.log('='.repeat(70));
  console.log('\nThis script fixes issues with user subscriptions during switching.\n');

  try {
    // Connect to database
    console.log('🔄 Connecting to MongoDB...');
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    const collection = db.collection('push_subscriptions');
    console.log('✅ Connected to MongoDB database');
    
    // Get all subscriptions
    const allSubscriptions = await collection.find({}).toArray();
    console.log(`📊 Found ${allSubscriptions.length} total subscriptions`);
    
    // Step 1: Group subscriptions by endpoint
    console.log('\n🔍 Checking for duplicate endpoints...');
    const endpointMap = new Map();
    
    for (const sub of allSubscriptions) {
      const endpoint = sub.subscription.endpoint;
      if (!endpointMap.has(endpoint)) {
        endpointMap.set(endpoint, []);
      }
      endpointMap.get(endpoint).push(sub);
    }
    
    // Step 2: Fix subscriptions with multiple users for same endpoint
    let fixedCount = 0;
    
    for (const [endpoint, subs] of endpointMap.entries()) {
      if (subs.length > 1) {
        console.log(`\n⚠️ Found endpoint shared by ${subs.length} subscriptions:`);
        
        // Check how many are marked as active
        const activeSubs = subs.filter(sub => sub.active === true);
        
        if (activeSubs.length > 1) {
          console.log(`   ❌ ERROR: ${activeSubs.length} subscriptions are active for the same endpoint`);
          
          // Find the most recently updated subscription
          activeSubs.sort((a, b) => {
            const aDate = a.updatedAt || a.createdAt;
            const bDate = b.updatedAt || b.createdAt;
            return bDate - aDate;
          });
          
          const mostRecent = activeSubs[0];
          console.log(`   ✅ Keeping active subscription for ${mostRecent.userEmail} (most recent)`);
          
          // Deactivate all other subscriptions
          for (let i = 1; i < activeSubs.length; i++) {
            console.log(`   🔄 Deactivating duplicate subscription for ${activeSubs[i].userEmail}`);
            
            await collection.updateOne(
              { _id: activeSubs[i]._id },
              {
                $set: {
                  active: false,
                  deactivatedAt: new Date(),
                  deactivatedReason: 'auto_fixed_duplicate'
                }
              }
            );
            
            fixedCount++;
          }
        } else if (activeSubs.length === 1) {
          console.log(`   ✅ Only one subscription is active for this endpoint (${activeSubs[0].userEmail})`);
        } else {
          console.log(`   ℹ️ No active subscriptions for this endpoint`);
        }
      }
    }
    
    // Step 3: Ensure each user has at most one active subscription
    console.log('\n🔍 Checking for users with multiple active subscriptions...');
    
    // Group by user email
    const userMap = new Map();
    
    for (const sub of allSubscriptions) {
      const email = sub.userEmail;
      if (!userMap.has(email)) {
        userMap.set(email, []);
      }
      userMap.get(email).push(sub);
    }
    
    // Fix users with multiple active subscriptions
    for (const [email, subs] of userMap.entries()) {
      const activeSubs = subs.filter(sub => sub.active === true);
      
      if (activeSubs.length > 1) {
        console.log(`\n⚠️ User ${email} has ${activeSubs.length} active subscriptions`);
        
        // Sort by most recent
        activeSubs.sort((a, b) => {
          const aDate = a.updatedAt || a.createdAt;
          const bDate = b.updatedAt || b.createdAt;
          return bDate - aDate;
        });
        
        const mostRecent = activeSubs[0];
        console.log(`   ✅ Keeping subscription with endpoint: ${mostRecent.subscription.endpoint.substring(0, 30)}...`);
        
        // Deactivate all other subscriptions
        for (let i = 1; i < activeSubs.length; i++) {
          console.log(`   🔄 Deactivating older subscription: ${activeSubs[i].subscription.endpoint.substring(0, 30)}...`);
          
          await collection.updateOne(
            { _id: activeSubs[i]._id },
            {
              $set: {
                active: false,
                deactivatedAt: new Date(),
                deactivatedReason: 'auto_fixed_multiple_active'
              }
            }
          );
          
          fixedCount++;
        }
      }
    }
    
    // Step 4: Test active subscriptions
    console.log('\n🧪 Testing active subscriptions...');
    
    const activeSubscriptions = await collection.find({ active: true }).toArray();
    let testedCount = 0;
    let failedCount = 0;
    
    for (const sub of activeSubscriptions) {
      console.log(`\n📱 Testing subscription for ${sub.userEmail}...`);
      
      try {
        await webpush.sendNotification(
          sub.subscription,
          JSON.stringify({
            title: 'Subscription Test',
            body: `This is a test to verify your subscription is working correctly.`,
            icon: '/images/android-chrome-192x192.png',
            badge: '/images/favicon-32x32.png',
            tag: `subscription-test-${Date.now()}`,
            data: { url: '/' }
          })
        );
        
        console.log(`   ✅ Test notification sent successfully to ${sub.userEmail}`);
        testedCount++;
      } catch (error) {
        console.error(`   ❌ Failed to send test notification: ${error.message}`);
        console.log(`   🔄 Marking subscription as inactive due to failure`);
        
        await collection.updateOne(
          { _id: sub._id },
          {
            $set: {
              active: false,
              deactivatedAt: new Date(),
              deactivatedReason: 'failed_test_notification'
            }
          }
        );
        
        failedCount++;
        fixedCount++;
      }
    }
    
    // Final report
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SUBSCRIPTION FIX SUMMARY:');
    console.log(`✅ Fixed ${fixedCount} problematic subscriptions`);
    console.log(`✅ Tested ${testedCount} active subscriptions`);
    console.log(`❌ Found ${failedCount} failed subscriptions (now deactivated)`);
    
    const finalActive = await collection.countDocuments({ active: true });
    const finalInactive = await collection.countDocuments({ active: false });
    
    console.log(`\n📊 FINAL STATUS:`);
    console.log(`✅ Active subscriptions: ${finalActive}`);
    console.log(`⚠️ Inactive subscriptions: ${finalInactive}`);
    
    console.log('\n✅ SUBSCRIPTION FIX COMPLETED\n');
    
    // Close MongoDB connection
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error fixing subscriptions:', error);
  }
}

fixAllSubscriptions();