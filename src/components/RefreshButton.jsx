import React from 'react'

// Shared Refresh button used across pages to keep label, spinner, spacing and disabled behavior consistent
export default function RefreshButton({ isLoading = false, onClick = () => {}, className = '', label = 'Refresh', ariaLabel = 'Refresh' }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      aria-label={ariaLabel}
      className={`glass-button flex items-center gap-2 px-4 py-2 text-[#3d99f5] rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {isLoading ? 'Refreshing...' : label}
    </button>
  )
}
