import { useState, useEffect, useMemo } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'

// Set up moment localizer
const localizer = momentLocalizer(moment)

function VenueCalendar({ venueName, onDateSelect }) {
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchBookings()
  }, [venueName])

  const fetchBookings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/bookings')
      const data = await response.json()
      
      if (data.success) {
        // Filter bookings for this venue and only approved ones
        const venueBookings = data.bookings
          .filter(booking => 
            booking.venue === venueName && 
            booking.status === 'approved'
          )
          .map(booking => ({
            id: booking._id,
            title: `${booking.venue} - ${booking.organizer || 'Event'}`,
            start: new Date(`${booking.date}T${booking.time || '00:00'}`),
            end: new Date(`${booking.date}T${booking.time || '00:00'}`).setHours(
              new Date(`${booking.date}T${booking.time || '00:00'}`).getHours() + (booking.duration || 1)
            ),
            resource: booking
          }))
        
        setBookings(venueBookings)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const eventStyleGetter = (event) => {
    // Determine booking status based on event data
    const isOverbooked = event.resource?.overbooked || false
    const isPending = event.resource?.status === 'pending'
    const isApproved = event.resource?.status === 'approved'
    
    let backgroundColor = '#3d99f5' // Default blue for approved bookings
    let borderColor = '#3d99f5'
    
    if (isOverbooked) {
      backgroundColor = '#ef4444' // Red for overbooked
      borderColor = '#dc2626'
    } else if (isPending) {
      backgroundColor = '#f59e0b' // Orange for pending
      borderColor = '#d97706'
    } else if (isApproved) {
      backgroundColor = '#10b981' // Green for approved
      borderColor = '#059669'
    }
    
    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: `2px solid ${borderColor}`,
        display: 'block',
        fontWeight: '600',
        fontSize: '12px',
        boxShadow: `0 2px 8px ${borderColor}40`
      }
    }
  }

  const handleSelectSlot = ({ start, end }) => {
    if (onDateSelect) {
      onDateSelect(start, end)
    }
  }

  const handleSelectEvent = (event) => {
    console.log('Selected event:', event)
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
    event: 'Event',
    noEventsInRange: 'No events in this range',
    showMore: (total) => `+${total} more`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <style jsx>{`
        /* Fix calendar styling - only apply dark background to Sunday */
        .rbc-calendar {
          background: transparent !important;
        }
        
        .rbc-month-view {
          background: transparent !important;
        }
        
        .rbc-date-cell {
          background: transparent !important;
        }
        
        /* Only apply dark background to Sunday */
        .rbc-date-cell.rbc-off-range-bg {
          background: #f3f4f6 !important; /* Light gray for overflow days */
        }
        
        /* Sunday styling - only for actual Sunday cells */
        .rbc-month-view .rbc-date-cell:nth-child(7n) {
          background: #f3f4f6 !important; /* Light gray only for Sunday */
        }
        
        /* Remove dark background from other days */
        .rbc-month-view .rbc-date-cell:not(:nth-child(7n)) {
          background: transparent !important;
        }
        
        /* Ensure proper contrast for text */
        .rbc-date-cell {
          color: #374151 !important;
        }
        
        .rbc-off-range-bg {
          background: #f9fafb !important; /* Very light gray for overflow */
        }
      `}</style>
      
      {/* Calendar Legend */}
      <div className="glass-card p-4 mb-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Booking Status Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981', border: '2px solid #059669' }}></div>
            <span className="text-gray-700">Available/Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b', border: '2px solid #d97706' }}></div>
            <span className="text-gray-700">Pending Approval</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444', border: '2px solid #dc2626' }}></div>
            <span className="text-gray-700">Overbooked/Conflict</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-200 border-2 border-gray-300"></div>
            <span className="text-gray-700">Free/Unavailable</span>
          </div>
        </div>
      </div>
      
      {/* Calendar Component */}
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
            eventPropGetter={eventStyleGetter}
            messages={messages}
            views={['month', 'week', 'day']}
            defaultView="month"
            step={30}
            timeslots={2}
            min={new Date(2024, 0, 1, 8, 0)} // 8 AM
            max={new Date(2024, 11, 31, 20, 0)} // 8 PM
          />
        </div>
      </div>
    </div>
  )
}

export default VenueCalendar
