import { useState } from 'react'
import { getCalendarExportOptions } from '../utils/calendarExport'

function CalendarExportModal({ isOpen, onClose, booking }) {
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen || !booking) return null

  const exportOptions = getCalendarExportOptions(booking)

  const handleExport = async (option) => {
    try {
      setIsExporting(true)
      await option.action()
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm no-mobile-backdrop"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            Export to Calendar
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Booking Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">{booking.venue}</h4>
          <p className="text-sm text-gray-600">
            {new Date(booking.date).toLocaleDateString()} at {booking.time}
          </p>
          <p className="text-sm text-gray-600">
            Duration: {booking.duration || 1} hour(s)
          </p>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          {exportOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleExport(option)}
              disabled={isExporting}
              className="w-full flex items-center gap-3 p-4 text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl">{option.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{option.name}</div>
                <div className="text-sm text-gray-500">{option.description}</div>
              </div>
              {isExporting && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default CalendarExportModal
