import { useEffect, useState } from 'react'
import { authFetch } from '../utils/api'
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Admin checking
    const auth = localStorage.getItem('auth')
    if (auth) {
      try {
        const user = JSON.parse(auth)
        const role = user.role?.toLowerCase()
        if (!['admin', 'principal', 'secretary'].includes(role) && user.email !== 'admin@msec.edu.in') {
          navigate('/booking-status')
          return
        }
      } catch (e) {
        navigate('/login')
        return
      }
    } else {
      navigate('/login')
      return
    }

    fetchAnalytics()
  }, [navigate])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await authFetch('/api/bookings?scope=analytics')
      if (!response.ok) {
        throw new Error(`Failed to load analytics: HTTP ${response.status}`)
      }
      const resData = await response.json()
      if (resData.success) {
        setData(resData.analytics)
      } else {
        throw new Error(resData.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setData(prev => {
        setLoading(false)
        return prev
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-semibold animate-pulse">Loading analytics dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-xl max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all hover:scale-[1.02] shadow-md shadow-blue-500/20"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { totalBookings = 0, statusCounts = {}, venueCounts = {}, purposeCounts = {}, autoReassignedCount = 0 } = data || {}

  const approvedCount = statusCounts.approved || 0
  const pendingCount = statusCounts.pending || 0
  const cancelledCount = statusCounts.cancelled || 0
  const rejectedCount = statusCounts.rejected || 0

  const venueKeys = Object.keys(venueCounts)
  const maxVenueVal = Math.max(...Object.values(venueCounts), 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600 text-sm sm:text-base font-medium">Visual metrics and booking statistics for MSEC seminar halls.</p>
          </div>
          <button
            onClick={() => navigate('/bookings')}
            className="glass-button px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-all hover:scale-[1.02] shadow-md shadow-blue-500/10 text-center"
          >
            Manage Bookings
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Total Bookings</span>
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-800">{totalBookings}</span>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_rgba(15,23,42,0.02)] border-l-4 border-l-green-500">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Approved</span>
            <span className="text-3xl sm:text-4xl font-extrabold text-green-700">{approvedCount}</span>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_rgba(15,23,42,0.02)] border-l-4 border-l-yellow-500">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Pending</span>
            <span className="text-3xl sm:text-4xl font-extrabold text-yellow-700">{pendingCount}</span>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_rgba(15,23,42,0.02)] border-l-4 border-l-blue-500">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Reassigned</span>
            <span className="text-3xl sm:text-4xl font-extrabold text-blue-700">{autoReassignedCount}</span>
          </div>
        </div>

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Venue Utilisation Bar Chart (SVG-based) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_rgba(15,23,42,0.02)]">
            <h3 className="text-lg font-bold text-gray-800 mb-6">Venue Utilization</h3>
            <div className="space-y-5">
              {venueKeys.map(venue => {
                const val = venueCounts[venue] || 0
                const percent = Math.round((val / maxVenueVal) * 100)
                return (
                  <div key={venue} className="flex flex-col">
                    <div className="flex justify-between text-sm font-semibold text-gray-700 mb-1">
                      <span>{venue}</span>
                      <span className="text-blue-600">{val} booking{val !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
              {venueKeys.length === 0 && (
                <p className="text-gray-500 text-center py-8">No booking data available.</p>
              )}
            </div>
          </div>

          {/* Status Breakdown Circle (SVG-based donut) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_rgba(15,23,42,0.02)] flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-6">Booking Status Breakdown</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
              {/* SVG Donut */}
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background track */}
                  <path
                    className="text-slate-100"
                    stroke="currentColor"
                    strokeWidth="4.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Approved segment */}
                  {totalBookings > 0 && (
                    <path
                      className="text-green-500"
                      stroke="currentColor"
                      strokeWidth="4.5"
                      strokeDasharray={`${(approvedCount / totalBookings) * 100}, 100`}
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  )}
                  {/* Pending segment */}
                  {totalBookings > 0 && (
                    <path
                      className="text-yellow-500"
                      stroke="currentColor"
                      strokeWidth="4.5"
                      strokeDasharray={`${(pendingCount / totalBookings) * 100}, 100`}
                      strokeDashoffset={`-${(approvedCount / totalBookings) * 100}`}
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  )}
                  {/* Cancelled/Rejected segment */}
                  {totalBookings > 0 && (
                    <path
                      className="text-red-500"
                      stroke="currentColor"
                      strokeWidth="4.5"
                      strokeDasharray={`${((cancelledCount + rejectedCount) / totalBookings) * 100}, 100`}
                      strokeDashoffset={`-${((approvedCount + pendingCount) / totalBookings) * 100}`}
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-800">{totalBookings}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Bookings</span>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3 font-semibold text-gray-700">
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full bg-green-500 block"></span>
                  <span>Approved ({approvedCount})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full bg-yellow-500 block"></span>
                  <span>Pending ({pendingCount})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full bg-red-500 block"></span>
                  <span>Cancelled / Rejected ({cancelledCount + rejectedCount})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
