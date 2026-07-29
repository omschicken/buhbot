import type { CryptoCardData } from '../types'
import CurrencyBadge from './CurrencyBadge'

const formatBalance = (currency: CryptoCardData['currency'], balance: number) => {
  if (currency === 'USDT') {
    return balance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return balance.toString()
}

interface Props {
  card: CryptoCardData
  className?: string
}

export default function CryptoCard({ card, className = '' }: Props) {
  return (
    <div
      className={`relative aspect-[1.6/1] w-full shrink-0 select-none overflow-hidden rounded-[28px] p-6 transition-transform duration-200 ease-out active:scale-[0.97] active:-rotate-1 ${className}`}
      style={{
        backgroundImage: card.gradient,
        boxShadow: `0 28px 55px -18px ${card.glowColor}, 0 10px 26px -10px rgba(0,0,0,0.55)`,
      }}
    >
      {/* dot-grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1.5px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* thin geometric lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 22px)',
        }}
      />

      {/* holographic diagonal sheen */}
      <div
        className="pointer-events-none absolute -inset-y-10 -inset-x-6 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            'linear-gradient(115deg, transparent 15%, #ff6ec7 30%, #ffd76e 40%, #6effe0 50%, #7e6bff 60%, transparent 75%)',
        }}
      />

      {/* glass sheen top */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/30 via-white/5 to-transparent opacity-40" />

      {/* glass depth panel bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-black/10 backdrop-blur-[1px]" />

      <div className="relative flex h-full flex-col justify-between text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">Баланс</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight drop-shadow-sm">
              {formatBalance(card.currency, card.balance)}{' '}
              <span className="text-lg font-semibold text-white/80">{card.currency}</span>
            </p>
          </div>
          <CurrencyBadge currency={card.currency} />
        </div>

        <div>
          <p className="whitespace-nowrap font-mono text-base tracking-[0.14em] text-white/90 sm:text-lg">
            •••• •••• •••• {card.cardNumberLast4}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-wide text-white/85">{card.holderName}</p>
            <p className="text-xs font-medium uppercase tracking-wider text-white/60">{card.label}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
