import type { ReactNode } from 'react'
import { Bitcoin } from 'lucide-react'
import type { Currency } from '../types'

function EthGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2 L19 12.2 L12 16.2 L5 12.2 Z" fill="currentColor" opacity="0.95" />
      <path d="M12 17.4 L19 13.4 L12 22 L5 13.4 Z" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

function UsdtGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 5.5h15M12 5.5v6.2M7.5 15h9M12 11.7v9" />
    </svg>
  )
}

const ICONS: Record<Currency, ReactNode> = {
  BTC: <Bitcoin size={17} strokeWidth={2.2} />,
  ETH: <EthGlyph />,
  USDT: <UsdtGlyph />,
}

interface Props {
  currency: Currency
  size?: 'sm' | 'md'
}

export default function CurrencyBadge({ currency, size = 'md' }: Props) {
  const dimension = size === 'md' ? 'h-10 w-10' : 'h-8 w-8'
  return (
    <div className={`flex ${dimension} items-center justify-center rounded-full border border-white/40 bg-white/15 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] backdrop-blur`}>
      {ICONS[currency]}
    </div>
  )
}
