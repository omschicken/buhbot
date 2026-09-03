import { useEffect, useRef } from 'react'

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let dotX = 0, dotY = 0, ringX = 0, ringY = 0

    const onMove = (e: MouseEvent) => { dotX = e.clientX; dotY = e.clientY }
    window.addEventListener('mousemove', onMove)

    let raf: number
    const animate = () => {
      ringX += (dotX - ringX) * 0.15
      ringY += (dotY - ringY) * 0.15
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dotX - 5}px, ${dotY - 5}px)`
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX - 11}px, ${ringY - 11}px)`
      }
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  return (
    <>
      <div ref={dotRef} style={{
        position: 'fixed', top: 0, left: 0, width: 10, height: 10,
        borderRadius: '50%', background: 'var(--gold)', pointerEvents: 'none',
        zIndex: 99999, mixBlendMode: 'difference',
      }} />
      <div ref={ringRef} style={{
        position: 'fixed', top: 0, left: 0, width: 22, height: 22,
        borderRadius: '50%', border: '2px solid var(--gold)', pointerEvents: 'none',
        zIndex: 99998, opacity: 0.6,
      }} />
    </>
  )
}
