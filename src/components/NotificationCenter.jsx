import { useEffect, useMemo, useState } from 'react'
import ReactDOM from 'react-dom'

function formatNotificationTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getTypeAccent(type = '') {
  const normalized = String(type).toLowerCase()
  if (normalized === 'approved') return 'bg-green-100 text-green-700'
  if (['rejected', 'deleted', 'cancelled'].includes(normalized)) return 'bg-red-100 text-red-700'
  if (normalized === 'created') return 'bg-blue-100 text-blue-700'
  if (normalized === 'reassigned') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-700'
}

function NotificationCenter({ isOpen, onClose, userEmail, onCountsUpdate }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  )

  const recentCount = useMemo(() => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    return notifications.filter((item) => {
      const createdAt = new Date(item.createdAt).getTime()
      return Number.isFinite(createdAt) && createdAt >= oneDayAgo
    }).length
  }, [notifications])

  const fetchNotifications = async () => {
    if (!userEmail) {
      setNotifications([])
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/notifications/user/${encodeURIComponent(userEmail)}?limit=100`, {
        headers: { userEmail }
      })
      const responseText = await response.text()
      let data = {}
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok || !data.success) {
        const details = data.message || responseText || `HTTP ${response.status}`
        throw new Error(details || 'Failed to fetch notifications')
      }

      const list = Array.isArray(data.notifications) ? data.notifications : []
      setNotifications(list)

      if (typeof onCountsUpdate === 'function') {
        onCountsUpdate({
          unreadCount: data.unreadCount ?? list.filter((item) => !item.read).length,
          recentCount: data.recentCount ?? list.filter((item) => {
            const ts = new Date(item.createdAt).getTime()
            return Number.isFinite(ts) && ts >= (Date.now() - (24 * 60 * 60 * 1000))
          }).length
        })
      }
    } catch (fetchError) {
      console.error('Error fetching notifications:', fetchError)
      setError(fetchError.message || 'Unable to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    fetchNotifications()
  }, [isOpen, userEmail])

  useEffect(() => {
    if (typeof onCountsUpdate === 'function') {
      onCountsUpdate({ unreadCount, recentCount })
    }
  }, [unreadCount, recentCount, onCountsUpdate])

  const markAsRead = async (notification) => {
    if (!notification || notification.read) return

    try {
      const response = await fetch(`/api/notifications/${notification._id}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          userEmail
        },
        body: JSON.stringify({ userEmail })
      })
      const responseText = await response.text()
      let data = {}
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok || !data.success) {
        const details = data.message || responseText || `HTTP ${response.status}`
        throw new Error(details || 'Failed to mark notification as read')
      }

      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notification._id
            ? { ...item, read: true, readAt: new Date().toISOString() }
            : item
        )
      )

      if (notification.url) {
        window.location.href = notification.url
      }
    } catch (markError) {
      console.error('Error marking notification as read:', markError)
    }
  }

  const markAllAsRead = async () => {
    if (!userEmail || unreadCount === 0) return

    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          userEmail
        },
        body: JSON.stringify({ userEmail })
      })
      const responseText = await response.text()
      let data = {}
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok || !data.success) {
        const details = data.message || responseText || `HTTP ${response.status}`
        throw new Error(details || 'Failed to mark all notifications as read')
      }

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          read: true,
          readAt: item.readAt || new Date().toISOString()
        }))
      )
    } catch (markAllError) {
      console.error('Error marking all notifications as read:', markAllError)
    }
  }

  if (!isOpen) return null

  const userLabel = String(userEmail || '').split('@')[0] || 'you'

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="notification-card bg-white rounded-xl lg:rounded-2xl shadow-2xl backdrop-blur-sm border border-white/10 w-[calc(100vw-2rem)] sm:w-[calc(100vw-2.5rem)] lg:w-full lg:max-w-2xl h-[44vh] sm:h-[46vh] lg:h-auto max-h-[44vh] sm:max-h-[46vh] lg:max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex items-center justify-between px-4 lg:px-6 py-2.5 lg:py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3 pr-10 lg:pr-0">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg lg:text-2xl font-bold text-gray-900 leading-tight">Notifications</h2>
              <p className="text-[11px] lg:text-sm text-gray-600 mt-0.5">System updates for {userLabel}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-1 right-1 lg:static p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close notifications"
            title="Close"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="px-4 lg:px-6 py-1.5 lg:py-2 border-b border-gray-200 flex items-center justify-between bg-white">
            <button
              onClick={fetchNotifications}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Refresh
            </button>
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="text-xs font-semibold text-slate-700 disabled:text-slate-300"
            >
              Mark all as read
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 lg:p-6 bg-white min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3d99f5]"></div>
            </div>
          )}

          {!loading && error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">{error}</div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="text-center py-6 lg:py-8">
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-gray-100 mx-auto mb-3 lg:mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-base lg:text-xl font-semibold text-gray-700">No notifications</p>
              <p className="text-xs lg:text-sm text-gray-500 mt-1">Everything is up to date</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-3">
              {notifications.map((item) => (
                <button
                  key={item._id}
                  onClick={() => markAsRead(item)}
                  className={`notification-interactive w-full text-left rounded-xl lg:rounded-2xl p-2.5 lg:p-4 border transition-all ${item.read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm lg:text-base font-bold text-gray-900 leading-snug">{item.title || 'Notification'}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${getTypeAccent(item.type)}`}>
                      {item.type || 'update'}
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-gray-700 mt-1 leading-relaxed">{item.body || 'No details'}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">{formatNotificationTime(item.createdAt)}</span>
                    {!item.read && <span className="text-[11px] font-semibold text-blue-700">NEW</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return ReactDOM.createPortal(content, document.body)
  }

  return content
}

export default NotificationCenter
