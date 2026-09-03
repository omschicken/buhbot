import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function LoadingBar() {
  const location = useLocation()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    setProgress(0)
    const t1 = setTimeout(() => setProgress(70), 50)
    const t2 = setTimeout(() => setProgress(100), 300)
    const t3 = setTimeout(() => setVisible(false), 650)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [location.pathname])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, height: 2,
      width: `${progress}%`, background: '#e4a832',
      zIndex: 9999, transition: progress === 70 ? 'width 0.2s ease' : progress === 100 ? 'width 0.3s ease' : 'none',
    }} />
  )
}
