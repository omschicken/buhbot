import { useState } from 'react'
import type { Currency } from '../types'
import { hapticSelection, hapticSuccess } from '../hooks/useTelegram'

const CURRENCIES: Currency[] = ['USDT', 'BTC', 'ETH']
const QUICK_AMOUNTS = [50, 100, 500]

interface Props {
  initialCurrency: Currency
  onDeposited: () => void
}

export default function DepositScreen({ initialCurrency, onDeposited }: Props) {
  const [currency, setCurrency] = useState<Currency>(initialCurrency)
  const [amount, setAmount] = useState('')

  const canSubmit = Number(amount) > 0

  return (
    <div className="px-4 pb-8 pt-6">
      <h1 className="mb-6 text-2xl font-bold">Пополнить</h1>

      <p className="mb-2 text-sm font-medium text-white/60">Валюта</p>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {CURRENCIES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCurrency(c)
              hapticSelection()
            }}
            className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              currency === c ? 'bg-accent text-[#0b3b32]' : 'bg-surface text-white/70'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="mb-2 text-sm font-medium text-white/60">Сумма, $</p>
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0.00"
        className="mb-4 w-full rounded-2xl bg-surface px-4 py-3.5 text-lg font-semibold text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-accent"
      />

      <div className="mb-8 grid grid-cols-3 gap-2">
        {QUICK_AMOUNTS.map((q) => (
          <button
            key={q}
            onClick={() => {
              setAmount(String(q))
              hapticSelection()
            }}
            className="rounded-xl bg-surface py-2 text-sm font-medium text-white/70 active:scale-95 transition-transform"
          >
            ${q}
          </button>
        ))}
      </div>

      <button
        disabled={!canSubmit}
        onClick={() => {
          hapticSuccess()
          onDeposited()
        }}
        className="w-full rounded-2xl bg-accent py-3.5 text-base font-bold text-[#0b3b32] disabled:opacity-40 active:scale-[0.98] transition-transform"
      >
        Пополнить
      </button>
    </div>
  )
}
