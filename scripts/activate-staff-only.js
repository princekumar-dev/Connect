import { connectToDatabase } from '../lib/mongo.js'

const STAFF_EMAIL = 'staff@msec.edu.in'
const OFFICIAL_USERS = [
  'admin@msec.edu.in',
  'principal@msec.edu.in',
  'hod@msec.edu.in',
  'secretary@msec.edu.in',
  'staff@msec.edu.in'
]

function makeDefaultSubscription(email) {
  return {
    endpoint: `https://default.msec.edu.in/subscription/${encodeURIComponent(email)}`,
    keys: { p256dh: 'default-p256dh-key', auth: 'default-auth-key' }
  }
}

async function activateStaffOnly() {
  console.log('\n🔧 Activating staff as the only active subscriber')
  console.log('='.repeat(70))

  const mongoose = await connectToDatabase()
  const db = mongoose.connection.db
  const col = db.collection('push_subscriptions')

  // Deactivate everyone except staff
  const res = await col.updateMany(
    { userEmail: { $ne: STAFF_EMAIL } },
    { $set: { active: false, deactivatedAt: new Date(), deactivatedReason: 'staff_only' } }
  )
  console.log(`🛑 Deactivated ${res.modifiedCount || 0} subscription(s) for non-staff users`)

  // Ensure staff has exactly one active
  await col.updateMany(
    { userEmail: STAFF_EMAIL },
    { $set: { active: false, deactivatedAt: new Date(), deactivatedReason: 'staff_only_reset' } }
  )

  // Prefer an existing non-default sub for staff if present
  const existingReal = await col.findOne({ userEmail: STAFF_EMAIL, isDefault: { $ne: true } })
  const subscription = existingReal?.subscription || makeDefaultSubscription(STAFF_EMAIL)

  await col.insertOne({
    userEmail: STAFF_EMAIL,
    subscription,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: !existingReal
  })

  // Verify
  const summary = await col.aggregate([
    { $group: { _id: '$userEmail', total: { $sum: 1 }, active: { $sum: { $cond: ['$active', 1, 0] } } } },
    { $sort: { _id: 1 } }
  ]).toArray()

  console.log('\n📊 Current counts:')
  summary.forEach(r => console.log(`   ${r._id}: total=${r.total}, active=${r.active}`))

  await mongoose.connection.close()
  console.log('\n✅ Done. Staff is the only active subscriber.')
}

activateStaffOnly().catch(err => { console.error('❌ Error:', err); process.exit(1) })
