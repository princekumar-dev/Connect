import ical from 'ical-generator'

/**
 * Parse booking date + time into start/end Date objects.
 * Handles YYYY-MM-DD strings, ISO date strings from Mongo, and Date objects.
 */
export function getBookingStartEnd(booking) {
  if (!booking) return { start: null, end: null }

  const durationHours = parseFloat(booking.duration) || 1
  const time = (booking.time || '00:00').trim()
  const raw = booking.date

  let datePart
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    datePart = raw.slice(0, 10)
  } else if (raw) {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return { start: null, end: null }
    datePart = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  } else {
    return { start: null, end: null }
  }

  const [h, m] = time.split(':').map((x) => parseInt(x, 10) || 0)
  const start = new Date(`${datePart}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
  if (Number.isNaN(start.getTime())) return { start: null, end: null }

  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)
  return { start, end }
}

function eventDescription(booking) {
  return `
Venue: ${booking.venue}
Organizer: ${booking.organizer || 'N/A'}
Purpose: ${booking.purpose || 'N/A'}
Attendees: ${booking.attendees || 'N/A'}
Duration: ${booking.duration || 1} hour(s)
Status: ${booking.status || 'pending'}

Booked via MSEC Connect
  `.trim()
}

export function generateICS(booking) {
  const { start, end } = getBookingStartEnd(booking)
  if (!start || !end) {
    throw new Error('Invalid booking date or time')
  }

  const calendar = ical({
    name: 'MSEC Connect Booking',
    timezone: 'Asia/Kolkata'
  })

  calendar.createEvent({
    start,
    end,
    summary: `Venue Booking: ${booking.venue}`,
    description: eventDescription(booking),
    location: `MSEC - ${booking.venue}`,
    ...(typeof window !== 'undefined' && window.location?.origin
      ? { url: `${window.location.origin}/booking-status` }
      : {}),
    organizer: {
      name: booking.organizer || 'MSEC Connect',
      email: booking.email || 'admin@msec.edu.in'
    }
  })

  return calendar.toString()
}

export function downloadICS(booking) {
  const icsContent = generateICS(booking)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const safeVenue = String(booking.venue || 'booking')
    .replace(/[^a-z0-9-_]+/gi, '_')
    .slice(0, 48)
  const datePart =
    typeof booking.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(booking.date)
      ? booking.date.slice(0, 10)
      : new Date(booking.date).toISOString().slice(0, 10)

  const link = document.createElement('a')
  link.href = url
  link.download = `MSEC-Booking-${safeVenue}-${datePart}.ics`
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatGoogleDateUTC(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '')
}

export function generateGoogleCalendarURL(booking) {
  const { start, end } = getBookingStartEnd(booking)
  if (!start || !end) {
    throw new Error('Invalid booking date or time')
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Venue Booking: ${booking.venue}`,
    dates: `${formatGoogleDateUTC(start)}/${formatGoogleDateUTC(end)}`,
    details: eventDescription(booking),
    location: `MSEC - ${booking.venue}`,
    trp: 'false'
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function openGoogleCalendar(booking) {
  const url = generateGoogleCalendarURL(booking)
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) {
    window.location.href = url
  }
}

export function getCalendarExportOptions(booking) {
  return [
    {
      name: 'Download calendar file',
      description: 'Save .ics file (Outlook, Apple Calendar, etc.)',
      action: () => {
        downloadICS(booking)
      },
      icon: '📥'
    },
    {
      name: 'Add to Google Calendar',
      description: 'Open Google Calendar with this event pre-filled',
      action: () => {
        openGoogleCalendar(booking)
      },
      icon: '📅'
    }
  ]
}
