import { connectToDatabase } from '../lib/mongo.js'
import { User } from '../models.js'
import bcrypt from 'bcryptjs'
import { normalizeBookingRole } from '../lib/bookingRoles.js'
import { validatePassword } from '../src/utils/validation.js'

function isValidMsecEmail(email = '') {
  return /^[^\s@]+@msec\.edu\.in$/i.test(email.trim())
}

export default async function handler(req, res) {
  // CORS is already handled by the cors middleware in server.js
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      await connectToDatabase()

      const { email, currentPassword, newPassword } = req.body || {}
      const normalizedEmail = String(email || '').trim().toLowerCase()

      if (!normalizedEmail || !currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Email, current password, and new password are required'
        })
      }

      if (!isValidMsecEmail(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          error: 'Only @msec.edu.in email addresses are allowed'
        })
      }

      const passwordValidationError = validatePassword(newPassword)
      if (passwordValidationError) {
        return res.status(400).json({
          success: false,
          error: passwordValidationError
        })
      }

      const user = await User.findOne({ email: normalizedEmail })
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      const currentPasswordMatches = await bcrypt.compare(currentPassword, user.password)
      if (!currentPasswordMatches) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        })
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)
      user.password = hashedPassword
      await user.save()

      return res.status(200).json({
        success: true,
        message: 'Password updated successfully'
      })
    } catch (error) {
      console.error('Password update error:', error)
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  if (req.method === 'POST') {
    try {
      // Connect to database
      try {
        await connectToDatabase()
      } catch (dbError) {
        console.error('Database connection error:', dbError.message)
        return res.status(503).json({
          success: false,
          error: 'Database connection error. Please check MongoDB connection.'
        })
      }

      const { email, password } = req.body

      // Basic validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        })
      }

      if (!isValidMsecEmail(email)) {
        return res.status(400).json({
          success: false,
          error: 'Only @msec.edu.in email addresses are allowed'
        })
      }

      // Find user in database
      const user = await User.findOne({ email: email.trim().toLowerCase() })
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        })
      }

      // Compare submitted password with hashed password from DB
      const passwordMatches = await bcrypt.compare(password, user.password)
      if (!passwordMatches) {
        return res.status(401).json({
          success: false,
          error: 'Invalid password'
        })
      }

      // Authentication successful
      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: normalizeBookingRole(user.role),
          department: user.department
        }
      })

    } catch (error) {
      console.error('Authentication error:', error)
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    })
  }
}
