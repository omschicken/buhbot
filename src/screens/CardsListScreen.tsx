import { cards, usdRates } from '../data/mockData'
import CryptoCard from '../components/CryptoCard'

interface Props {
  onSelect: (index: number) => void
  onNavigateHome: () => void
}

export default function CardsListScreen({ onSelect, onNavigateHome }: Props) {
  const total = cards.reduce((sum, c) => sum + c.balance * usdRates[c.currency], 0)

  return (
    <div className="px-4 pb-28 pt-6">
      <div className="mb-6 animate-fade-in">
        <p className="text-sm text-white/50">Портфель</p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          ${total.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
        </h1>
      </div>

      <div className="flex flex-col gap-5">
        {cards.map((card, i) => (
          <button
            key={card.currency}
            onClick={() => {
              onSelect(i)
              onNavigateHome()
            }}
            style={{ animationDelay: `${i * 90}ms` }}
            className="animate-fade-in text-left"
          >
            <CryptoCard card={card} />
          </button>
        ))}
      </div>
    </div>
  )
}
