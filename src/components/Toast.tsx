export default function Toast({ message }: { message: string | null }) {
  if (!message) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-50 max-w-[90%] -translate-x-1/2 animate-toast-in rounded-2xl bg-accent px-5 py-3 text-center text-sm font-semibold text-[#0b3b32] shadow-lg">
      {message}
    </div>
  )
}
