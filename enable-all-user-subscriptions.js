import { connectToDatabase } from './lib/mongo.js';

async function enableAllUserSubscriptions() {
  console.log('\n🔄 ENABLING SUBSCRIPTIONS FOR ALL USERS\n');
  console.log('='.repeat(70));

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    const collection = db.collection('push_subscriptions');

    // Get all users from the database (assuming there's a users collection)
    const usersCollection = db.collection('users');
    const allUsers = await usersCollection.find({}).toArray();

    console.log(`👥 Found ${allUsers.length} users in the system`);

    let enabledCount = 0;
    let skippedCount = 0;

    for (const user of allUsers) {
      const userEmail = user.email;
      console.log(`\n🔍 Processing user: ${userEmail} (${user.role})`);

      // Check if user already has an active subscription
      const existingActive = await collection.findOne({
        userEmail,
        active: true
      });

      if (existingActive) {
        console.log(`   ✅ User already has active subscription - skipping`);
        skippedCount++;
        continue;
      }

      // Check if user has any inactive subscriptions we can reactivate
      const inactiveSubs = await collection.find({
        userEmail,
        active: false
      }).toArray();

      if (inactiveSubs.length > 0) {
        // Reactivate the most recent inactive subscription
        const mostRecent = inactiveSubs.sort((a, b) => {
          const aTime = a.updatedAt || a.createdAt || new Date(0);
          const bTime = b.updatedAt || b.createdAt || new Date(0);
          return bTime - aTime;
        })[0];

        await collection.updateOne(
          { _id: mostRecent._id },
          {
            $set: {
              active: true,
              updatedAt: new Date()
            },
            $unset: {
              deactivatedAt: '',
              deactivatedReason: ''
            }
          }
        );

        console.log(`   🔄 Reactivated existing subscription for ${userEmail}`);
        enabledCount++;
      } else {
        console.log(`   ℹ️  No existing subscriptions for ${userEmail} - will be enabled when they login and open Settings`);
        skippedCount++;
      }
    }

    // Final verification
    const finalActive = await collection.find({ active: true }).toArray();
    console.log(`\n📊 FINAL RESULTS:`);
    console.log(`✅ Enabled subscriptions: ${enabledCount}`);
    console.log(`⏭️ Skipped users: ${skippedCount}`);
    console.log(`📱 Total active subscriptions: ${finalActive.length}`);

    console.log(`\n💡 REMINDER:`);
    console.log(`Users without existing subscriptions will get notifications enabled automatically`);
    console.log(`when they login and open the Settings panel.`);

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error enabling subscriptions for all users:', error);
  }
}

enableAllUserSubscriptions();