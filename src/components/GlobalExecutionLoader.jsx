import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

function GlobalExecutionLoader() {
  const location = useLocation()
  const barRef = useRef(null)
  const glowRef = useRef(null)
  const tagRef = useRef(null)
  const rafRef = useRef(null)
  const timersRef = useRef([])
  const stateRef = useRef({
    current: 0,
    target: 0,
    apiCount: 0,
    finishing: false,
  })

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const tick = () => {
    const s = stateRef.current
    const diff = s.target - s.current

    if (Math.abs(diff) < 0.2) {
      s.current = s.target
    } else {
      s.current += diff * 0.18
    }

    if (barRef.current) {
      barRef.current.style.width = s.current + '%'
    }

    if (s.finishing && s.current >= 99) {
      s.current = 0
      s.target = 0
      s.finishing = false
      if (barRef.current) {
        barRef.current.style.width = '0%'
        barRef.current.style.opacity = '0'
      }
      rafRef.current = null
      return
    }

    if (s.current < 0.3 && s.target === 0) {
      s.current = 0
      if (barRef.current) {
        barRef.current.style.width = '0%'
        barRef.current.style.opacity = '0'
      }
      rafRef.current = null
      return
    }

    if (barRef.current) {
      barRef.current.style.opacity = '1'
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  const startAnim = () => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }

  const setTarget = (val) => {
    stateRef.current.target = val
    startAnim()
  }

  const showProcessing = (show) => {
    if (tagRef.current) tagRef.current.style.display = show ? 'flex' : 'none'
    if (glowRef.current) glowRef.current.style.opacity = show ? '1' : '0'
  }

  const finishSequence = () => {
    showProcessing(false)
    clearTimers()
    stateRef.current.finishing = true
    stateRef.current.target = 100
    startAnim()
  }

  // Route change
  useEffect(() => {
    clearTimers()
    const s = stateRef.current
    s.current = 0
    s.finishing = false
    if (barRef.current) barRef.current.style.width = '0%'

    const t1 = setTimeout(() => setTarget(30), 50)
    const t2 = setTimeout(() => setTarget(60), 150)
    const t3 = setTimeout(() => setTarget(85), 300)
    const t4 = setTimeout(() => {
      finishSequence()
    }, 450)

    timersRef.current.push(t1, t2, t3, t4)
    return () => clearTimers()
  }, [location.pathname, location.search])

  // API progress
  useEffect(() => {
    let safety = null

    const onProgress = (e) => {
      const count = e.detail?.count || 0
      const s = stateRef.current
      if (safety) clearTimeout(safety)

      s.apiCount = count

      if (count > 0) {
        const next = s.target < 40 ? 50 : s.target < 75 ? s.target + 10 : 85
        setTarget(next)
        showProcessing(true)

        safety = setTimeout(() => {
          s.apiCount = 0
          finishSequence()
        }, 25000)
      } else {
        finishSequence()
      }
    }

    window.addEventListener('apiProgress', onProgress)
    return () => {
      window.removeEventListener('apiProgress', onProgress)
      if (safety) clearTimeout(safety)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimers()
    }
  }, [])

  return (
    <>
      <div
        ref={barRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '3px',
          width: '0%',
          zIndex: 99999,
          pointerEvents: 'none',
          opacity: 0,
          background: 'linear-gradient(90deg, #2563eb, #93c5fd, #3d99f5, #2563eb)',
          backgroundSize: '300% 100%',
          animation: 'blueShimmer 2s linear infinite',
          boxShadow: '0 0 10px rgba(37,99,235,0.8), 0 0 18px rgba(61,153,245,0.5)',
        }}
      />
      <div
        ref={glowRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 0.4s ease',
          background: 'radial-gradient(circle at top, rgba(61,153,245,0.2) 0%, rgba(61,153,245,0.05) 50%, transparent 80%)',
        }}
      />
      <div
        ref={tagRef}
        style={{
          display: 'none',
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          alignItems: 'center',
          gap: '8px',
          padding: '8px 18px',
          borderRadius: '9999px',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(61,153,245,0.4)',
          boxShadow: '0 8px 32px rgba(61,153,245,0.18), 0 2px 10px rgba(0,0,0,0.06)',
          fontSize: '13px',
          fontWeight: 600,
          color: '#1d4ed8',
          animation: 'gelSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <div style={{
          width: 12, height: 12,
          border: '2px solid rgba(61,153,245,0.2)',
          borderTop: '2px solid #3d99f5',
          borderRadius: '50%',
          animation: 'gelSpin 0.8s linear infinite',
        }} />
        <span>Processing...</span>
      </div>
      <style>{`
        @keyframes blueShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes gelSlideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes gelSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

export default GlobalExecutionLoader
