import jwt from 'jsonwebtoken'
import { User } from '../models.js'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development'

export function generateToken(user) {
  return jwt.sign(
    { id: user._id || user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

export async function authenticateRequest(req, res, next) {
  // Strip potentially spoofed headers
  delete req.headers.useremail
  delete req.headers['user-email']
  delete req.headers.userrole
  delete req.headers['user-role']
  delete req.headers.isadmin
  delete req.headers.isAdmin

  // Try multiple auth methods: header → cookie → query param
  let token = null

  // 1. Authorization header
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  }

  // 2. Cookie (most reliable for Vercel proxy)
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map(c => c.trim())
    for (const c of cookies) {
      const [name, value] = c.split('=')
      if (name === 'auth_token' && value) {
        token = decodeURIComponent(value)
        break
      }
    }
  }

  // 3. Query param fallback
  if (!token && req.query && req.query.token) {
    token = req.query.token
  }

  if (token) {
    const decoded = verifyToken(token)
    if (decoded) {
      req.user = decoded
      req.headers.useremail = decoded.email
      req.headers.userrole = decoded.role
      
      const adminRoles = ['admin', 'principal', 'secretary']
      if (adminRoles.includes(decoded.role)) {
        req.headers.isadmin = 'true'
        req.headers.isAdmin = 'true'
      }
    }
  }
  next()
}

export function requireAuthentication(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' })
  }
  next()
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' })
  }
  
  const adminRoles = ['admin', 'principal', 'secretary']
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' })
  }
  next()
}
