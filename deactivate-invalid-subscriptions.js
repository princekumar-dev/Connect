import { connectToDatabase } from './lib/mongo.js';

async function deactivateInvalidSubscriptions() {
  console.log('\n🔒 Deactivating invalid/expired subscriptions\n');
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    const collection = db.collection('push_subscriptions');

    const allSubs = await collection.find({}).toArray();

    let deactivated = 0;
    for (const sub of allSubs) {
      // Heuristics: if subscription has a flag 'expired' or malformed keys, or an endpoint from wns with errors
      const endpoint = sub.subscription?.endpoint || '';
      const p256dh = sub.subscription?.keys?.p256dh || '';

      let invalid = false;

      // Mark invalid if p256dh length is clearly wrong (not base64-encoded 65-byte key -> length varies, but tests in verify scripts show errors)
      if (p256dh && (p256dh.length < 60 || p256dh.length > 90)) {
        invalid = true;
      }

      // Mark known expired endpoints (WNS / test endpoints) as invalid heuristically
      if (endpoint.includes('wns') || endpoint.includes('test-endpoint') || endpoint.includes('test-realtime')) {
        invalid = true;
      }

      // Also mark if 'active' is true but createdAt is older than 30 days (age-based heuristic)
      if (sub.active && sub.createdAt) {
        const ageDays = (Date.now() - new Date(sub.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > 30) invalid = true;
      }

      if (invalid && sub.active) {
        await collection.updateOne({ _id: sub._id }, { $set: { active: false, deactivatedAt: new Date(), deactivatedReason: 'invalid_or_expired_detected' } });
        deactivated++;
        console.log(`Deactivated subscription for ${sub.userEmail} at ${endpoint.substring(0,60)}...`);
      }
    }

    console.log(`\n✅ Done. Deactivated ${deactivated} subscription(s)`);
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error deactivating subscriptions:', error);
  }
}

deactivateInvalidSubscriptions();