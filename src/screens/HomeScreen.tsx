import { Eye, EyeOff, Gift } from 'lucide-react'
import { cards, usdRates } from '../data/mockData'
import CardRow from '../components/CardRow'
import ActionButtons from '../components/ActionButtons'
import { formatUsd } from '../utils/format'

interface Props {
  activeIndex: number
  onChangeIndex: (index: number) => void
  balanceHidden: boolean
  onToggleBalance: () => void
  onDeposit: () => void
  onSend: () => void
  onHistory: () => void
  onViewAllCards: () => void
  onOpenBonuses: () => void
}

export default function HomeScreen({
  activeIndex,
  onChangeIndex,
  balanceHidden,
  onToggleBalance,
  onDeposit,
  onSend,
  onHistory,
  onViewAllCards,
  onOpenBonuses,
}: Props) {
  const total = cards.reduce((sum, c) => sum + c.balance * usdRates[c.currency], 0)

  return (
    <div className="px-4 pb-28 pt-6">
      <div className="mb-5 flex animate-fade-in items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Мои карты</p>
          <h1 className="text-2xl font-bold">Crypto Wallet</h1>
        </div>
        <button
          onClick={onOpenBonuses}
          aria-label="Бонусы"
          className="glass relative flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-transform active:scale-90"
        >
          <Gift size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-400" />
        </button>
      </div>

      <div className="glass mb-5 animate-fade-in rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/60">Доступно на картах</p>
          <button
            onClick={onToggleBalance}
            aria-label={balanceHidden ? 'Показать баланс' : 'Скрыть баланс'}
            className="text-white/50 transition-transform active:scale-90"
          >
            {balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="mt-1 text-3xl font-extrabold tracking-tight">{balanceHidden ? '•••••' : formatUsd(total)}</p>
        <button onClick={onViewAllCards} className="mt-2 text-sm font-semibold text-accent">
          Все карты →
        </button>
      </div>

      <ActionButtons onDeposit={onDeposit} onSend={onSend} onHistory={onHistory} />

      <div className="mt-6 flex flex-col gap-2.5">
        {cards.map((card, i) => (
          <div key={card.currency} style={{ animationDelay: `${i * 70}ms` }} className="animate-fade-in">
            <CardRow card={card} active={i === activeIndex} hidden={balanceHidden} onClick={() => onChangeIndex(i)} />
          </div>
        ))}
      </div>
    </div>
  )
}
