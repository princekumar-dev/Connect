import { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

/** Normalize API/Mongo date to a local calendar day (avoids UTC day-shift bugs). */
function parseBookingDateOnly(value) {
  if (value == null || value === '') return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function formatDateKeyFromDate(date) {
  if (!date || Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildStartDate(dateValue, time) {
  const baseDate = parseBookingDateOnly(dateValue)
  if (!baseDate) return null
  const [hours, minutes] = String(time || '00:00').split(':').map(Number)
  const start = new Date(baseDate)
  start.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0)
  return start
}

function buildEndDate(start, duration) {
  const durationHours = parseFloat(duration) || 1
  return new Date(start.getTime() + durationHours * 60 * 60 * 1000)
}

function formatEventTitle(booking, start, end) {
  const range = `${moment(start).format('h:mm A')}–${moment(end).format('h:mm A')}`
  const org = booking.organizer || 'Booking'
  const status = String(booking.status || '').toLowerCase()
  const isCurrentUser = !!booking.isCurrentUser

  if (status === 'pending' && isCurrentUser) {
    return `${range} · ${org} (Your request — pending)`
  }
  if ((status === 'approved' || status === 'confirmed') && isCurrentUser) {
    return `${range} · ${org} (You)`
  }
  if (status === 'approved' || status === 'confirmed') {
    return `${range} · ${org} (Booked)`
  }
  return `${range} · ${org}`
}

function VenueCalendar({ venueName, onDateSelect }) {
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isMobile, setIsMobile] = useState(false)
  const currentUserEmail = (localStorage.getItem('userEmail') || '').toLowerCase()

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(mq.matches)
    update()

    if (mq.addEventListener) mq.addEventListener('change', update)
    else mq.addListener(update)

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update)
      else mq.removeListener(update)
    }
  }, [])

  useEffect(() => {
    if (isMobile && currentView === 'week') {
      setCurrentView('month')
    }
  }, [isMobile, currentView])

  const scrollToTime = useMemo(() => new Date(1970, 0, 1, 8, 0, 0), [])

  const formats = useMemo(
    () => ({
      eventTimeRangeFormat: ({ start, end }) =>
        `${moment(start).format('h:mm A')} – ${moment(end).format('h:mm A')}`,
      timeGutterFormat: (date) => moment(date).format('h:mm A'),
      agendaTimeFormat: (date) => moment(date).format('h:mm A'),
      agendaTimeRangeFormat: ({ start, end }) =>
        `${moment(start).format('h:mm A')} – ${moment(end).format('h:mm A')}`
    }),
    []
  )

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true)
      const headers = {}
      if (currentUserEmail) {
        headers.userEmail = currentUserEmail
      }
      const response = await fetch('/api/bookings?scope=calendar', { headers })
      const data = await response.json()

      if (data.success) {
        const venueBookings = data.bookings
          .filter((booking) => booking.venue === venueName)
          .map((booking) => {
            const start = buildStartDate(booking.date, booking.time)
            if (!start) return null

            const end = buildEndDate(start, booking.duration)
            return {
              id: booking._id,
              title: formatEventTitle(
                { ...booking, isCurrentUser: (booking.email || '').toLowerCase() === currentUserEmail },
                start,
                end
              ),
              start,
              end,
              allDay: false,
              resource: {
                ...booking,
                isCurrentUser: (booking.email || '').toLowerCase() === currentUserEmail
              }
            }
          })
          .filter(Boolean)

        setBookings(venueBookings)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [venueName, currentUserEmail])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const dayBookingStatusMap = useMemo(() => {
    const map = new Map()

    const toDayKey = (value) => {
      const base = parseBookingDateOnly(value)
      if (!base) return ''
      return formatDateKeyFromDate(base)
    }

    bookings.forEach((bookingEvent) => {
      const booking = bookingEvent.resource || {}
      const status = String(booking.status || '').toLowerCase()
      if (!['approved', 'confirmed', 'pending'].includes(status)) return

      const dayKey = toDayKey(booking.date || bookingEvent.start)
      if (!dayKey) return

      if (!map.has(dayKey)) {
        map.set(dayKey, {
          currentUserApprovedCount: 0,
          otherUserApprovedCount: 0,
          currentUserPendingCount: 0,
          approvedTotalCount: 0
        })
      }

      const current = map.get(dayKey)
      const isCurrentUser = !!booking.isCurrentUser

      if (status === 'pending' && isCurrentUser) {
        current.currentUserPendingCount += 1
      }

      if (status === 'approved' || status === 'confirmed') {
        current.approvedTotalCount += 1
        if (isCurrentUser) {
          current.currentUserApprovedCount += 1
        } else {
          current.otherUserApprovedCount += 1
        }
      }
    })

    return map
  }, [bookings])

  const dayPropGetter = useCallback(
    (date) => {
      const d = date instanceof Date ? date : new Date(date)
      if (Number.isNaN(d.getTime())) return {}

      if (d.getDay() === 0) {
        return {
          className: 'calendar-sunday-cannot-book venue-cal-sunday',
          style: {}
        }
      }

      if (currentView !== 'month') {
        return { className: '', style: {} }
      }

      const dayKey = formatDateKeyFromDate(d)
      const dayStats = dayBookingStatusMap.get(dayKey)

      if (!dayStats) {
        return {
          className: 'calendar-day-free',
          style: {}
        }
      }

      if (dayStats.approvedTotalCount >= 3) {
        return {
          className: 'calendar-day-consistent-booking',
          style: {}
        }
      }

      if (dayStats.currentUserApprovedCount > 0) {
        return {
          className: 'calendar-day-current-user-booked',
          style: {}
        }
      }

      if (dayStats.otherUserApprovedCount > 0) {
        return {
          className: 'calendar-day-other-user-booked',
          style: {}
        }
      }

      if (dayStats.currentUserPendingCount > 0) {
        return {
          className: 'calendar-day-current-user-pending',
          style: {}
        }
      }

      return {
        className: 'calendar-day-free',
        style: {}
      }
    },
    [currentView, dayBookingStatusMap]
  )

  const slotPropGetter = useCallback((date) => {
    const d = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime())) return {}
    if (d.getDay() === 0) {
      return {
        className: 'venue-cal-slot-sunday',
        style: { cursor: 'not-allowed' }
      }
    }
    return {}
  }, [])

  const eventPropGetter = useCallback((event) => {
    const status = String(event.resource?.status || '').toLowerCase()
    const isCurrentUser = event.resource?.isCurrentUser

    let backgroundColor = '#f59e0b'
    let borderColor = '#d97706'
    let color = '#ffffff'

    if (status === 'pending' && isCurrentUser) {
      backgroundColor = '#fde68a'
      borderColor = '#d97706'
      color = '#422006'
    } else if ((status === 'approved' || status === 'confirmed') && isCurrentUser) {
      backgroundColor = '#10b981'
      borderColor = '#059669'
    } else if (status === 'pending') {
      backgroundColor = '#94a3b8'
      borderColor = '#64748b'
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '6px',
        color,
        border: `2px solid ${borderColor}`,
        display: 'block',
        fontWeight: 600,
        fontSize: '12px',
        opacity: 0.95,
        boxShadow: `0 2px 8px ${borderColor}40`
      }
    }
  }, [])

  const handleSelectSlot = ({ start }) => {
    if (start.getDay() === 0) return

    const dayKey = formatDateKeyFromDate(start)
    const hasAnyBookingOnDay = dayBookingStatusMap.has(dayKey)

    // In month view: booked day opens day view, free day goes to booking page.
    if (currentView === 'month' && hasAnyBookingOnDay) {
      setCurrentDate(start)
      setCurrentView('day')
      return
    }

    if (onDateSelect) {
      onDateSelect(start)
    }
  }

  const handleSelectEvent = (event) => {
    if (!event?.start) return
    setCurrentDate(event.start)
    setCurrentView('day')
  }

  const handleDrillDown = (date) => {
    const d = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime()) || d.getDay() === 0) return

    const dayKey = formatDateKeyFromDate(d)
    const hasAnyBookingOnDay = dayBookingStatusMap.has(dayKey)

    if (hasAnyBookingOnDay) {
      setCurrentDate(d)
      setCurrentView('day')
      return
    }

    if (onDateSelect) {
      onDateSelect(d)
    }
  }

  const messages = {
    allDay: 'All Day',
    previous: 'Previous',
    next: 'Next',
    today: 'Today',
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Agenda',
    date: 'Date',
    time: 'Time',
    event: 'Booking',
    noEventsInRange: 'No bookings in this range',
    showMore: (total) => `+${total} more`
  }

  const calendarViews = useMemo(() => (isMobile ? ['month', 'day'] : ['month', 'week', 'day']), [isMobile])

  const handleViewChange = (nextView) => {
    if (isMobile && nextView === 'week') {
      setCurrentView('month')
      return
    }
    setCurrentView(nextView)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="venue-calendar-root w-full">
      <style>{`
        @media (max-width: 640px) {
          .venue-calendar-root .rbc-toolbar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
          }

          .venue-calendar-root .rbc-toolbar .rbc-toolbar-label {
            order: 1;
            flex: 1 1 100%;
            text-align: left;
            font-size: 1.05rem;
            font-weight: 700;
            padding: 0;
            margin: 0;
          }

          .venue-calendar-root .rbc-toolbar .rbc-btn-group {
            display: inline-flex;
            flex-wrap: nowrap;
          }

          .venue-calendar-root .rbc-toolbar .rbc-btn-group:first-child {
            order: 2;
          }

          .venue-calendar-root .rbc-toolbar .rbc-btn-group:last-child {
            order: 3;
          }

          .venue-calendar-root .rbc-toolbar button {
            font-size: 0.9rem;
            padding: 0.38rem 0.62rem;
            min-height: 34px;
            line-height: 1.1;
          }

          .venue-calendar-root .rbc-header {
            font-size: 0.9rem;
            padding: 0.25rem 0;
          }

          .venue-calendar-root .rbc-date-cell {
            font-size: 0.9rem;
            padding-right: 0.25rem;
          }

          .venue-calendar-root .rbc-event {
            font-size: 0.72rem !important;
            padding: 1px 3px;
            line-height: 1.15;
          }

          .venue-calendar-root .rbc-month-row {
            min-height: 42px;
          }
        }
      `}</style>

      <div className="glass-card p-4 mb-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Booking status legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border-2 border-gray-300" />
            <span className="text-gray-700">Free</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981', border: '2px solid #059669' }} />
            <span className="text-gray-700">Your booking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fde68a', border: '2px solid #d97706' }} />
            <span className="text-gray-700">Your pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b', border: '2px solid #d97706' }} />
            <span className="text-gray-700">Others booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444', border: '2px solid #dc2626' }} />
            <span className="text-gray-700">Busy day (3+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300 border-2 border-gray-400" />
            <span className="text-gray-700">Sunday (closed)</span>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="h-96 w-full">
          <Calendar
            localizer={localizer}
            events={bookings}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            popup
            showMultiDayTimes
            dayPropGetter={dayPropGetter}
            slotPropGetter={slotPropGetter}
            eventPropGetter={eventPropGetter}
            messages={messages}
            formats={formats}
            views={calendarViews}
            view={currentView}
            date={currentDate}
            onView={handleViewChange}
            onNavigate={setCurrentDate}
            drilldownView="day"
            onDrillDown={handleDrillDown}
            step={30}
            timeslots={2}
            min={new Date(1970, 0, 1, 8, 0, 0)}
            max={new Date(1970, 0, 1, 20, 0, 0)}
            scrollToTime={scrollToTime}
            longPressThreshold={280}
          />
        </div>
      </div>
    </div>
  )
}

export default VenueCalendar
