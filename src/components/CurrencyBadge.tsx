import type { Currency } from '../types'

const BADGE: Record<Currency, { glyph: string; gradient: string; shadow: string }> = {
  USDT: {
    glyph: '₮',
    gradient: 'linear-gradient(135deg, rgba(45,212,191,0.85), rgba(13,148,136,0.85))',
    shadow: 'rgba(45, 212, 191, 0.45)',
  },
  BTC: {
    glyph: '₿',
    gradient: 'linear-gradient(135deg, rgba(251,191,36,0.85), rgba(217,119,6,0.85))',
    shadow: 'rgba(251, 191, 36, 0.4)',
  },
  ETH: {
    glyph: 'Ξ',
    gradient: 'linear-gradient(135deg, rgba(203,213,225,0.85), rgba(139,127,240,0.85))',
    shadow: 'rgba(167, 139, 250, 0.4)',
  },
}

interface Props {
  currency: Currency
  size?: 'sm' | 'md'
}

export default function CurrencyBadge({ currency, size = 'md' }: Props) {
  const style = BADGE[currency]
  const dimension = size === 'md' ? 'h-11 w-11 text-lg' : 'h-8 w-8 text-sm'

  return (
    <div
      className={`relative flex ${dimension} items-center justify-center rounded-full border border-white/50 font-bold text-white backdrop-blur-md`}
      style={{
        backgroundImage: style.gradient,
        boxShadow: `0 4px 14px -2px ${style.shadow}, inset 0 1px 1px rgba(255,255,255,0.6)`,
      }}
    >
      <span className="pointer-events-none absolute inset-[3px] rounded-full border border-white/30" />
      <span className="relative drop-shadow-sm">{style.glyph}</span>
    </div>
  )
}
