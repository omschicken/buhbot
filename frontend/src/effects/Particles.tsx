import { useEffect, useState } from 'react'

interface Particle { id: number; x: number; delay: number; dur: number; size: number }

export default function Particles() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    setParticles(Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 8,
      dur: 6 + Math.random() * 6,
      size: 2 + Math.random() * 4,
    })))
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {particles.map((p) => (
        <div key={p.id} style={{
          position: 'absolute',
          bottom: -20,
          left: `${p.x}%`,
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          background: 'var(--gold)',
          opacity: 0.5,
          animation: `float-up ${p.dur}s ${p.delay}s infinite ease-in`,
        }} />
      ))}
    </div>
  )
}
