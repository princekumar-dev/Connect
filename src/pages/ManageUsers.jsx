import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/NotificationModal'
import RefreshButton from '../components/RefreshButton'
import { getCurrentUser } from '../utils/auth-helper.js'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useRef } from 'react'

function ManageUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [serverCount, setServerCount] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState('')

  // New user form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('staff')
  const [isAddingUser, setIsAddingUser] = useState(false)

  const navigate = useNavigate()

  // Load users (attempt API, fall back to mock)
  // Fetch users from API
  const fetchUsersFromApi = async () => {
    setLoading(true)
    setError(null)
    try {
      // Pass identifying headers (useful if server-side checks are added later)
      const current = getCurrentUser()
      const headers = { 'Content-Type': 'application/json' }
      if (current?.email) headers['userEmail'] = current.email
      if ((current?.role || '').toLowerCase() === 'admin') headers['isAdmin'] = 'true'

      const res = await fetch('/api/users', { headers })
      let data = null
      try {
        data = await res.json()
      } catch (parseErr) {
        console.warn('Failed to parse /api/users response as JSON', parseErr)
      }

  // keep raw response for debugging (removed from UI)

      if (!res.ok) {
        const errMsg = (data && (data.error || data.message)) ? (data.error || data.message) : `API response not OK (${res.status})`
        setError(errMsg)
        setUsers([])
        setServerCount(Array.isArray(data?.users) ? data.users.length : null)
        setLoading(false)
        return
      }
      // Normalize user objects to a consistent client-side shape
  const serverUsers = Array.isArray(data?.users) ? data.users : (Array.isArray(data) ? data : [])
      const normalized = serverUsers.map(u => ({
        id: u._id || u.id || u.id,
        name: u.name || '',
        email: u.email || '',
        role: u.role || 'staff',
        autoApprove: !!u.autoApprove,
        priority: u.priority || 'low',
        // keep other fields if present
        ...u
      }))
  setUsers(normalized)
  setLastUpdated(new Date())
  setServerCount(serverUsers.length)
    } catch (err) {
      console.error('Failed to fetch users:', err.message)
      setError('Failed to fetch users: ' + err.message)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Require admin role to access this page
    const current = getCurrentUser()
    if (!current || (current.role || '').toLowerCase() !== 'admin') {
      // Not logged in as admin -> redirect to login
      navigate('/login', { replace: true })
      return
    }

    fetchUsersFromApi()

    // Optional: poll for changes every 30s
    const poll = setInterval(fetchUsersFromApi, 30000)
    return () => clearInterval(poll)
  }, [navigate])

  // Initialize search state from URL params (mirrors Venues page behavior)
  useEffect(() => {
    const q = searchParams.get('search') || ''
    setSearchInput(q)
  }, [searchParams])

  // Debounce search input -> update URL params
  useEffect(() => {
    const handler = setTimeout(() => {
      const q = (searchInput || '').trim()
      if (q) {
        setSearchParams({ search: q })
      } else {
        setSearchParams({})
      }
    }, 250)
    return () => clearTimeout(handler)
  }, [searchInput])

  // Filtered users derived from search param
  const [filteredUsers, setFilteredUsers] = useState([])
  useEffect(() => {
    const q = (searchParams.get('search') || '').trim().toLowerCase()
    if (q) {
      setFilteredUsers(users.filter(u => (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      )))
    } else {
      setFilteredUsers(users)
    }
  }, [users, searchParams])

  const [showAddModal, setShowAddModal] = useState(false)
  const addButtonRef = useRef(null)

  // Prevent background scrolling on mobile when modal is open
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Use mobile breakpoint consistent with CSS (<= 768px)
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    if (!isMobile) return

    if (showAddModal) {
      // Save previous inline styles so we can restore them
      const prevOverflow = document.body.style.overflow
      const prevPosition = document.body.style.position
      const prevTop = document.body.style.top
      const scrollY = window.scrollY || window.pageYOffset || 0

      // Lock scroll by fixing the body and preventing overflow
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`

      return () => {
        // Restore previous styles and restore scroll position
        document.body.style.overflow = prevOverflow
        document.body.style.position = prevPosition
        document.body.style.top = prevTop
        window.scrollTo(0, scrollY)
      }
    }
    // If modal isn't open, no-op (no effect to cleanup)
    return undefined
  }, [showAddModal])

  const handleAddUser = async (e) => {
    e.preventDefault()
    const newUser = { name, email, password, role }
    setIsAddingUser(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to create user')
      }
      const created = await res.json()
      // Refresh users list from server to get canonical state
      await fetchUsersFromApi()

      // Reset form
      setName('')
      setEmail('')
      setPassword('')
      setRole('staff')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAddingUser(false)
    }
    // close modal after attempt (if still open)
    setShowAddModal(false)
  }

  const handleToggleAutoApprove = async (userId, value) => {
    // Optimistically update UI and call PATCH endpoint
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, autoApprove: value } : u))
    try {
      const res = await fetch(`/api/users?action=auto-approve&userId=${encodeURIComponent(userId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ autoApprove: value }) })
      if (!res.ok) throw new Error('Failed to update auto-approve')
      // Refresh to ensure canonical state
      await fetchUsersFromApi()
    } catch (err) {
      console.warn('Failed to update auto-approve on server, reverting:', err.message)
      await fetchUsersFromApi()
    }
  }

  const handleChangePriority = async (userId, newPriority) => {
    // If newPriority is high and other users have high, we allow multiple highs but we
    // enforce that high users take precedence in client-side logic where needed.
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, priority: newPriority } : u))
    try {
      const res = await fetch(`/api/users?action=priority&userId=${encodeURIComponent(userId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priority: newPriority }) })
      if (!res.ok) throw new Error('Failed to update priority')
      await fetchUsersFromApi()
    } catch (err) {
      console.warn('Failed to update priority on server, reverting:', err.message)
      await fetchUsersFromApi()
    }
  }

  // Manual refresh control
  const handleRefresh = () => fetchUsersFromApi()

  // Confirm dialog state for deletions
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, userId: null })

  const deleteUser = async (userId) => {
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && (data.success || data.deleted)) {
        // remove locally without refetching for snappier UI
        setUsers(prev => prev.filter(u => u.id !== userId))
        // attempt canonical refresh in background
        fetchUsersFromApi()
      } else {
        // fallback: refresh to ensure canonical state and show console
        console.warn('Failed to delete user on server:', data.error || data)
        await fetchUsersFromApi()
      }
    } catch (err) {
      console.error('Error deleting user:', err.message)
      await fetchUsersFromApi()
    }
  }

  const handleDeleteClick = (userId) => {
    setConfirmDialog({ isOpen: true, userId })
  }

  const handleDeleteConfirm = () => {
    if (confirmDialog.userId) {
      deleteUser(confirmDialog.userId)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 smooth-scroll mobile-smoothest-scroll no-mobile-anim">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section (matched to Venues style) */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">Manage Users</h1>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">Add, manage, and configure user accounts — control auto-approve and priority settings from a single place.</p>
            </div>

            {/* Search Bar + Add button (mirrors Venues search) */}
            <div className="flex justify-center mb-6">
              <div className="relative max-w-md w-full">
                <div className="glass-card no-mobile-backdrop flex w-full flex-1 items-stretch h-full overflow-hidden rounded-2xl shadow-2xl">
                  <div className="flex items-center justify-center pl-4 sm:pl-6">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
                      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-gray-900 focus:outline-0 focus:ring-0 h-full placeholder:text-gray-500 px-3 sm:px-4 text-sm sm:text-base md:text-lg font-medium leading-normal border-0 bg-transparent mobile-form-input tablet-form-input desktop-form-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results header & Add button (aligned) */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found</div>
              <div className="flex items-center gap-2">
              {/* Debug / status info */}
              {lastUpdated && (
                <div className="text-xs text-gray-500 mr-4">Updated: {new Date(lastUpdated).toLocaleTimeString()}</div>
              )}
              {/* Server count removed per request */}
                <RefreshButton isLoading={loading} onClick={handleRefresh} />
              <button
                ref={addButtonRef}
                onClick={() => setShowAddModal(true)}
                className="glass-button flex items-center gap-2 px-6 py-3 text-blue-600 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105"
                aria-haspopup="dialog"
                aria-controls="add-user-modal"
                aria-label="Add user"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">{showAddModal ? 'Cancel' : 'Add User'}</span>
              </button>
            </div>
          </div>

          {/* User list - use grid cards similar to venues */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {loading ? (
              <div className="col-span-full text-center py-8">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="col-span-full">
                <div className="glass-card no-mobile-backdrop p-12 text-center mobile-smoothest-scroll">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="heading-md text-xl text-gray-700 mb-2">No users found</h3>
                  <p className="text-secondary mb-6">No users match your search.</p>
                  {error && (
                    <div className="mt-4 text-sm text-red-600">{error}</div>
                  )}
                  {/* Raw API debug UI removed */}
                </div>
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="glass-card no-mobile-backdrop group hover:scale-[1.02] transition-all duration-300 overflow-hidden p-4 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="text-xl font-semibold text-gray-900">{user.name}</div>
                          <div className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">{user.role}</div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{user.email}</div>
                      </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleDeleteClick(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors border border-transparent hover:border-red-100"
                        title="Delete user"
                        aria-label={`Delete ${user.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add User Modal (same as before) */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
              <div 
                onClick={() => {
                  setShowAddModal(false)
                  setTimeout(() => addButtonRef.current?.focus(), 0)
                }} 
                onMouseDown={() => {
                  setShowAddModal(false)
                  setTimeout(() => addButtonRef.current?.focus(), 0)
                }}
                onTouchStart={() => {
                  setShowAddModal(false)
                  setTimeout(() => addButtonRef.current?.focus(), 0)
                }}
                className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm no-mobile-backdrop" 
              />
              <div 
                onClick={(e) => e.stopPropagation()} 
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="relative glass-modal rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold">Add User</h3>
                  <button onClick={() => { setShowAddModal(false); setTimeout(() => addButtonRef.current?.focus(), 0) }} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="flex items-center gap-3 text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.616 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Full Name
                    </label>
                    <input required placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} className="form-input p-4 rounded-lg w-full" autoComplete="name" />
                  </div>

                  <div>
                    <label className="flex items-center gap-3 text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12v1a4 4 0 01-8 0v-1M12 14v2m0-6v2" />
                      </svg>
                      Email
                    </label>
                    <input required placeholder="your.email@school.com" type="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input p-4 rounded-lg w-full bg-blue-50" autoComplete="off" />
                  </div>

                  <div>
                    <label className="flex items-center gap-3 text-sm font-medium text-gray-700 mb-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3zM5 11h14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8z" />
                      </svg>
                      Password
                    </label>
                    <input required placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input p-4 rounded-lg w-full bg-blue-50" autoComplete="new-password" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Role</label>
                      <select value={role} onChange={e => setRole(e.target.value)} className="form-input p-4 rounded-lg w-full">
                        <option value="admin">admin</option>
                        <option value="principal">principal</option>
                        <option value="secretary">secretary</option>
                        <option value="staff">staff</option>
                      </select>
                    </div>

                    {/* Priority / Auto-approve removed per request */}
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-3">
                    <button type="submit" disabled={isAddingUser} className={`glass-button w-full md:w-auto py-3 px-4 text-blue-600 text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${isAddingUser ? 'opacity-80' : ''}`}>
                      <span className="truncate">{isAddingUser ? 'Adding...' : 'Add User'}</span>
                    </button>

                    {/* Cancel removed — use the X at top or click on backdrop to close */}
                  </div>

                  {error && <div className="text-red-600 mt-2">{error}</div>}
                </form>
              </div>
            </div>
              )}

          {/* Confirm dialog for deleting users */}
          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            onClose={() => setConfirmDialog({ isOpen: false, userId: null })}
            onConfirm={handleDeleteConfirm}
            title="Delete User"
            message="Are you sure you want to delete this user? This action cannot be undone."
            confirmText="Delete"
            type="danger"
          />
        </div>
      </div>
    </div>
  )
}

export default ManageUsers
