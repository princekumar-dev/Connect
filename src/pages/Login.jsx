import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    try {
      // Send authentication request to the backend API
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        // Set authentication state in localStorage
        localStorage.setItem('auth', JSON.stringify({
          isAuthenticated: true,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          department: data.user.department,
          loginTime: new Date().toISOString()
        }))

        // Also save individual items for backward compatibility
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('userEmail', data.user.email)
        localStorage.setItem('userRole', data.user.role)

        // Redirect to home page after successful login
        navigate('/')
        
        // Trigger a custom event to update header authentication state
        window.dispatchEvent(new Event('authStateChanged'))
      } else {
        setError(data.error || 'Invalid email or password')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('An error occurred during login. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>
        {`
          @keyframes waveButtonAnimation {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }

          .login-wave-button {
            background: linear-gradient(90deg, #3d99f5, #c0c0c0, #3d99f5, #c0c0c0);
            background-size: 300% 100%;
            animation: waveButtonAnimation 3s ease-in-out infinite;
            transition: all 0.3s ease;
          }

          .login-wave-button:hover {
            animation-duration: 1.5s;
          }
        `}
      </style>

      <div
        className="relative min-h-screen overflow-hidden flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8 smooth-scroll mobile-smoothest-scroll no-mobile-anim"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >

        <div className="relative z-10 w-full max-w-md mx-auto">
          <div className="backdrop-blur-xl bg-[rgba(93,101,117,0.34)] border border-white/35 p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/90 rounded-full mb-4 sm:mb-6 shadow-sm">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#d79a1e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-[2.2rem] sm:text-5xl font-black text-white tracking-[-0.03em] mb-1.5 sm:mb-2">Welcome Back</h1>
              <p className="text-white/90 text-sm sm:text-lg font-medium">Sign in to your MSEC Connect account</p>
            </div>

            {error && (
              <div className="mb-6">
                <div className="backdrop-blur-sm p-4 border-l-4 border-red-400 rounded-lg bg-[rgba(127,29,29,0.45)] border border-red-200/40">
                  <p className="text-red-50 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <label className="block text-sm font-bold text-white mb-3">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 sm:py-4 border-0 rounded-xl sm:rounded-2xl bg-[#edf4ff] border border-white/45 focus:ring-2 focus:ring-[#8ec5ff] focus:outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-3">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 sm:py-4 border-0 rounded-xl sm:rounded-2xl bg-[#edf4ff] border border-white/45 focus:ring-2 focus:ring-[#8ec5ff] focus:outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="text-center">
                <p className="text-white/80 text-sm cursor-pointer hover:text-white transition-colors">
                  Forgot password?
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="login-wave-button w-full py-3.5 sm:py-4 px-6 text-white text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="truncate">
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </span>
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-white/85 text-sm">
                Don't have an account?
                <span className="text-[#9bd0ff] font-semibold cursor-pointer hover:text-white hover:underline ml-1" onClick={() => navigate('/signup')}>
                  Sign up
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login
