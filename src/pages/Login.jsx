import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MSEC_EMAIL_PATTERN } from '../utils/validation'
import TopLoadingBar from '../components/TopLoadingBar'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const prefillEmail = location.state?.prefillEmail
    if (!prefillEmail) return

    setFormData(prev => ({
      ...prev,
      email: prefillEmail
    }))

    if (location.state?.justSignedUp) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setFieldErrors(prev => ({ ...prev, [name]: null }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setFieldErrors({})

    const newFieldErrors = {}
    if (!formData.email) newFieldErrors.email = 'Email is required'
    else if (!MSEC_EMAIL_PATTERN.test(formData.email.trim())) newFieldErrors.email = 'Use your @msec.edu.in email'
    if (!formData.password) newFieldErrors.password = 'Password is required'

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        })
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('auth', JSON.stringify({
          isAuthenticated: true,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          department: data.user.department,
          loginTime: new Date().toISOString()
        }))

        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('userEmail', data.user.email)
        localStorage.setItem('userRole', data.user.role)
        if (data.token) {
          localStorage.setItem('token', data.token)
          document.cookie = `auth_token=${encodeURIComponent(data.token)}; path=/; max-age=604800; SameSite=Lax`
        }

        navigate('/')
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
      <TopLoadingBar isLoading={isLoading} />

      <style>{`
        @keyframes waveButtonAnimation {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .login-wave-button {
          background: linear-gradient(90deg, #3d99f5, #c0c0c0, #3d99f5, #c0c0c0);
          background-size: 300% 100%;
          animation: waveButtonAnimation 3s ease-in-out infinite;
          transition: all 0.3s ease;
        }
        .login-wave-button:hover { animation-duration: 1.5s; }
      `}</style>

      <div
        className="relative min-h-screen flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8 smooth-scroll mobile-smoothest-scroll no-mobile-anim"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >

        <div className="relative z-10 w-full max-w-md mx-auto">
          <div className="backdrop-blur-xl bg-[rgba(93,101,117,0.34)] border border-white/35 p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/90 rounded-full mb-4 sm:mb-6 shadow-sm">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#3d99f5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-[2.2rem] sm:text-5xl font-black text-white tracking-[-0.03em] mb-1.5 sm:mb-2">Welcome Back</h1>
              <p className="text-white/90 text-sm sm:text-lg font-medium">Sign in to your MSEC Connect account</p>
            </div>

            {error && (
              <div className="mb-6" role="alert">
                <div className="backdrop-blur-sm p-4 border-l-4 border-red-400 rounded-lg bg-[rgba(127,29,29,0.45)] border border-red-200/40">
                  <p className="text-red-50 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6" noValidate>
              <div>
                <label htmlFor="login-email" className="block text-sm font-bold text-white mb-3">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  pattern=".*@msec\.edu\.in$"
                  title="Please use your MSEC email address (@msec.edu.in)"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                  className={`w-full px-4 py-3 sm:py-4 border-0 rounded-xl sm:rounded-2xl bg-[#edf4ff] border border-white/45 focus:ring-2 focus:ring-[#8ec5ff] focus:outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${fieldErrors.email ? 'ring-2 ring-red-400' : ''}`}
                  placeholder="Enter your MSEC email address"
                  required
                />
                {fieldErrors.email && <p id="login-email-error" className="mt-1 text-xs text-red-300" role="alert">{fieldErrors.email}</p>}
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-bold text-white mb-3">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                    className={`w-full px-4 py-3 sm:py-4 pr-12 border-0 rounded-xl sm:rounded-2xl bg-[#edf4ff] border border-white/45 focus:ring-2 focus:ring-[#8ec5ff] focus:outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${fieldErrors.password ? 'ring-2 ring-red-400' : ''}`}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
                {fieldErrors.password && <p id="login-password-error" className="mt-1 text-xs text-red-300" role="alert">{fieldErrors.password}</p>}
              </div>

              <div className="text-center">
                <p className="text-white/80 text-sm">
                  Forgot password?
                </p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="login-wave-button w-full py-3.5 sm:py-4 px-6 text-white text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
