import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Basic validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      // Create user via API
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, password: formData.password, role: 'user' })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        return
      }

      // On success, navigate to login
      setSuccess('Account created. Redirecting to sign in...')
      setTimeout(() => navigate('/login'), 900)
    } catch (err) {
      console.error('Sign up error:', err)
      setError('An error occurred while creating account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
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

      <div className="min-h-screen flex items-center justify-center px-4 py-8 smooth-scroll mobile-smoothest-scroll no-mobile-anim" style={{fontFamily: 'Inter, sans-serif'}}>
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-[rgba(93,101,117,0.34)] border border-white/35 p-8 rounded-3xl shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/90 rounded-full mb-6 shadow-sm">
                <svg className="w-8 h-8 text-[#3d99f5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-[-0.03em]">Create Account</h1>
              <p className="text-white/90 text-lg">Sign up for your MSEC Connect account</p>
            </div>

            {error && (
              <div className="mb-6">
                <div className="p-4 border-l-4 border-red-400 rounded-lg bg-[rgba(127,29,29,0.45)] border border-red-200/40">
                  <p className="text-red-50 text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6">
                <div className="p-4 border-l-4 border-emerald-300 rounded-lg bg-[rgba(6,95,70,0.4)] border border-emerald-200/35">
                  <p className="text-emerald-50 text-sm font-medium">{success}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-white mb-3">Full Name</label>
                <input name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-4 border-0 rounded-2xl bg-[#edf4ff] border border-white/45 focus:ring-2 focus:ring-[#8ec5ff] focus:outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" placeholder="John Doe" required />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-3">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-4 border-0 rounded-2xl bg-[#edf4ff] border border-white/45 focus:ring-2 focus:ring-[#8ec5ff] focus:outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" placeholder="you@school.com" required />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-3">Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full px-4 py-4 border-0 rounded-2xl bg-[#edf4ff] border border-white/45 focus:ring-2 focus:ring-[#8ec5ff] focus:outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" placeholder="Create a password" required />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-3">Confirm Password</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className="w-full px-4 py-4 border-0 rounded-2xl bg-[#edf4ff] border border-white/45 focus:ring-2 focus:ring-[#8ec5ff] focus:outline-none transition-all duration-200 text-slate-900 placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" placeholder="Repeat password" required />
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isLoading} className="login-wave-button w-full py-4 px-6 text-white text-lg font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="truncate">{isLoading ? 'Creating account...' : 'Create Account'}</span>
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-white/85 text-sm">Already have an account? <span className="text-[#9bd0ff] font-semibold cursor-pointer hover:text-white hover:underline ml-1" onClick={() => navigate('/login')}>Sign in</span></p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SignUp
