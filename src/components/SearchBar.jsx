export default function SearchBar({ value, onChange, onSubmit, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <div className="relative max-w-md w-full">
        <form onSubmit={onSubmit} className="glass-card no-mobile-backdrop flex items-center rounded-2xl shadow-lg relative mobile-smoothest-scroll">
          <div className="flex items-center justify-center pl-4 sm:pl-6">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={placeholder}
            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden text-gray-900 focus:outline-0 focus:ring-0 h-full placeholder:text-gray-500 px-3 sm:px-4 text-sm sm:text-base md:text-lg font-medium leading-normal border-0 bg-transparent mobile-form-input tablet-form-input desktop-form-input"
          />
        </form>
      </div>
    </div>
  )
}
