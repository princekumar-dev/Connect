export const MSEC_EMAIL_PATTERN = /^[^\s@]+@msec\.edu\.in$/i

export const PASSWORD_MIN_LENGTH = 8

export const validateEmail = (email) => {
  if (!email || !email.trim()) return 'Email is required'
  if (!MSEC_EMAIL_PATTERN.test(email.trim())) return 'Only MSEC institutional emails are allowed (@msec.edu.in)'
  return null
}

export const validatePassword = (password) => {
  if (!password) return 'Password is required'
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
  return null
}

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) return `${fieldName} is required`
  return null
}

export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= PASSWORD_MIN_LENGTH) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { score, label: 'Weak', color: 'text-red-500' }
  if (score <= 4) return { score, label: 'Fair', color: 'text-yellow-500' }
  return { score, label: 'Strong', color: 'text-green-500' }
}
