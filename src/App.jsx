import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { PageSkeleton } from './components/Skeleton'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import { initNotifications } from './utils/notifications'
import { ensureBodyScrollable } from './utils/scrollFix'

// Lazy load components for better performance
const Home = lazy(() => import('./pages/Home'))
const Venues = lazy(() => import('./pages/Venues'))
const Events = lazy(() => import('./pages/Events'))
const Book = lazy(() => import('./pages/Book'))
const Bookings = lazy(() => import('./pages/Bookings'))
const BookingStatus = lazy(() => import('./pages/BookingStatus'))
const Login = lazy(() => import('./pages/Login'))
const SignUp = lazy(() => import('./pages/SignUp'))
const Contact = lazy(() => import('./pages/Contact'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const FAQ = lazy(() => import('./pages/FAQ'))
const ManageUsers = lazy(() => import('./pages/ManageUsers'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Suspense fallback
const LoadingSpinner = () => (<PageSkeleton />)

function AppContent() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'

  useEffect(() => {
    document.body.style.backgroundImage = 'none'
    document.body.style.backgroundSize = ''
    document.body.style.backgroundPosition = ''
    document.body.style.backgroundRepeat = ''
    document.body.style.backgroundAttachment = ''
  }, [isAuthPage])

  // Initialize notifications when app loads
  useEffect(() => {
    initNotifications().catch(error => {
      console.error('Failed to initialize notifications:', error)
    })
  }, [])

  useEffect(() => {
    const cleanup = ensureBodyScrollable()
    return cleanup
  }, [])

  return (
    <div
      className={`layout-shell flex w-full flex-col ${isAuthPage ? 'relative bg-cover bg-center bg-no-repeat bg-fixed' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}
      style={{
        fontFamily: 'Inter, Manrope, sans-serif',
        WebkitOverflowScrolling: 'touch',
        minHeight: '100vh',
        height: 'auto',
        overflow: 'visible',
        overflowY: 'auto',
        overflowX: 'hidden',
        ...(isAuthPage
          ? {
              backgroundImage:
                "linear-gradient(rgba(17, 24, 39, 0.38), rgba(17, 24, 39, 0.38)), url('/images/campus.jpeg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat'
            }
          : {})
      }}
    >
      <div className={`w-full max-w-full flex min-h-screen flex-col ${isAuthPage ? 'relative z-10' : ''}`}>
        <Header />
        <div className="flex flex-1 justify-center w-full">
          <main className={`${isAuthPage ? 'flex flex-col w-full max-w-full' : 'layout-content-container flex flex-col w-full max-w-full pb-24 md:pb-0'}`}>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/venues" element={<Venues />} />
                <Route path="/events" element={<Events />} />
                <Route path="/book" element={<Book />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/booking-status" element={<BookingStatus />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/manage-users" element={<ManageUsers />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/faq" element={<FAQ />} />
                {/* Fallback route for 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>

      {!isAuthPage && <BottomNav />}
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  )
}

export default App
