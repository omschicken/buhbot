export default function BackgroundDecor() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #1a1a2e 0%, #14162a 45%, #08080f 100%)',
      }}
    >
      <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-[90px]" />
      <div className="absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-[#8a7ff0]/20 blur-[100px]" />
      <div className="absolute -bottom-10 left-1/4 h-72 w-72 rounded-full bg-[#f7931a]/10 blur-[110px]" />
      <div className="absolute bottom-1/3 -right-10 h-56 w-56 rounded-full bg-accent/10 blur-[90px]" />

      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 0.7px, transparent 0.7px)',
          backgroundSize: '3px 3px',
        }}
      />
    </div>
  )
}
