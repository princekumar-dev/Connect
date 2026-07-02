import mongoose from 'mongoose'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 
  process.env.MONGO_URI || 
  process.env.MONGODB_URL || 
  'mongodb://prince55833kumar_db_user:prince55833@ac-pil4ykt-shard-00-00.rsrf96t.mongodb.net:27017,ac-pil4ykt-shard-00-01.rsrf96t.mongodb.net:27017,ac-pil4ykt-shard-00-02.rsrf96t.mongodb.net:27017/msec_connect?replicaSet=atlas-zqgmhf-shard-0&ssl=true&authSource=admin'

if (!MONGODB_URI || MONGODB_URI.includes('undefined')) {
  console.warn('lib/mongo.js: No valid MONGODB_URI found. Using fallback connection string.')
}

// Use a global variable to cache the connection in serverless environments
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
    }

    console.log('🔄 Attempting to connect to MongoDB...')
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Successfully connected to MongoDB')
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}
