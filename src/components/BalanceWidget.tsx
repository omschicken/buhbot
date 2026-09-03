import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function BalanceWidget() {
  const balance = useAuthStore((s) => s.balance)
  const prevBalance = useRef(balance)

  useEffect(() => {
    prevBalance.current = balance
  }, [balance])

  const changed = prevBalance.current !== balance

  return (
    <Link
      to="/wallet"
      className={`flex items-center gap-1.5 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-full px-3 py-1.5 text-[#00ff88] font-bold text-sm transition-all hover:bg-[#00ff88]/20 ${changed ? 'animate-pulse' : ''}`}
    >
      <span>$</span>
      <span>{balance.toFixed(2)}</span>
    </Link>
  )
}
