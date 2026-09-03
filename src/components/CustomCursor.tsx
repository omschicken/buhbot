import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [isPointer, setIsPointer] = useState(false)

  useEffect(() => {
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    const over = (e: MouseEvent) => {
      const el = e.target as Element
      setIsPointer(window.getComputedStyle(el).cursor === 'pointer' || el.tagName === 'BUTTON' || el.tagName === 'A')
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseover', over)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseover', over) }
  }, [])

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full mix-blend-screen"
        animate={{ x: pos.x - 4, y: pos.y - 4, scale: isPointer ? 1.5 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.1 }}
        style={{ width: 8, height: 8, background: '#00ff88', boxShadow: '0 0 8px #00ff88, 0 0 16px #00ff88' }}
      />
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9998] rounded-full border border-[#00ff88]/40"
        animate={{ x: pos.x - 20, y: pos.y - 20, scale: isPointer ? 1.5 : 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        style={{ width: 40, height: 40 }}
      />
    </>
  )
}
