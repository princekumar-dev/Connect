import { useState, useEffect } from 'react'

export default function TopLoadingBar({ isLoading }) {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setVisible(true)
      setProgress(0)
      const t1 = setTimeout(() => setProgress(30), 100)
      const t2 = setTimeout(() => setProgress(60), 400)
      const t3 = setTimeout(() => setProgress(80), 800)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    } else {
      setProgress(100)
      const t = setTimeout(() => { setVisible(false); setProgress(0) }, 300)
      return () => clearTimeout(t)
    }
  }, [isLoading])

  if (!visible && !isLoading) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600 transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 0 ? 0 : 1,
          boxShadow: '0 0 10px rgba(59,130,246,0.5)'
        }}
      />
    </div>
  )
}
