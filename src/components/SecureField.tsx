import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { hapticSelection } from '../hooks/useTelegram'

const AUTO_HIDE_MS = 7000

interface Props {
  label: string
  maskedValue: string
  realValue: string
}

export default function SecureField({ label, maskedValue, realValue }: Props) {
  const [revealed, setRevealed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const toggle = () => {
    hapticSelection()
    if (timerRef.current) clearTimeout(timerRef.current)

    setRevealed((current) => {
      const next = !current
      if (next) {
        timerRef.current = setTimeout(() => setRevealed(false), AUTO_HIDE_MS)
      }
      return next
    })
  }

  return (
    <div className="glass flex items-center justify-between rounded-2xl px-4 py-3.5">
      <div>
        <p className="text-xs text-white/50">{label}</p>
        <p key={revealed ? 'on' : 'off'} className="mt-0.5 animate-reveal font-mono text-base font-semibold tracking-[0.1em] text-white">
          {revealed ? realValue : maskedValue}
        </p>
      </div>
      <button
        onClick={toggle}
        aria-label={revealed ? `Скрыть: ${label}` : `Показать: ${label}`}
        className="glass flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-transform active:scale-90"
      >
        {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
