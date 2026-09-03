export default function RouletteBg() {
  return (
    <div style={{
      position: 'fixed', right: -100, top: '50%', transform: 'translateY(-50%)',
      zIndex: 0, opacity: 0.04, pointerEvents: 'none',
      animation: 'spin 60s linear infinite',
    }}>
      <svg width="500" height="500" viewBox="0 0 500 500">
        <circle cx="250" cy="250" r="240" stroke="#e4a832" strokeWidth="2" fill="none" />
        <circle cx="250" cy="250" r="180" stroke="#e4a832" strokeWidth="1.5" fill="none" />
        <circle cx="250" cy="250" r="120" stroke="#e4a832" strokeWidth="1" fill="none" />
        <circle cx="250" cy="250" r="40" stroke="#e4a832" strokeWidth="2" fill="none" />
        <circle cx="250" cy="250" r="15" fill="#e4a832" />
        {Array.from({ length: 37 }).map((_, i) => {
          const angle = (i / 37) * Math.PI * 2
          const x1 = 250 + Math.cos(angle) * 120
          const y1 = 250 + Math.sin(angle) * 120
          const x2 = 250 + Math.cos(angle) * 240
          const y2 = 250 + Math.sin(angle) * 240
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e4a832" strokeWidth="1" />
        })}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2
          const x1 = 250 + Math.cos(angle) * 40
          const y1 = 250 + Math.sin(angle) * 40
          const x2 = 250 + Math.cos(angle) * 120
          const y2 = 250 + Math.sin(angle) * 120
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e4a832" strokeWidth="1.5" />
        })}
      </svg>
    </div>
  )
}
