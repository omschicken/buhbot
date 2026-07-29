import { useState } from 'react'
import type { Currency } from '../types'
import { hapticSuccess } from '../hooks/useTelegram'

interface Props {
  currency: Currency
  onSent: () => void
}

export default function SendScreen({ currency, onSent }: Props) {
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')

  const canSubmit = address.trim().length > 0 && Number(amount) > 0

  return (
    <div className="px-4 pb-8 pt-6">
      <h1 className="mb-1 text-2xl font-bold">Отправить</h1>
      <p className="mb-6 text-sm text-white/50">Перевод в {currency}</p>

      <p className="mb-2 text-sm font-medium text-white/60">Адрес кошелька</p>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={`${currency} адрес получателя`}
        className="mb-4 w-full rounded-2xl bg-surface px-4 py-3.5 text-sm font-medium text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-accent"
      />

      <p className="mb-2 text-sm font-medium text-white/60">Сумма, {currency}</p>
      <input
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0.00"
        className="mb-8 w-full rounded-2xl bg-surface px-4 py-3.5 text-lg font-semibold text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-accent"
      />

      <button
        disabled={!canSubmit}
        onClick={() => {
          hapticSuccess()
          onSent()
        }}
        className="w-full rounded-2xl bg-accent py-3.5 text-base font-bold text-[#0b3b32] disabled:opacity-40 active:scale-[0.98] transition-transform"
      >
        Подтвердить отправку
      </button>
    </div>
  )
}
