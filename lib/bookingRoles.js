import { BOOKING_ROLE_PRIORITIES } from '../server-constants.js'

/** Only four roles: admin, principal, secretary, staff */
const VALID_ROLES = ['admin', 'principal', 'secretary', 'staff']

/**
 * Normalize role for booking priority and API responses.
 * Legacy values (hod, user, etc.) map to staff.
 */
export function normalizeBookingRole(role = 'staff') {
  const r = String(role || 'staff').trim().toLowerCase()
  if (VALID_ROLES.includes(r)) return r
  return 'staff'
}

export function getBookingRolePriority(role = 'staff') {
  const r = normalizeBookingRole(role)
  return BOOKING_ROLE_PRIORITIES[r] ?? BOOKING_ROLE_PRIORITIES.staff
}
