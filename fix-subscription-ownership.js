import { connectToDatabase } from './lib/mongo.js';

async function fixSubscriptionOwnership() {
  console.log('\n🔧 FIXING SUBSCRIPTION OWNERSHIP\n');
  console.log('='.repeat(70));

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    const collection = db.collection('push_subscriptions');

    // Get all subscriptions
    const allSubscriptions = await collection.find({}).toArray();
    console.log(`📊 Found ${allSubscriptions.length} total subscriptions`);

    // Group by endpoint
    const endpointGroups = {};
    allSubscriptions.forEach(sub => {
      const endpoint = sub.subscription.endpoint;
      if (!endpointGroups[endpoint]) {
        endpointGroups[endpoint] = [];
      }
      endpointGroups[endpoint].push(sub);
    });

    console.log(`📱 Found ${Object.keys(endpointGroups).length} unique endpoints`);

    let fixedCount = 0;
    let deactivatedCount = 0;

    // Process each endpoint group
    for (const [endpoint, subscriptions] of Object.entries(endpointGroups)) {
      console.log(`\n🔍 Processing endpoint: ${endpoint.substring(0, 50)}...`);

      if (subscriptions.length === 1) {
        console.log(`   ✅ Single subscription - OK`);
        continue;
      }

      console.log(`   ⚠️  ${subscriptions.length} subscriptions for same endpoint`);

      // Find active subscriptions for this endpoint
      const activeSubs = subscriptions.filter(sub => sub.active === true);
      const inactiveSubs = subscriptions.filter(sub => sub.active === false);

      console.log(`   📊 Active: ${activeSubs.length}, Inactive: ${inactiveSubs.length}`);

      if (activeSubs.length > 1) {
        console.log(`   🔧 Multiple active subscriptions - fixing...`);

        // Sort by most recent update/create time
        activeSubs.sort((a, b) => {
          const aTime = a.updatedAt || a.createdAt || new Date(0);
          const bTime = b.updatedAt || b.createdAt || new Date(0);
          return bTime - aTime;
        });

        // Keep the most recent one active, deactivate others
        const keepActive = activeSubs[0];
        const toDeactivate = activeSubs.slice(1);

        console.log(`   ✅ Keeping active for: ${keepActive.userEmail}`);
        console.log(`   ❌ Deactivating ${toDeactivate.length} others`);

        for (const sub of toDeactivate) {
          await collection.updateOne(
            { _id: sub._id },
            {
              $set: {
                active: false,
                deactivatedAt: new Date(),
                deactivatedReason: 'duplicate_endpoint_fix'
              }
            }
          );
          deactivatedCount++;
          console.log(`      ❌ Deactivated for: ${sub.userEmail}`);
        }

        fixedCount++;
      } else if (activeSubs.length === 1) {
        console.log(`   ✅ One active subscription - OK`);
      } else {
        console.log(`   ℹ️  No active subscriptions for this endpoint`);
      }
    }

    // Now ensure each user has at most one active subscription
    console.log(`\n👤 Checking per-user subscription limits...`);

    const userGroups = {};
    const updatedSubscriptions = await collection.find({}).toArray();

    updatedSubscriptions.forEach(sub => {
      if (!userGroups[sub.userEmail]) {
        userGroups[sub.userEmail] = [];
      }
      userGroups[sub.userEmail].push(sub);
    });

    for (const [userEmail, subscriptions] of Object.entries(userGroups)) {
      const activeSubs = subscriptions.filter(sub => sub.active === true);

      if (activeSubs.length > 1) {
        console.log(`   ⚠️  ${userEmail} has ${activeSubs.length} active subscriptions - fixing...`);

        // Sort by most recent
        activeSubs.sort((a, b) => {
          const aTime = a.updatedAt || a.createdAt || new Date(0);
          const bTime = b.updatedAt || b.createdAt || new Date(0);
          return bTime - aTime;
        });

        // Keep only the most recent one
        const keepActive = activeSubs[0];
        const toDeactivate = activeSubs.slice(1);

        console.log(`   ✅ Keeping most recent for: ${userEmail}`);
        console.log(`   ❌ Deactivating ${toDeactivate.length} older ones`);

        for (const sub of toDeactivate) {
          await collection.updateOne(
            { _id: sub._id },
            {
              $set: {
                active: false,
                deactivatedAt: new Date(),
                deactivatedReason: 'multiple_user_subscriptions_fix'
              }
            }
          );
          deactivatedCount++;
        }

        fixedCount++;
      }
    }

    // Final verification
    console.log(`\n📊 FINAL VERIFICATION:`);
    const finalSubscriptions = await collection.find({}).toArray();
    const finalActive = finalSubscriptions.filter(sub => sub.active === true);
    const finalInactive = finalSubscriptions.filter(sub => sub.active === false);

    console.log(`✅ Total subscriptions: ${finalSubscriptions.length}`);
    console.log(`✅ Active subscriptions: ${finalActive.length}`);
    console.log(`⚠️ Inactive subscriptions: ${finalInactive.length}`);

    // Check per user
    const userActiveCounts = {};
    finalActive.forEach(sub => {
      userActiveCounts[sub.userEmail] = (userActiveCounts[sub.userEmail] || 0) + 1;
    });

    console.log(`\n👥 Active subscriptions per user:`);
    Object.entries(userActiveCounts).forEach(([user, count]) => {
      console.log(`   ${user}: ${count} active subscription(s)`);
    });

    console.log(`\n✅ FIX COMPLETED:`);
    console.log(`   🔧 Fixed ${fixedCount} endpoint conflicts`);
    console.log(`   ❌ Deactivated ${deactivatedCount} duplicate subscriptions`);
    console.log(`   📱 Now ${finalActive.length} active subscriptions total`);

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error fixing subscription ownership:', error);
  }
}

fixSubscriptionOwnership();