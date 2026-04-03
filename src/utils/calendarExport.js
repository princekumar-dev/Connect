import ical from 'ical-generator'

// Generate ICS file for calendar export
export function generateICS(booking) {
  const calendar = ical({
    name: 'MSEC Connect Booking',
    timezone: 'Asia/Kolkata'
  })

  const startDate = new Date(`${booking.date}T${booking.time || '00:00'}`)
  const endDate = new Date(startDate.getTime() + (booking.duration || 1) * 60 * 60 * 1000)

  calendar.createEvent({
    start: startDate,
    end: endDate,
    summary: `Venue Booking: ${booking.venue}`,
    description: `
Venue: ${booking.venue}
Organizer: ${booking.organizer || 'N/A'}
Purpose: ${booking.purpose || 'N/A'}
Attendees: ${booking.attendees || 'N/A'}
Duration: ${booking.duration || 1} hour(s)
Status: ${booking.status || 'pending'}

Booked via MSEC Connect
    `.trim(),
    location: `MSEC - ${booking.venue}`,
    url: window.location.origin + '/booking-status',
    organizer: {
      name: booking.organizer || 'MSEC Connect',
      email: booking.email || 'admin@msec.edu.in'
    }
  })

  return calendar.toString()
}

// Download ICS file
export function downloadICS(booking) {
  const icsContent = generateICS(booking)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `MSEC-Booking-${booking.venue}-${booking.date}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Generate Google Calendar URL
export function generateGoogleCalendarURL(booking) {
  const startDate = new Date(`${booking.date}T${booking.time || '00:00'}`)
  const endDate = new Date(startDate.getTime() + (booking.duration || 1) * 60 * 60 * 1000)
  
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Venue Booking: ${booking.venue}`,
    dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
    details: `
Venue: ${booking.venue}
Organizer: ${booking.organizer || 'N/A'}
Purpose: ${booking.purpose || 'N/A'}
Attendees: ${booking.attendees || 'N/A'}
Duration: ${booking.duration || 1} hour(s)
Status: ${booking.status || 'pending'}

Booked via MSEC Connect
    `.trim(),
    location: `MSEC - ${booking.venue}`,
    trp: 'false'
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Generate Outlook Calendar URL
export function generateOutlookCalendarURL(booking) {
  const startDate = new Date(`${booking.date}T${booking.time || '00:00'}`)
  const endDate = new Date(startDate.getTime() + (booking.duration || 1) * 60 * 60 * 1000)
  
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: `Venue Booking: ${booking.venue}`,
    startdt: formatDate(startDate),
    enddt: formatDate(endDate),
    body: `
Venue: ${booking.venue}
Organizer: ${booking.organizer || 'N/A'}
Purpose: ${booking.purpose || 'N/A'}
Attendees: ${booking.attendees || 'N/A'}
Duration: ${booking.duration || 1} hour(s)
Status: ${booking.status || 'pending'}

Booked via MSEC Connect
    `.trim(),
    location: `MSEC - ${booking.venue}`
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

// Generate Apple Calendar URL (data URI)
export function generateAppleCalendarURL(booking) {
  const icsContent = generateICS(booking)
  return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`
}

// Calendar export component data
export function getCalendarExportOptions(booking) {
  return [
    {
      name: 'Download ICS',
      description: 'Download .ics file for any calendar app',
      action: () => downloadICS(booking),
      icon: '📥'
    },
    {
      name: 'Google Calendar',
      description: 'Add to Google Calendar',
      action: () => window.open(generateGoogleCalendarURL(booking), '_blank'),
      icon: '📅'
    },
    {
      name: 'Outlook',
      description: 'Add to Outlook Calendar',
      action: () => window.open(generateOutlookCalendarURL(booking), '_blank'),
      icon: '📧'
    },
    {
      name: 'Apple Calendar',
      description: 'Add to Apple Calendar',
      action: () => window.open(generateAppleCalendarURL(booking), '_blank'),
      icon: '🍎'
    }
  ]
}
