import type { CryptoCardData } from '../types'
import CurrencyBadge from './CurrencyBadge'
import { formatCoinAmount } from '../utils/format'

function CardWaves() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 overflow-hidden">
      <svg
        className="absolute -bottom-2 left-0 w-[150%] animate-wave-drift"
        style={{ animationDuration: '10s' }}
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
      >
        <path d="M0,90 C150,150 300,30 600,100 L600,200 L0,200 Z" fill="rgba(255,255,255,0.08)" />
      </svg>
      <svg
        className="absolute -bottom-4 left-0 w-[170%] animate-wave-drift"
        style={{ animationDuration: '7s' }}
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
      >
        <path d="M0,120 C180,70 420,160 600,80 L600,200 L0,200 Z" fill="rgba(144,224,239,0.14)" />
      </svg>
      <svg
        className="absolute -bottom-6 left-0 w-[180%] animate-wave-drift"
        style={{ animationDuration: '13s' }}
        viewBox="0 0 600 200"
        preserveAspectRatio="none"
      >
        <path d="M0,70 C200,140 400,20 600,110 L600,200 L0,200 Z" fill="rgba(3,4,94,0.28)" />
      </svg>
    </div>
  )
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
        boxShadow: `0 28px 55px -18px ${card.glowColor}, 0 10px 26px -10px rgba(2,4,30,0.65)`,
      }}
    >
      {/* dot-grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1.5px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* geometric crosshatch (futuristic tech grid) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.7) 0px, rgba(255,255,255,0.7) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.7) 0px, rgba(255,255,255,0.7) 1px, transparent 1px, transparent 24px)',
        }}
      />

      {/* water-depth wave layers */}
      <CardWaves />

      {/* pearl / holographic diagonal sheen (blue family, not rainbow) */}
      <div
        className="pointer-events-none absolute -inset-y-10 -inset-x-6 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage:
            'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.55) 34%, rgba(144,224,239,0.6) 44%, rgba(72,202,228,0.5) 54%, transparent 70%)',
        }}
      />

      {/* glass sheen top */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 via-white/5 to-transparent opacity-40" />

      {/* contrast-protection vignette for legible text */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#020318]/45 to-transparent" />

      <div className="relative flex h-full flex-col justify-between text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/75">Баланс</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
              {formatCoinAmount(card.currency, card.balance)}{' '}
              <span className="text-lg font-semibold text-white/85">{card.currency}</span>
            </p>
          </div>
          <CurrencyBadge currency={card.currency} />
        </div>

        <div>
          <p className="whitespace-nowrap font-mono text-base tracking-[0.14em] text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] sm:text-lg">
            •••• •••• •••• {card.cardNumberLast4}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-wide text-white/90">{card.holderName}</p>
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">{card.label}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
