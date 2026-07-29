import type { CryptoCardData } from '../types'

const formatBalance = (currency: CryptoCardData['currency'], balance: number) => {
  if (currency === 'USDT') {
    return balance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return balance.toString()
}

export default function CryptoCard({ card }: { card: CryptoCardData }) {
  return (
    <div
      className={`relative aspect-[1.6/1] w-full shrink-0 rounded-3xl bg-gradient-to-br ${card.gradient} p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] overflow-hidden select-none`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-black/10 blur-2xl" />

      <div className="relative flex h-full flex-col justify-between text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/70">Баланс</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {formatBalance(card.currency, card.balance)}{' '}
              <span className="text-base font-semibold text-white/80">{card.currency}</span>
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold backdrop-blur">
            {card.currency}
          </div>
        </div>

        <div>
          <p className="font-mono text-lg tracking-[0.2em] text-white/90">
            •••• •••• •••• {card.cardNumberLast4}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-medium tracking-wide text-white/80">{card.holderName}</p>
            <p className="text-xs font-medium text-white/60">{card.label}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
