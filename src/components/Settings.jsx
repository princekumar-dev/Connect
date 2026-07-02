import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { 
  requestNotificationPermission, 
  subscribeToNotifications,
  unsubscribeFromNotifications,
  showNotification,
  isNotificationSupported,
  getNotificationPermission
  , checkCurrentSubscription
} from '../utils/notifications'
import { validatePassword } from '../utils/validation'

function Settings({ isOpen, onClose, userEmail, userRole, isMobile = false }) {
  const navigate = useNavigate()
  const settingsRef = useRef(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [notificationSupported, setNotificationSupported] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState('default')
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  // Detect actual viewport size so we can decide whether to show
  // the centered mobile modal or the desktop right-side panel.
  const [isFullWidthMobile, setIsFullWidthMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })

  // Derive the effective "mobile mode" based on prop OR viewport.
  // This keeps backwards compatibility when parent explicitly sets isMobile,
  // but prefers the actual viewport size for layout decisions.
  const mobileMode = isMobile || isFullWidthMobile
  // Track mounted state so async callbacks don't call setState after unmount
  const isMountedRef = useRef(true)

  // Close dropdown when clicking outside (only for desktop)
  useEffect(() => {
    if (isMobile) return // Don't attach click-outside listener for mobile
    
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        if (!isInitializing) onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, isMobile])

  // Close on Escape key (only for desktop)
  useEffect(() => {
    if (isMobile) return // Don't attach escape key listener for mobile
    
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, isMobile])

  // Lock background scroll when modal is open on mobile full-width.
  // IMPORTANT: the cleanup ALWAYS restores body scroll — never leave it locked.
  useEffect(() => {
    isMountedRef.current = true

    // Only apply scroll lock on mobile/full-width layouts
    if (isOpen && (isMobile || isFullWidthMobile)) {
      const prevOverflow = document.body.style.overflow
      const prevPosition = document.body.style.position
      const prevWidth    = document.body.style.width

      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width    = '100%'

      // Cleanup: ALWAYS restore — even if isMobile/isFullWidthMobile changes mid-render
      return () => {
        document.body.style.overflow = prevOverflow || ''
        document.body.style.position = prevPosition || ''
        document.body.style.width    = prevWidth    || ''
      }
    }

    // If not open (or not mobile), unconditionally ensure scroll is restored
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width    = ''

    return undefined
  }, [isOpen, isMobile, isFullWidthMobile])

  // Safety net: if this component unmounts for ANY reason (route change, etc.)
  // make sure we never leave body in a scroll-locked state.
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width    = ''
      document.body.style.top      = ''
    }
  }, [])

  // Always load settings from localStorage when modal is opened
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false
    setIsInitializing(true)

    const load = async () => {
      try {
        // Check notification support
        const isSupported = isNotificationSupported();
        if (!cancelled) setNotificationSupported(isSupported);

        const currentPermission = isSupported ? getNotificationPermission() : 'default';
        if (!cancelled) setNotificationPermission(currentPermission);

        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            if (!cancelled) setEmailNotifications(settings.emailNotifications !== false);
            if (!cancelled) {
              if (typeof settings.notificationsEnabled === 'boolean') {
                setNotificationsEnabled(settings.notificationsEnabled);
              } else {
                setNotificationsEnabled(false);
              }
            }

            // Also verify actual browser subscription state and prefer that if present
            try {
              const subResult = await checkCurrentSubscription()
              if (subResult && subResult.found) {
                // If subscription exists in browser, reflect it in UI and persist
                if (isMountedRef.current && !cancelled) setNotificationsEnabled(true)
                saveSettings('notificationsEnabled', true)
              }
            } catch (err) {
              // Ignore errors checking subscription
              console.error('Error checking current subscription on open:', err)
            }

          } catch (error) {
            console.error('Error loading settings:', error);
            if (!cancelled) setNotificationsEnabled(false);
          }
        } else {
          if (!cancelled) setNotificationsEnabled(false);
        }
      } finally {
        if (!cancelled && isMountedRef.current) setIsInitializing(false)
      }
    }

    load()

    return () => { cancelled = true }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return
    setShowPasswordReset(false)
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordError('')
    setPasswordSuccess('')
  }, [isOpen])

  // Detect small mobile widths so we can switch between desktop dropdown
  // and centered mobile modal behavior.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const update = () => {
      const isSmall = window.matchMedia('(max-width: 768px)').matches
      setIsFullWidthMobile(isSmall)
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  // Removed auto-enable notifications logic for all devices

  // Save settings to localStorage
  const saveSettings = (key, value) => {
    const currentSettings = JSON.parse(localStorage.getItem('userSettings') || '{}')
    const newSettings = { ...currentSettings, [key]: value }
    localStorage.setItem('userSettings', JSON.stringify(newSettings))
  }

  // Save notification toggle state to localStorage when changed
  useEffect(() => {
    const currentSettings = JSON.parse(localStorage.getItem('userSettings') || '{}')
    currentSettings.notificationsEnabled = notificationsEnabled
    localStorage.setItem('userSettings', JSON.stringify(currentSettings))
  }, [notificationsEnabled])

  // Keep a ref with the latest notificationsEnabled so event handlers
  // can read the current value at modal close and persist it.
  const notificationsEnabledRef = useRef(notificationsEnabled)
  useEffect(() => { notificationsEnabledRef.current = notificationsEnabled }, [notificationsEnabled])

  // Persist the current notificationsEnabled when the modal closes via
  // the settingsModalClose event (dispatched when component unmounts/close)
  useEffect(() => {
    const saveOnClose = () => {
      try {
        saveSettings('notificationsEnabled', notificationsEnabledRef.current)
      } catch (err) {
        console.error('Error saving notificationsEnabled on close:', err)
      }
    }
    window.addEventListener('settingsModalClose', saveOnClose)
    return () => window.removeEventListener('settingsModalClose', saveOnClose)
  }, [])

  // Diagnostic function to check notification system status
  const checkNotificationSystem = async () => {
    console.log('=== NOTIFICATION SYSTEM STATUS ===')
    console.log('1. Browser Support:', isNotificationSupported())
    console.log('2. Notification Permission:', Notification.permission)
    console.log('3. Service Worker Support:', 'serviceWorker' in navigator)
    console.log('4. Push Manager Support:', 'PushManager' in window)
    console.log('5. User Email:', userEmail)
    console.log('6. User Role:', userRole)
    
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        console.log('7. Service Worker Status:', registration.active ? 'Active' : 'Inactive')
        
        const subscription = await registration.pushManager.getSubscription()
        console.log('8. Push Subscription:', subscription ? 'Subscribed' : 'Not Subscribed')
        if (subscription) {
          console.log('   - Endpoint:', subscription.endpoint.substring(0, 50) + '...')
        }
      } catch (error) {
        console.error('7-8. Service Worker/Subscription Error:', error)
      }
    }
    
    console.log('9. Notifications Enabled State:', notificationsEnabled)
    console.log('10. Email Notifications:', emailNotifications)
    console.log('==================================')
  }

  const handleNotificationToggle = async () => {
    // Run diagnostic check
    await checkNotificationSystem()

    if (!notificationsEnabled) {
      // Optimistic enable: set state and persist immediately so closing modal
      // doesn't make the UI appear to revert before the async work finishes.
      setNotificationsEnabled(true)
      saveSettings('notificationsEnabled', true)
      setNotificationLoading(true)
      try {
        console.log('🔔 Attempting to enable notifications...')
        const granted = await requestNotificationPermission()
        console.log('Permission result:', granted)

        if (granted) {
          console.log('📝 Subscribing to notifications...')
          const subscriptionResult = await subscribeToNotifications()
          console.log('Subscription result:', subscriptionResult)

          if (isMountedRef.current) {
            setNotificationPermission('granted')
          }

          // Show success notification (best-effort)
          try {
            await showNotification('Notifications Enabled', {
              body: '🎉 You will now receive important updates about your bookings!',
              tag: 'notification-enabled-' + Date.now()
            })
          } catch (err) {
            // ignore failure to show notification
          }

          console.log('✅ Notifications enabled successfully')
        } else {
          console.warn('❌ Permission denied')
          // Revert optimistic change
          if (isMountedRef.current) setNotificationsEnabled(false)
          saveSettings('notificationsEnabled', false)
          alert('Please allow notifications in your browser settings to receive updates.')
        }
      } catch (error) {
        console.error('❌ Error enabling notifications:', error)
        if (isMountedRef.current) setNotificationsEnabled(false)
        saveSettings('notificationsEnabled', false)
        alert('Failed to enable notifications: ' + error.message)
      } finally {
        if (isMountedRef.current) setNotificationLoading(false)
      }
    } else {
      // Optimistic disable: persist immediately so UI reflects user action
      setNotificationsEnabled(false)
      saveSettings('notificationsEnabled', false)
      setNotificationLoading(true)
      try {
        console.log('🔕 Attempting to disable notifications...')
        await unsubscribeFromNotifications()
        if (isMountedRef.current) setNotificationPermission('default')
        console.log('✅ Notifications disabled successfully')
      } catch (error) {
        console.error('❌ Error disabling notifications:', error)
        // If disabling failed, revert optimistic change
        if (isMountedRef.current) setNotificationsEnabled(true)
        saveSettings('notificationsEnabled', true)
        alert('Failed to disable notifications: ' + error.message)
      } finally {
        if (isMountedRef.current) setNotificationLoading(false)
      }
    }
  }

  const handleTestNotification = async () => {
    try {
      console.log('Test notification button clicked')
      console.log('Notification permission:', Notification.permission)
      console.log('Notifications enabled:', notificationsEnabled)
      
      if (Notification.permission !== 'granted') {
        alert('Please enable notifications first by toggling the Push Notifications switch above.')
        return
      }
      
      // Use unique tag with timestamp to ensure notification shows every time
      const timestamp = Date.now()
      const uniqueTag = `test-notification-${timestamp}`
      
      console.log('Attempting to show test notification with tag:', uniqueTag)
      
      // Use the showNotification utility function which handles service worker properly
      await showNotification('Test Notification 🔔', {
        body: `This is a test notification from MSEC Connect! Time: ${new Date().toLocaleTimeString()}`,
        icon: '/images/android-chrome-192x192.png',
        badge: '/images/favicon-32x32.png',
        tag: uniqueTag,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        timestamp: timestamp,
        silent: false,
        data: {
          url: window.location.origin,
          timestamp: timestamp
        }
      })
      
      console.log('Test notification sent successfully using service worker')
      
    } catch (error) {
      console.error('Error sending test notification:', error)
      alert('Failed to send test notification: ' + error.message)
    }
  }

  const handleEmailNotificationToggle = () => {
    const newValue = !emailNotifications
    setEmailNotifications(newValue)
    saveSettings('emailNotifications', newValue)
  }

  const handleEmailSupport = (e) => {
    e.stopPropagation()
    e.preventDefault()
    
    const emailUrl = "mailto:support@msecconnect.edu?subject=MSEC Connect Support Request&body=Hello MSEC Connect Team,%0D%0A%0D%0APlease describe your issue or question here:%0D%0A%0D%0A"
    
    // Open email client
    window.location.href = emailUrl
    
    // Close modal after a short delay to ensure email client opens
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleLogout = () => {
    // Close the settings modal first so portals/scroll state are restored
    try {
      if (typeof onClose === 'function') onClose()
    } catch (err) {
      console.error('Error closing settings modal before logout:', err)
    }

    // Clear both new and old auth systems
    localStorage.removeItem('auth')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userRole')

    // Notify the app about auth state change so Header (and others) update
    window.dispatchEvent(new Event('authStateChanged'))

    // Use SPA navigation instead of forcing a hard reload so React state updates
    try {
      navigate('/')
    } catch (err) {
      // Fallback to full reload if navigate isn't available for some reason
      window.location.href = '/'
    }
  }

  const handleNavigate = (path) => {
    navigate(path)
    onClose()
  }

  const openPasswordReset = () => {
    setPasswordError('')
    setPasswordSuccess('')
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setShowPasswordReset(true)
  }

  const closePasswordReset = () => {
    if (passwordSaving) return
    setShowPasswordReset(false)
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordError('')
    setPasswordSuccess('')
  }

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All password fields are required')
      return
    }

    const passwordValidation = validatePassword(passwordForm.newPassword)
    if (passwordValidation) {
      setPasswordError(passwordValidation)
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match')
      return
    }

    setPasswordSaving(true)
    try {
      const response = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setPasswordError(data.error || 'Failed to update password')
        return
      }

      setPasswordSuccess('Password updated successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => {
        closePasswordReset()
      }, 1200)
    } catch (error) {
      setPasswordError(error.message || 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (!isOpen) {
    return null
  }

  const settingsPanel = (
    <div
      ref={settingsRef}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`w-full mx-auto flex flex-col relative overflow-hidden border border-white/20 ${
        mobileMode
          ? 'rounded-t-2xl rounded-b-none bg-white shadow-2xl max-h-[85vh]'
          : 'rounded-xl bg-white backdrop-blur-xl no-mobile-backdrop shadow-lg max-w-sm max-h-[90vh]'
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
        {/* Close button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!isInitializing) onClose();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!isInitializing) onClose();
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors touch-manipulation"
          aria-label="Close settings"
          style={{ touchAction: 'manipulation', boxSizing: 'border-box' }}
        >
          <svg 
            className="w-4 h-4 text-gray-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

      {/* Header */}
      <div className="px-4 py-3 sm:py-4 border-b border-[#e7edf4]">
        <div className="flex items-center gap-3 pr-2">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
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

      {/* Settings Content */}
      <div 
        className="px-3 sm:px-4 py-3 sm:py-4 space-y-2 sm:space-y-3 flex-1 overflow-y-auto overflow-x-hidden smooth-scroll settings-content"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          WebkitTapHighlightColor: 'transparent',
          scrollBehavior: 'smooth',
          willChange: 'scroll-position',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {showPasswordReset ? (
          /* Password Reset Inline Form */
          <div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closePasswordReset();
              }}
              className="flex items-center gap-1 text-xs text-[#3d99f5] font-medium mb-3 hover:underline"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h4 className="text-sm font-semibold text-[#111418] mb-1">Reset Password</h4>
            <p className="text-xs text-[#60758a] mb-3">Update the password for {userEmail}</p>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-[#111418] mb-1">Current Password</span>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoComplete="current-password"
                  required
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-[#111418] mb-1">New Password</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-[#111418] mb-1">Confirm New Password</span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoComplete="new-password"
                  required
                />
              </label>

              {passwordError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-700">
                  {passwordSuccess}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closePasswordReset}
                  disabled={passwordSaving}
                  className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex-1 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60"
                >
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
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
                e.stopPropagation();
                e.preventDefault();
                openPasswordReset();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                openPasswordReset();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/6 hover:bg-white/8 active:bg-white/5 transition-colors text-left min-h-[52px] touch-manipulation cursor-pointer"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="w-4 h-4 text-[#60758a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c-1.657 0-3 1.343-3 3v3h6v-3c0-1.657-1.343-3-3-3zm-6 3V9a6 6 0 1112 0v5" />
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
                e.stopPropagation();
                e.preventDefault();
                const destination = userRole?.toLowerCase() === 'admin' ? '/bookings' : '/booking-status';
                handleNavigate(destination);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const destination = userRole?.toLowerCase() === 'admin' ? '/bookings' : '/booking-status';
                handleNavigate(destination);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/6 hover:bg-white/8 active:bg-white/5 transition-colors text-left min-h-[52px] touch-manipulation cursor-pointer"
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

          {/* Notification Status Banner */}
          {!notificationSupported && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-2">
              <p className="text-xs text-yellow-700 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Browser notifications not supported
              </p>
            </div>
          )}
          {notificationPermission === 'denied' && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-2">
              <p className="text-xs text-red-700 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Notifications blocked. Enable in browser settings.
              </p>
            </div>
          )}
          {notificationsEnabled && notificationPermission === 'granted' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-2 mb-2">
              <p className="text-xs text-green-700 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Notifications enabled successfully!
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/6 min-h-[52px]">
              <div className="flex-1 pr-3 min-w-0">
                <p className="text-sm font-medium text-[#111418]">Push Notifications</p>
                <p className="text-xs text-[#60758a] mt-0.5">Get browser notifications</p>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!notificationLoading && notificationSupported && notificationPermission !== 'denied') {
                      handleNotificationToggle();
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!notificationLoading && notificationSupported && notificationPermission !== 'denied') {
                      handleNotificationToggle();
                    }
                  }}
                  disabled={notificationLoading || !notificationSupported || notificationPermission === 'denied'}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation cursor-pointer ${
                    notificationsEnabled ? 'bg-[#3d99f5]' : 'bg-[#e7edf4]'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  {notificationLoading ? (
                    <svg className="animate-spin h
                    -4 w-4 text-white mx-auto" fill="none" viewBox="0 0 24 24">
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
            {/* Test Notification Button */}
            {notificationsEnabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTestNotification();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleTestNotification();
                }}
                className="w-full flex items-center justify-center gap-1 p-2 rounded-md bg-white/6 hover:bg-white/8 active:bg-white/5 text-[#3d99f5] text-xs font-semibold transition-colors min-h-[36px] touch-manipulation cursor-pointer"
                style={{ touchAction: 'manipulation' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Send Test Notification
              </button>
            )}
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/6 min-h-[52px]">
              <div className="flex-1 pr-3 min-w-0">
                <p className="text-sm font-medium text-[#111418]">Email Notifications</p>
                <p className="text-xs text-[#60758a] mt-0.5">Receive booking updates via email</p>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleEmailNotificationToggle();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleEmailNotificationToggle();
                  }}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors touch-manipulation cursor-pointer ${
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

        {/* Help Section */}
        <div className="border-t border-[#e7edf4] pt-3">
          <h4 className="text-sm font-semibold text-[#111418] mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Help & Support
          </h4>
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleEmailSupport}
              onTouchEnd={handleEmailSupport}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/6 hover:bg-white/8 active:bg-white/5 transition-colors text-left min-h-[52px] touch-manipulation cursor-pointer"
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
          </>
        )}
      </div>

      {/* Logout Section */}
      <div className="border-t border-white/10 p-3 bg-white/8">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleLogout();
          }}
          onTouchEnd={(e) => {
            // Mobile devices sometimes only trigger touch events; handle both
            e.stopPropagation();
            e.preventDefault();
            handleLogout();
          }}
          className="w-full flex items-center justify-center gap-1 p-3 rounded-md bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-semibold text-xs transition-colors min-h-[40px] touch-manipulation cursor-pointer"
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

  if (!mobileMode) {
    return (
      <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 p-3 z-50 desktop-offset">
        {settingsPanel}
      </div>
    )
  }

  const mobileModalContent = (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
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
      mobileModalContent,
      document.body
    )
  }

  return mobileModalContent
}

export default Settings
