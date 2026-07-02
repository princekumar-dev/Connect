import { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

/** Mobile-optimized event chip — shows only time range and status dot. */
function MobileEventChip({ event }) {
  const resource = event?.resource || {}
  const status = String(resource.status || '').toLowerCase()
  const isCurrentUser = !!resource.isCurrentUser

  let dotColor = '#f59e0b'
  if (status === 'pending' && isCurrentUser) dotColor = '#8b5cf6'
  else if ((status === 'approved' || status === 'confirmed') && isCurrentUser) dotColor = '#10b981'
  else if (status === 'pending') dotColor = '#94a3b8'

  const timeStr = event?.start
    ? moment(event.start).format('h:mm A')
    : ''

  return (
    <span className="flex items-center gap-1 overflow-hidden">
      <span
        className="inline-block w-[5px] h-[5px] rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <span className="truncate text-[0.68rem] leading-tight font-medium">{timeStr}</span>
    </span>
  )
}

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
  const org = booking.organizer || ''
  const status = String(booking.status || '').toLowerCase()
  const isCurrentUser = !!booking.isCurrentUser

  if (status === 'pending' && isCurrentUser) {
    return `${range} · ${org} (Pending)`
  }
  if ((status === 'approved' || status === 'confirmed') && isCurrentUser) {
    return `${range} · ${org} (You)`
  }
  if (status === 'approved' || status === 'confirmed') {
    return `${range} · ${org}`
  }
  return `${range} · ${org || 'Booking'}`
}

/** Return start-of-today for comparison. */
function getStartOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Check if a date is strictly before today (i.e. in the past). */
function isPastDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return false
  return d < getStartOfToday()
}

/** Check if a datetime is in the past (for week/day slot blocking). */
function isPastSlot(slotDate) {
  const now = new Date()
  return slotDate.getTime() < now.getTime()
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
  const viewLabel = useMemo(() => {
    if (currentView === 'month') return 'Month view'
    if (currentView === 'week') return 'Week view'
    if (currentView === 'day') return 'Day view'
    return currentView
  }, [currentView])

  const currentMonthLabel = useMemo(() => {
    return currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }, [currentDate])

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

      // Sunday — closed
      if (d.getDay() === 0) {
        return {
          className: 'calendar-sunday-cannot-book venue-cal-sunday',
          style: {}
        }
      }

      // Past dates — grayed out, not clickable (all views)
      if (isPastDate(d)) {
        return {
          className: 'calendar-day-past',
          style: { cursor: 'not-allowed' }
        }
      }

      // Today — enhanced highlight (month view only; week/day uses rbc-header.rbc-today)
      const today = getStartOfToday()
      const isToday = d.getFullYear() === today.getFullYear() &&
                      d.getMonth() === today.getMonth() &&
                      d.getDate() === today.getDate()

      if (isToday && currentView === 'month') {
        return {
          className: 'calendar-day-today',
          style: {}
        }
      }

      // Only apply booking status colors in month view
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
    // Sunday — closed
    if (d.getDay() === 0) {
      return {
        className: 'venue-cal-slot-sunday',
        style: { cursor: 'not-allowed' }
      }
    }
    // Past time slots — blocked
    if (isPastSlot(d)) {
      return {
        className: 'venue-cal-slot-past',
        style: { cursor: 'not-allowed' }
      }
    }
    return {}
  }, [])

  const eventPropGetter = useCallback((event) => {
    const status = String(event.resource?.status || '').toLowerCase()
    const isCurrentUser = event.resource?.isCurrentUser

    let backgroundColor = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
    let boxShadow = '0 2px 8px rgba(245,158,11,0.25)'

    if (status === 'pending' && isCurrentUser) {
      backgroundColor = 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)'
      boxShadow = '0 2px 8px rgba(139,92,246,0.25)'
    } else if ((status === 'approved' || status === 'confirmed') && isCurrentUser) {
      backgroundColor = 'linear-gradient(135deg, #34d399 0%, #10b981 100%)'
      boxShadow = '0 2px 8px rgba(16,185,129,0.25)'
    } else if (status === 'pending') {
      backgroundColor = 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
      boxShadow = '0 2px 8px rgba(100,116,139,0.2)'
    }

    return {
      style: {
        backgroundColor,
        color: '#ffffff',
        fontWeight: 600,
        boxShadow
      }
    }
  }, [])

  const handleSelectSlot = ({ start }) => {
    // Block Sundays
    if (start.getDay() === 0) return
    // Block past dates
    if (isPastDate(start)) return
    // Block past time slots in week/day view
    if (currentView === 'week' || currentView === 'day') {
      if (isPastSlot(start)) return
    }

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
    if (isPastDate(event.start)) return
    setCurrentDate(event.start)
    setCurrentView('day')
  }

  const handleDrillDown = (date) => {
    const d = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime()) || d.getDay() === 0) return
    if (isPastDate(d)) return

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
      <div className="rounded-2xl overflow-hidden shadow-lg border border-white/40 bg-white/70 backdrop-blur-xl">
        <div className="cal-calendar-header">
          <div>
            <p className="cal-calendar-eyebrow">Availability planner</p>
            <h3 className="cal-calendar-title">{venueName}</h3>
            <p className="cal-calendar-subtitle">
              {viewLabel} · {currentMonthLabel}
            </p>
          </div>
          <div className="cal-calendar-note">
            <span className="cal-calendar-note-dot" />
            <span>Select a free date to continue booking</span>
          </div>
        </div>

        {/* Compact inline legend */}
        <div className="cal-mini-legend">
          <span className="cal-legend-item">
            <span className="cal-legend-dot cal-legend-dot--free" />
            <span className="hidden sm:inline">Free</span>
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot cal-legend-dot--mine" />
            <span className="hidden sm:inline">Your booking</span>
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot cal-legend-dot--pending" />
            <span className="hidden sm:inline">Your pending</span>
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot cal-legend-dot--others" />
            <span className="hidden sm:inline">Others booked</span>
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot cal-legend-dot--busy" />
            <span className="hidden sm:inline">Busy (3+)</span>
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot cal-legend-dot--past" />
            <span className="hidden sm:inline">Past</span>
          </span>
          <span className="cal-legend-item">
            <span className="cal-legend-dot cal-legend-dot--closed" />
            <span className="hidden sm:inline">Closed</span>
          </span>
        </div>

        {/* Calendar */}
        <div className="h-[480px] sm:h-[460px] w-full">
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
            dayLayoutAlgorithm={isMobile ? 'no-overlap' : 'overlap'}
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
            timeslots={isMobile ? 4 : 2}
            min={new Date(1970, 0, 1, 8, 0, 0)}
            max={new Date(1970, 0, 1, 20, 0, 0)}
            scrollToTime={scrollToTime}
            longPressThreshold={280}
            {...(isMobile ? { components: { event: MobileEventChip } } : {})}
          />
        </div>
      </div>
    </div>
  )
}

export default VenueCalendar
