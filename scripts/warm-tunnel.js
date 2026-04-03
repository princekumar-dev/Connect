// Simple tunnel warm-up script. Run during development to keep tunnel/backend warm.
// Usage: node scripts/warm-tunnel.js

const https = require('https')
const url = process.env.WARM_TUNNEL_URL || 'https://wwzj7nmj-3000.inc1.devtunnels.ms/'
const interval = parseInt(process.env.WARM_TUNNEL_INTERVAL || '30000', 10) // default 30s

function hit() {
  const req = https.get(url, (res) => {
    // consume data to complete request
    res.on('data', () => {})
    res.on('end', () => {
      console.log(`Warm-tunnel: ${url} -> ${res.statusCode}`)
    })
  })
  req.on('error', (err) => console.error('Warm-tunnel error:', err.message))
  req.end()
}

console.log('Starting tunnel warm-up for', url, 'every', interval, 'ms')
// Trigger immediately and then on interval
hit()
setInterval(hit, interval)
