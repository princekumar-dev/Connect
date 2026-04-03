import { connectToDatabase } from '../lib/mongo.js'

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
    keys: {
      p256dh: 'default-p256dh-key',
      auth: 'default-auth-key'
    }
  }
}

async function resetPushSubscriptions() {
  console.log('\n🔧 Resetting push_subscriptions collection')
  console.log('='.repeat(70))

  const mongoose = await connectToDatabase()
  const db = mongoose.connection.db
  const col = db.collection('push_subscriptions')

  // 1) Remove any test users (not in OFFICIAL_USERS)
  console.log('🧹 Removing non-official user subscriptions...')
  const removeResult = await col.deleteMany({ userEmail: { $nin: OFFICIAL_USERS } })
  console.log(`   🗑️ Removed ${removeResult.deletedCount || 0} non-official subscription docs`)

  // 2) For each official user: remove all existing, insert one default active
  let inserted = 0
  for (const email of OFFICIAL_USERS) {
    console.log(`\n👤 Resetting: ${email}`)
    const del = await col.deleteMany({ userEmail: email })
    console.log(`   🗑️ Cleared ${del.deletedCount || 0} existing for ${email}`)

    const doc = {
      userEmail: email,
      subscription: makeDefaultSubscription(email),
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: true
    }
    const ins = await col.insertOne(doc)
    if (ins.insertedId) {
      inserted++
      console.log(`   ✅ Inserted default active subscription for ${email}`)
    }
  }

  // 3) Show final counts
  const final = await col.aggregate([
    { $group: { _id: '$userEmail', count: { $sum: 1 }, active: { $sum: { $cond: ['$active', 1, 0] } } } },
    { $sort: { _id: 1 } }
  ]).toArray()

  console.log('\n📊 Final subscription counts:')
  final.forEach(row => {
    console.log(`   ${row._id}: total=${row.count}, active=${row.active}`)
  })

  console.log(`\n✅ Done. Inserted ${inserted} default subscriptions for official users.`)
  await mongoose.connection.close()
}

resetPushSubscriptions().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
