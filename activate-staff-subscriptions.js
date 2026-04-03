import { connectToDatabase } from './lib/mongo.js';

async function activateStaffSubscriptions() {
  console.log('\n🔧 ACTIVATING STAFF SUBSCRIPTIONS\n');
  console.log('='.repeat(70));

  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    const collection = db.collection('push_subscriptions');

    // Find all inactive subscriptions for staff@msec.edu.in
    const staffInactiveSubs = await collection.find({
      userEmail: 'staff@msec.edu.in',
      active: false
    }).toArray();

    console.log(`📊 Found ${staffInactiveSubs.length} inactive subscriptions for staff@msec.edu.in`);

    if (staffInactiveSubs.length === 0) {
      console.log('❌ No inactive subscriptions found for staff user');
      console.log('Staff may need to enable notifications manually first');
      await mongoose.connection.close();
      return;
    }

    // Activate all staff subscriptions
    const result = await collection.updateMany(
      { userEmail: 'staff@msec.edu.in', active: false },
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

    console.log(`✅ Activated ${result.modifiedCount} subscriptions for staff@msec.edu.in`);

    // Verify the activation
    const staffActiveSubs = await collection.find({
      userEmail: 'staff@msec.edu.in',
      active: true
    }).toArray();

    console.log(`📱 Staff now has ${staffActiveSubs.length} active subscriptions`);

    // Show subscription details
    staffActiveSubs.forEach((sub, index) => {
      console.log(`   ${index + 1}. Endpoint: ${sub.subscription.endpoint.substring(0, 50)}...`);
    });

    console.log('\n✅ STAFF SUBSCRIPTIONS ACTIVATED SUCCESSFULLY');
    console.log('Note: If notifications still don\'t work, staff may need to re-enable them in Settings due to VAPID key changes.');

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error activating staff subscriptions:', error);
  }
}

activateStaffSubscriptions();