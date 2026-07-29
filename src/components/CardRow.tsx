import { ChevronRight } from 'lucide-react'
import type { CryptoCardData } from '../types'
import CurrencyBadge from './CurrencyBadge'
import { formatCoinAmount } from '../utils/format'

interface Props {
  card: CryptoCardData
  active?: boolean
  hidden?: boolean
  onClick?: () => void
}

export default function CardRow({ card, active = false, hidden = false, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`glass flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-transform active:scale-[0.98] ${
        active ? 'shadow-[0_0_0_1px_rgba(94,212,236,0.45),0_8px_24px_-10px_rgba(94,212,236,0.5)]' : ''
      }`}
    >
      <CurrencyBadge currency={card.currency} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{card.label}</p>
        <p className="text-xs text-white/50">•• {card.cardNumberLast4}</p>
      </div>
      <p className="text-sm font-bold text-white">
        {hidden ? '•••••' : `${formatCoinAmount(card.currency, card.balance)} ${card.currency}`}
      </p>
      <ChevronRight size={16} className="text-white/30" />
    </button>
  )
}
