import { Plus } from 'lucide-react'
import { cards, usdRates } from '../data/mockData'
import CryptoCard from '../components/CryptoCard'
import { formatUsd } from '../utils/format'
import type { Currency } from '../types'

interface Props {
  onSelect: (index: number) => void
  onOpenDetail: () => void
}

const GROUPS: { title: string; currencies: Currency[] }[] = [
  { title: 'Стейблкоины', currencies: ['USDT'] },
  { title: 'Криптовалюты', currencies: ['BTC', 'ETH'] },
]

export default function CardsListScreen({ onSelect, onOpenDetail }: Props) {
  const total = cards.reduce((sum, c) => sum + c.balance * usdRates[c.currency], 0)

  return (
    <div className="px-4 pb-28 pt-6">
      <div className="mb-2 flex animate-fade-in items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Портфель</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{formatUsd(total)}</h1>
        </div>
        <button
          aria-label="Добавить карту"
          className="glass flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-transform active:scale-90"
        >
          <Plus size={18} />
        </button>
      </div>

      {GROUPS.map((group) => {
        const groupCards = cards
          .map((card, index) => ({ card, index }))
          .filter(({ card }) => group.currencies.includes(card.currency))

        if (groupCards.length === 0) return null

        return (
          <div key={group.title} className="mt-6">
            <p className="mb-3 animate-fade-in text-sm font-semibold uppercase tracking-wide text-white/50">
              {group.title}
            </p>
            <div className="flex flex-col gap-5">
              {groupCards.map(({ card, index }, i) => (
                <button
                  key={card.currency}
                  onClick={() => {
                    onSelect(index)
                    onOpenDetail()
                  }}
                  style={{ animationDelay: `${i * 90}ms` }}
                  className="animate-fade-in text-left"
                >
                  <CryptoCard card={card} flat />
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
