import { connectToDatabase } from '../lib/mongo.js'
import { User } from '../models.js'
import bcrypt from 'bcryptjs'
import { normalizeBookingRole } from '../lib/bookingRoles.js'

function isValidMsecEmail(email = '') {
  return /^[^\s@]+@msec\.edu\.in$/i.test(email.trim())
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    await connectToDatabase()
  } catch (dbErr) {
    console.error('DB connect error in users API:', dbErr.message)
    return res.status(503).json({ success: false, error: 'Database connection failed' })
  }

  // Enforce admin privileges on all endpoints except POST (user signup)
  if (req.method !== 'POST') {
    const adminRoles = ['admin', 'principal', 'secretary']
    if (!req.user || !adminRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' })
    }
  }

  try {
    if (req.method === 'GET') {
      // list users (admin-only check could be added)
      const users = await User.find().sort({ createdAt: -1 }).lean()
      // Remove sensitive fields before sending to client
      const safe = users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: normalizeBookingRole(u.role),
        autoApprove: !!u.autoApprove,
        priority: u.priority || 'low',
        createdAt: u.createdAt
      }))
      return res.status(200).json({ success: true, users: safe })
    }

    if (req.method === 'POST') {
      // create user
      const { name, email, password, role, autoApprove, priority } = req.body
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'name, email and password are required' })
      }

      if (!isValidMsecEmail(email)) {
        return res.status(400).json({ success: false, error: 'Only @msec.edu.in email addresses are allowed' })
      }

      const normalizedEmail = email.trim().toLowerCase()
      const existing = await User.findOne({ email: normalizedEmail })
      if (existing) {
        return res.status(409).json({ success: false, error: 'User already exists' })
      }

      const hashed = await bcrypt.hash(password, 10)
      const user = new User({
        name,
        email: normalizedEmail,
        password: hashed,
        role: normalizeBookingRole(role),
        autoApprove: !!autoApprove
      })

      await user.save()
      // return safe user object
      const safe = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeBookingRole(user.role),
        autoApprove: user.autoApprove,
        priority: user.priority
      }
      return res.status(201).json({ success: true, user: safe })
    }

    if (req.method === 'DELETE') {
      // Expect JSON body with { userId }
      const { userId } = req.body || {}
      if (!userId) return res.status(400).json({ success: false, error: 'userId required' })

      try {
        const deleted = await User.findByIdAndDelete(userId)
        if (!deleted) return res.status(404).json({ success: false, error: 'User not found' })
        return res.status(200).json({ success: true, deleted: true })
      } catch (delErr) {
        console.error('Error deleting user:', delErr)
        return res.status(500).json({ success: false, error: 'Failed to delete user' })
      }
    }

    // PATCH endpoints for toggles
    if (req.method === 'PATCH') {
      const { action, userId } = req.query
      if (!action || !userId) return res.status(400).json({ success: false, error: 'action and userId required' })

      if (action === 'auto-approve') {
        const { autoApprove } = req.body
        const u = await User.findByIdAndUpdate(userId, { autoApprove: !!autoApprove }, { new: true }).lean()
        return res.status(200).json({ success: true, user: { id: u._id, autoApprove: u.autoApprove } })
      }

      if (action === 'priority') {
        const { priority } = req.body
        if (!['low','medium','high','highest'].includes(priority)) return res.status(400).json({ success: false, error: 'invalid priority' })
        const u = await User.findByIdAndUpdate(userId, { priority }, { new: true }).lean()
        return res.status(200).json({ success: true, user: { id: u._id, priority: u.priority } })
      }

      return res.status(400).json({ success: false, error: 'unknown action' })
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' })
  } catch (err) {
    console.error('Users API error:', err)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
