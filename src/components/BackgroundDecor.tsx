// Coordinates/sizes are in a fixed 400x900 reference frame (see viewBox below),
// rendered with preserveAspectRatio="slice" so diamonds stay true squares
// (rotated 45deg) instead of stretching with the viewport.
const DIAMONDS = [
  { x: 40, y: 40, size: 110, opacity: 0.07 },
  { x: 300, y: 20, size: 70, opacity: 0.06 },
  { x: 360, y: 120, size: 150, opacity: 0.05 },
  { x: 20, y: 160, size: 65, opacity: 0.08 },
  { x: 180, y: 90, size: 50, opacity: 0.06 },
  { x: 120, y: 230, size: 120, opacity: 0.05 },
  { x: 340, y: 280, size: 85, opacity: 0.07 },
  { x: 60, y: 340, size: 140, opacity: 0.04 },
  { x: 240, y: 330, size: 55, opacity: 0.08 },
  { x: 380, y: 420, size: 100, opacity: 0.06 },
  { x: 140, y: 440, size: 75, opacity: 0.07 },
  { x: 15, y: 520, size: 115, opacity: 0.05 },
  { x: 280, y: 500, size: 130, opacity: 0.05 },
  { x: 200, y: 590, size: 55, opacity: 0.08 },
  { x: 350, y: 620, size: 90, opacity: 0.06 },
  { x: 80, y: 660, size: 150, opacity: 0.04 },
  { x: 250, y: 720, size: 70, opacity: 0.07 },
  { x: 30, y: 780, size: 100, opacity: 0.05 },
  { x: 330, y: 800, size: 60, opacity: 0.08 },
  { x: 150, y: 840, size: 130, opacity: 0.04 },
]

export default function BackgroundDecor() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #132743 0%, #1b3355 100%)',
      }}
    >
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />
      <div className="absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-ocean-mid/10 blur-[110px]" />
      <div className="absolute -bottom-10 left-1/4 h-72 w-72 rounded-full bg-ocean-abyss/20 blur-[120px]" />
      <div className="absolute bottom-1/3 -right-10 h-56 w-56 rounded-full bg-accent/5 blur-[100px]" />

      {/* scattered geometric diamonds, varied sizes, low opacity */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 900">
        {DIAMONDS.map((d, i) => (
          <rect
            key={i}
            x={d.x - d.size / 2}
            y={d.y - d.size / 2}
            width={d.size}
            height={d.size}
            fill="rgba(200, 235, 248, 1)"
            opacity={d.opacity}
            transform={`rotate(45 ${d.x} ${d.y})`}
          />
        ))}
      </svg>

      {/* ocean wave silhouettes drifting near the bottom */}
      <svg
        className="absolute -bottom-4 left-0 w-[140%] animate-wave-drift opacity-[0.10]"
        style={{ animationDuration: '16s' }}
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
      >
        <path d="M0,110 C200,50 500,170 800,90 L800,200 L0,200 Z" fill="#a8e8f3" />
      </svg>
      <svg
        className="absolute -bottom-8 left-0 w-[160%] animate-wave-drift opacity-[0.08]"
        style={{ animationDuration: '22s' }}
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
      >
        <path d="M0,140 C250,80 450,190 800,120 L800,200 L0,200 Z" fill="#5ed4ec" />
      </svg>
    </div>
  )
}
