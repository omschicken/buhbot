import type { Currency } from '../types'

export function formatCoinAmount(currency: Currency, amount: number) {
  if (currency === 'USDT') {
    return amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return amount.toString()
}

export function formatUsd(amount: number) {
  return `$${amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}`
}
