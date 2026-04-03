import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './performance.css'

// Error handling for the root element
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

// Create root with error boundary
const root = ReactDOM.createRoot(rootElement)

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} catch (error) {
  console.error('Failed to render app:', error)
  // Fallback rendering without StrictMode
  root.render(<App />)
}
