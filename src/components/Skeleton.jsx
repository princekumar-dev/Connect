function Skeleton({ className = '' }) {
  return (
    <div
      className={`skeleton-shimmer rounded-xl bg-slate-200/80 ${className}`}
      aria-hidden="true"
    />
  )
}

function HeaderSkeleton() {
  return (
    <div className="mb-8 text-center">
      <Skeleton className="mx-auto mb-4 h-12 w-full max-w-md rounded-2xl" />
      <Skeleton className="mx-auto h-5 w-full max-w-2xl" />
    </div>
  )
}

export function CardGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
          <Skeleton className="mb-4 aspect-video w-full" />
          <Skeleton className="mb-3 h-5 w-3/4" />
          <Skeleton className="mb-4 h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function VenueGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-sm">
          <Skeleton className="h-48 w-full rounded-none sm:h-56" />
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-7 w-28 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="col-span-2 h-12 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function EventListSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col gap-4 rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm sm:flex-row sm:gap-6 sm:p-6">
          <Skeleton className="h-48 w-full flex-shrink-0 sm:h-32 sm:w-32" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-6 w-3/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function BookingListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function UserGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm">
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index}>
            <Skeleton className="mb-2 h-4 w-32" />
            <Skeleton className="h-14 w-full" />
          </div>
        ))}
        <div className="lg:col-span-2">
          <Skeleton className="mb-2 h-4 w-40" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  )
}

export function PageSkeleton({ route = '' }) {
  const isVenuePage = route.includes('venues')
  const isEventPage = route.includes('events')
  const isBookingPage = route.includes('bookings') || route.includes('booking-status')
  const isBookForm = route.includes('book') && !isBookingPage
  const isUsersPage = route.includes('manage-users')
  const isAuthPage = route.includes('login') || route.includes('signup')

  if (isAuthPage) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl border border-white/35 bg-white/30 p-8 shadow-2xl backdrop-blur-xl">
          <Skeleton className="mx-auto mb-6 h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto mb-3 h-10 w-64" />
          <Skeleton className="mx-auto mb-8 h-5 w-72 max-w-full" />
          <div className="space-y-5">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <HeaderSkeleton />
        {isVenuePage && <VenueGridSkeleton />}
        {isEventPage && <EventListSkeleton />}
        {isBookingPage && <BookingListSkeleton />}
        {isBookForm && <FormSkeleton />}
        {isUsersPage && <UserGridSkeleton />}
        {!isVenuePage && !isEventPage && !isBookingPage && !isBookForm && !isUsersPage && (
          <CardGridSkeleton />
        )}
      </div>
    </div>
  )
}

export default Skeleton
