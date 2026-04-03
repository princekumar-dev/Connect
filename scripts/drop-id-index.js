import mongoose from 'mongoose'
import { connectToDatabase } from '../lib/mongo.js'

async function run() {
  try {
    await connectToDatabase()
    const col = mongoose.connection.db.collection('users')

    const indexes = await col.indexes()
    console.log('Existing indexes on users:')
    indexes.forEach(i => console.log('-', i.name, JSON.stringify(i.key)))

    const hasIdIndex = indexes.some(i => i.name === 'id_1' || (i.key && i.key.id === 1))
    if (!hasIdIndex) {
      console.log('No id_1 index found. Nothing to do.')
      process.exit(0)
    }

    console.log('Dropping index id_1...')
    await col.dropIndex('id_1')
    console.log('Dropped id_1 index successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Error while dropping id_1 index:', err.message || err)
    process.exit(1)
  }
}

run()
