import { connectToDatabase } from './lib/mongo.js';

async function cleanupDuplicateSubscriptions() {
  console.log('\n🧹 PUSH SUBSCRIPTION CLEANUP\n');
  console.log('='.repeat(70));

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    const collection = db.collection('push_subscriptions');

    // Get all subscriptions
    const allSubscriptions = await collection.find({}).toArray();
    console.log(`\n📊 Found ${allSubscriptions.length} total push subscriptions`);

    // Find subscriptions by endpoint (to detect duplicates)
    const subscriptionsByEndpoint = new Map();
    
    // Group subscriptions by endpoint
    allSubscriptions.forEach(sub => {
      const endpoint = sub.subscription.endpoint;
      if (!subscriptionsByEndpoint.has(endpoint)) {
        subscriptionsByEndpoint.set(endpoint, []);
      }
      subscriptionsByEndpoint.get(endpoint).push(sub);
    });
    
    // Find duplicates (endpoints with more than 1 subscription)
    let duplicateEndpoints = 0;
    let duplicateEntries = 0;
    let fixedEndpoints = 0;
    
    for (const [endpoint, subs] of subscriptionsByEndpoint.entries()) {
      if (subs.length > 1) {
        duplicateEndpoints++;
        duplicateEntries += subs.length - 1;
        
        console.log(`\n⚠️ Found ${subs.length} subscriptions for the same endpoint:`);
        console.log(`   📱 Endpoint: ${endpoint.substring(0, 60)}...`);
        
        // Sort by updatedAt or createdAt (most recent first)
        subs.sort((a, b) => {
          const aDate = a.updatedAt || a.createdAt;
          const bDate = b.updatedAt || b.createdAt;
          return bDate - aDate;
        });
        
        // Keep the most recent one, delete others
        const mostRecent = subs[0];
        console.log(`   ✅ Keeping: ${mostRecent.userEmail} (${mostRecent.createdAt.toLocaleString()})`);
        
        // Delete all others
        for (let i = 1; i < subs.length; i++) {
          const oldSub = subs[i];
          console.log(`   ❌ Deleting: ${oldSub.userEmail} (${oldSub.createdAt.toLocaleString()})`);
          await collection.deleteOne({ _id: oldSub._id });
        }
        
        fixedEndpoints++;
      }
    }
    
    // Look for inactive subscriptions
    const inactiveSubscriptions = allSubscriptions.filter(sub => sub.active === false);
    
    // Check for subscribers with multiple endpoints (different browsers/devices)
    const userEndpoints = new Map();
    allSubscriptions.forEach(sub => {
      if (!userEndpoints.has(sub.userEmail)) {
        userEndpoints.set(sub.userEmail, []);
      }
      userEndpoints.get(sub.userEmail).push(sub);
    });
    
    let usersWithMultipleDevices = 0;
    
    for (const [user, subs] of userEndpoints.entries()) {
      if (subs.length > 1) {
        usersWithMultipleDevices++;
        console.log(`\n👤 ${user} has ${subs.length} subscriptions (multiple devices):`);
        
        subs.forEach((sub, i) => {
          console.log(`   ${i+1}. Endpoint: ${sub.subscription.endpoint.substring(0, 30)}...`);
          console.log(`      Created: ${sub.createdAt.toLocaleString()}`);
          console.log(`      Active: ${sub.active}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('\n📊 CLEANUP SUMMARY:');
    console.log('-'.repeat(70));
    console.log(`✅ Total subscriptions: ${allSubscriptions.length}`);
    console.log(`⚠️ Duplicate endpoints: ${duplicateEndpoints}`);
    console.log(`🗑️ Duplicate entries removed: ${duplicateEntries}`);
    console.log(`✅ Endpoints fixed: ${fixedEndpoints}`);
    console.log(`⚠️ Inactive subscriptions: ${inactiveSubscriptions.length}`);
    console.log(`👥 Users with multiple devices: ${usersWithMultipleDevices}`);
    
    // Get users with active subscriptions after cleanup
    const activeUsers = new Set();
    
    // Re-query after cleanup
    const finalSubscriptions = await collection.find({active: true}).toArray();
    finalSubscriptions.forEach(sub => {
      activeUsers.add(sub.userEmail);
    });
    
    console.log(`\n📱 Users with active subscriptions (${activeUsers.size}):`);
    console.log('-'.repeat(70));
    
    Array.from(activeUsers).forEach(user => {
      const userSubs = finalSubscriptions.filter(sub => sub.userEmail === user);
      console.log(`✅ ${user}: ${userSubs.length} active subscription(s)`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ CLEANUP COMPLETED');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupDuplicateSubscriptions();