/**
 * Store/query bookings on a single calendar day consistently (UTC midnight for that calendar day).
 * Avoids timezone mismatches between YYYY-MM-DD inputs and Mongo Date comparisons.
 */
export function normalizeBookingDateOnly(input) {
  if (input == null || input === '') return null
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [y, m, d] = input.slice(0, 10).split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
  }
  const x = new Date(input)
  if (Number.isNaN(x.getTime())) return null
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()))
}
