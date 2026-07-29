export default function Toast({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <div className="glass fixed bottom-24 left-1/2 z-50 max-w-[90%] -translate-x-1/2 animate-toast-in rounded-2xl bg-accent/95 px-5 py-3 text-center text-sm font-semibold text-[#03045e] shadow-[0_10px_40px_-8px_rgba(72,202,228,0.6)]">
      {message}
    </div>
  )
}
