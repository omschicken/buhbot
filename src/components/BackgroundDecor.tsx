export default function BackgroundDecor() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0a1628 0%, #0f3460 55%, #16537e 100%)',
      }}
    >
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-[90px]" />
      <div className="absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-ocean-mid/25 blur-[100px]" />
      <div className="absolute -bottom-10 left-1/4 h-72 w-72 rounded-full bg-ocean-abyss/40 blur-[110px]" />
      <div className="absolute bottom-1/3 -right-10 h-56 w-56 rounded-full bg-accent/10 blur-[90px]" />

      {/* geometric tech grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(144,224,239,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(144,224,239,0.8) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />

      {/* fine particles */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 0.7px, transparent 0.7px)',
          backgroundSize: '3px 3px',
        }}
      />

      {/* ocean wave silhouettes drifting near the bottom */}
      <svg
        className="absolute -bottom-4 left-0 w-[140%] animate-wave-drift opacity-[0.10]"
        style={{ animationDuration: '16s' }}
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
      >
        <path d="M0,110 C200,50 500,170 800,90 L800,200 L0,200 Z" fill="#90e0ef" />
      </svg>
      <svg
        className="absolute -bottom-8 left-0 w-[160%] animate-wave-drift opacity-[0.08]"
        style={{ animationDuration: '22s' }}
        viewBox="0 0 800 200"
        preserveAspectRatio="none"
      >
        <path d="M0,140 C250,80 450,190 800,120 L800,200 L0,200 Z" fill="#48cae4" />
      </svg>
    </div>
  )
}
