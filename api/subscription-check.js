import express from 'express'
import { connectToDatabase } from '../lib/mongo.js'

// Endpoint to check who's currently registered for this browser's subscription
const router = express.Router()

// Get subscription info (who is registered for this subscription endpoint)
router.post('/', async (req, res) => {
  try {
    const { endpoint } = req.body

    if (!endpoint) {
      return res.status(400).json({ 
        success: false, 
        message: 'Endpoint is required'
      })
    }

    const mongoose = await connectToDatabase()
    const db = mongoose.connection.db
    const collection = db.collection('push_subscriptions')

    // Find subscription by endpoint
    const subscription = await collection.findOne({
      'subscription.endpoint': endpoint
    })

    if (subscription) {
      return res.json({
        success: true,
        found: true,
        userEmail: subscription.userEmail,
        active: subscription.active,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt
      })
    } else {
      return res.json({
        success: true,
        found: false
      })
    }
  } catch (error) {
    console.error('Error checking subscription:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    })
  }
})

export default router