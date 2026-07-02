import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { 
  requestNotificationPermission, 
  subscribeToNotifications,
  unsubscribeFromNotifications,
  showNotification,
  isNotificationSupported,
  getNotificationPermission,
  checkCurrentSubscription
} from '../utils/notifications'
import { validatePassword } from '../utils/validation'

function Settings({ isOpen, onClose, userEmail, userRole, isMobile = false }) {
  const navigate = useNavigate()
  const settingsRef = useRef(null)
  const isMountedRef = useRef(true)

  const [isFullWidthMobile, setIsFullWidthMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })

  const mobileMode = isMobile || isFullWidthMobile

  // Notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [notificationSupported] = useState(() => isNotificationSupported())
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })
  const [notificationLoading, setNotificationLoading] = useState(false)

  // Password reset states
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [isInitializing, setIsInitializing] = useState(false)
  const notificationsEnabledRef = useRef(notificationsEnabled)
  const toggleInProgressRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!(isMobile || isFullWidthMobile)) return
    if (isOpen) {
      const prevOverflow = document.body.style.overflow || ''
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prevOverflow || ''
      }
    }
  }, [isOpen, isMobile, isFullWidthMobile])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setIsInitializing(true)

    const load = async () => {
      try {
        let currentPermission = 'default'
        if (notificationSupported) {
          if ('Notification' in window) {
            currentPermission = Notification.permission
          } else {
            currentPermission = getNotificationPermission()
          }
        }

        if (!cancelled) setNotificationPermission(currentPermission)

        const savedSettings = localStorage.getItem('userSettings')
        let userPreference = false

        if (savedSettings) {
          const settings = JSON.parse(savedSettings)
          userPreference = settings.notificationsEnabled === true

          if (!cancelled) {
            setEmailNotifications(settings.emailNotifications !== false)
            setNotificationsEnabled(userPreference)
          }
        } else {
          if (!cancelled) {
            setNotificationsEnabled(false)
            localStorage.setItem('userSettings', JSON.stringify({
              notificationsEnabled: false,
              emailNotifications: true
            }))
          }
        }

        try {
          const subResult = await checkCurrentSubscription()
          const subscriptionExists = subResult?.found === true

          if (userPreference && !subscriptionExists && currentPermission === 'granted') {
            await subscribeToNotifications()
          } else if (!userPreference && subscriptionExists) {
            await unsubscribeFromNotifications()
          }
        } catch (err) {
          console.error('Error syncing subscription:', err)
        }
      } catch (err) {
        console.error('Error loading settings:', err)
      } finally {
        if (!cancelled) setIsInitializing(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [isOpen, notificationSupported])

  useEffect(() => {
    if (mobileMode) return
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        if (!isInitializing) onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, mobileMode, isInitializing])

  useEffect(() => {
    if (mobileMode) return
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, mobileMode])

  const handleNotificationToggle = async () => {
    if (toggleInProgressRef.current) return
    if (notificationLoading || !notificationSupported || isInitializing) return

    const newState = !notificationsEnabled
    setNotificationsEnabled(newState)
    saveSettings('notificationsEnabled', newState)

    toggleInProgressRef.current = true
    setNotificationLoading(true)

    try {
      if (newState) {
        const currentPerm = 'Notification' in window ? Notification.permission : 'default'

        if (currentPerm === 'granted') {
          setNotificationPermission('granted')
          const subscription = await subscribeToNotifications()
          if (!subscription) {
            setNotificationsEnabled(false)
            saveSettings('notificationsEnabled', false)
            alert('Unable to subscribe to notifications. Try again.')
          }
        } else if (currentPerm === 'denied') {
          setNotificationsEnabled(false)
          saveSettings('notificationsEnabled', false)
          setNotificationPermission('denied')
          alert('Please enable notifications in your browser settings')
        } else {
          const permissionGranted = await requestNotificationPermission()
          if (permissionGranted) {
            setNotificationPermission('granted')
            const subscription = await subscribeToNotifications()
            if (!subscription) {
              setNotificationsEnabled(false)
              saveSettings('notificationsEnabled', false)
              alert('Unable to subscribe to notifications. Try again.')
            }
          } else {
            setNotificationsEnabled(false)
            saveSettings('notificationsEnabled', false)
            setNotificationPermission('denied')
            alert('Please enable notifications in your browser settings')
          }
        }
      } else {
        await unsubscribeFromNotifications()
      }
    } catch (err) {
      console.error('Notification toggle error:', err)
      setNotificationsEnabled(!newState)
      saveSettings('notificationsEnabled', !newState)
      alert('Failed to update notification settings')
    } finally {
      setNotificationLoading(false)
      toggleInProgressRef.current = false
    }
  }

  const handleEmailNotificationToggle = () => {
    const newValue = !emailNotifications
    setEmailNotifications(newValue)
    saveSettings('emailNotifications', newValue)
  }

  const saveSettings = (key, value) => {
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}')
    settings[key] = value
    localStorage.setItem('userSettings', JSON.stringify(settings))
  }

  const handlePasswordReset = async () => {
    setPasswordError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required')
      return
    }

    const passwordValidation = validatePassword(newPassword)
    if (passwordValidation) {
      setPasswordError(passwordValidation)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setPasswordSaving(true)
    try {
      const response = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setPasswordError(data.error || 'Failed to update password')
        return
      }

      alert('Password updated successfully!')
      closePasswordModal()
    } catch (err) {
      console.error('Password reset error:', err)
      setPasswordError(err.message || 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  const closePasswordModal = () => {
    setShowPasswordModal(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
  }

  const handleLogout = () => {
    try {
      onClose()
    } catch (err) {
      console.error('Error closing modal:', err)
    }

    localStorage.removeItem('auth')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')

    window.dispatchEvent(new Event('authStateChanged'))

    try {
      navigate('/')
    } catch (err) {
      window.location.href = '/'
    }
  }

  const handleEmailSupport = (e) => {
    e.stopPropagation()
    e.preventDefault()
    window.location.href = "mailto:support@msecconnect.edu?subject=MSEC Connect Support"
    setTimeout(() => { onClose() }, 300)
  }

  if (!isOpen) return null

  const SettingsContent = () => (
    <div className="px-4 py-3 border-b border-[#e7edf4] relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!isInitializing) onClose()
        }}
        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
        aria-label="Close settings"
        style={{ touchAction: 'manipulation', boxSizing: 'border-box' }}
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex items-center gap-3 pr-2">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
          <span className="text-base font-bold text-[#134e9e]">
            {userEmail?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[#0b1220] font-semibold text-sm truncate">{userEmail}</h3>
          <p className="text-[#475569] text-xs capitalize">{userRole} Account</p>
        </div>
      </div>
    </div>
  )

  const SettingsBody = () => (
    <div className="px-3 py-3 space-y-2 flex-1 overflow-y-auto overflow-x-hidden smooth-scroll settings-content" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', touchAction: 'pan-y', WebkitTapHighlightColor: 'transparent', scrollBehavior: 'smooth', width: '100%', boxSizing: 'border-box' }}>
      {/* Account Section */}
      <div>
        <h4 className="text-sm font-semibold text-[#111418] mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          Account
        </h4>
        <div className="space-y-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowPasswordModal(true)
              setPasswordError('')
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/6 hover:bg-white/8 active:bg-white/5 transition-colors text-left min-h-[52px] cursor-pointer"
            style={{ touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4 text-[#60758a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#111418]">Reset Password</p>
              <p className="text-xs text-[#60758a] mt-0.5">Change your account password</p>
            </div>
            <svg className="w-4 h-4 text-[#60758a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              const destination = userRole?.toLowerCase() === 'admin' ? '/bookings' : '/booking-status'
              navigate(destination)
              onClose()
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/6 hover:bg-white/8 active:bg-white/5 transition-colors text-left min-h-[52px] cursor-pointer"
            style={{ touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4 text-[#60758a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#111418]">My Bookings</p>
              <p className="text-xs text-[#60758a] mt-0.5">View your booking history</p>
            </div>
            <svg className="w-4 h-4 text-[#60758a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="border-t border-[#e7edf4] pt-3">
        <h4 className="text-sm font-semibold text-[#111418] mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          Notifications
        </h4>

        {!notificationSupported && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-2">
            <p className="text-xs text-yellow-700">Browser notifications not supported</p>
          </div>
        )}

        {notificationPermission === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-2">
            <p className="text-xs text-red-700">Notifications blocked. Enable in browser settings.</p>
          </div>
        )}

        {notificationsEnabled && notificationPermission === 'granted' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-2 mb-2">
            <p className="text-xs text-green-700">Notifications enabled successfully!</p>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/6 min-h-[52px]">
            <div className="flex-1 pr-3">
              <p className="text-sm font-medium text-[#111418]">Push Notifications</p>
              <p className="text-xs text-[#60758a]">Get browser notifications</p>
            </div>
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!notificationLoading && notificationSupported && notificationPermission !== 'denied') {
                    handleNotificationToggle()
                  }
                }}
                disabled={notificationLoading || !notificationSupported || notificationPermission === 'denied'}
                className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  notificationsEnabled ? 'bg-[#3d99f5]' : 'bg-[#e7edf4]'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                {notificationLoading ? (
                  <svg className="animate-spin h-4 w-4 text-white mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                      notificationsEnabled ? 'ml-5' : 'ml-1'
                    }`}
                  />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/6 min-h-[52px]">
            <div className="flex-1 pr-3">
              <p className="text-sm font-medium text-[#111418]">Email Notifications</p>
              <p className="text-xs text-[#60758a]">Receive booking updates via email</p>
            </div>
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEmailNotificationToggle()
                }}
                className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors cursor-pointer ${
                  emailNotifications ? 'bg-[#3d99f5]' : 'bg-[#e7edf4]'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                    emailNotifications ? 'ml-5' : 'ml-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="border-t border-[#e7edf4] pt-3">
        <h4 className="text-sm font-semibold text-[#111418] mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          Help & Support
        </h4>
        <div className="space-y-1">
          <button
            type="button"
            onClick={handleEmailSupport}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/6 hover:bg-white/8 active:bg-white/5 transition-colors text-left min-h-[52px] cursor-pointer"
            style={{ touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4 text-[#60758a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-[#111418] flex-1">Email Support</span>
            <svg className="w-4 h-4 text-[#60758a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="border-t border-[#e7edf4] pt-3 mt-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleLogout()
          }}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-semibold text-sm transition-colors min-h-[48px] cursor-pointer"
          style={{ touchAction: 'manipulation' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  )

  const settingsPanel = (
    <div
      ref={settingsRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`w-full max-w-sm mx-auto flex flex-col relative overflow-hidden border border-white/20 ${
        mobileMode
          ? 'rounded-t-2xl rounded-b-none bg-white shadow-2xl max-h-[85vh]'
          : 'rounded-xl bg-white backdrop-blur-xl no-mobile-backdrop shadow-lg max-h-[90vh]'
      }`}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: mobileMode ? 'pan-y' : 'manipulation',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        boxSizing: 'border-box',
        boxShadow: mobileMode ? '0 -4px 30px rgba(2,6,23,0.18)' : '0 8px 28px rgba(2,6,23,0.06)'
      }}
    >
      <SettingsContent />
      <SettingsBody />
    </div>
  )

  const passwordResetModal = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.currentTarget === e.target) {
          closePasswordModal()
        }
      }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Reset Password</h2>

        {passwordError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{passwordError}</p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-500 focus:outline-none text-base"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 6 characters)"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-500 focus:outline-none text-base"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-500 focus:outline-none text-base"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={closePasswordModal}
            disabled={passwordSaving}
            className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60 font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePasswordReset}
            disabled={passwordSaving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-semibold text-sm transition-colors"
          >
            {passwordSaving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )

  // Desktop: render as dropdown
  if (!mobileMode) {
    return ReactDOM.createPortal(
      <>
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 p-3 z-50 desktop-offset">
          {settingsPanel}
        </div>
        {showPasswordModal && passwordResetModal}
      </>,
      document.body
    )
  }

  // Mobile: render as full-screen modal
  const mobileModalContent = (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.currentTarget === e.target && !isInitializing) {
          onClose()
        }
      }}
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
      }}
    >
      <div className="w-full sm:w-auto sm:max-w-sm mx-auto max-h-[85vh] overflow-hidden">
        {settingsPanel}
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return ReactDOM.createPortal(
      <>
        {mobileModalContent}
        {showPasswordModal && passwordResetModal}
      </>,
      document.body
    )
  }

  return (
    <>
      {mobileModalContent}
      {showPasswordModal && passwordResetModal}
    </>
  )
}

export default Settings
