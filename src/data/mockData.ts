import type { CryptoCardData, Transaction } from '../types'

export const cards: CryptoCardData[] = [
  {
    currency: 'USDT',
    label: 'Tether',
    balance: 12480.52,
    cardNumberLast4: '4832',
    holderName: 'ALEX MORGAN',
    gradient:
      'linear-gradient(135deg, #2dffc9 0%, #00d4aa 32%, #049e7c 68%, #073f34 100%)',
    glowColor: 'rgba(0, 212, 170, 0.45)',
  },
  {
    currency: 'BTC',
    label: 'Bitcoin',
    balance: 0.2417,
    cardNumberLast4: '7719',
    holderName: 'ALEX MORGAN',
    gradient:
      'linear-gradient(135deg, #ffc266 0%, #f7931a 32%, #c9700e 68%, #522c04 100%)',
    glowColor: 'rgba(247, 147, 26, 0.45)',
  },
  {
    currency: 'ETH',
    label: 'Ethereum',
    balance: 3.842,
    cardNumberLast4: '2056',
    holderName: 'ALEX MORGAN',
    gradient:
      'linear-gradient(135deg, #beb3ff 0%, #8a7ff0 32%, #627eea 68%, #262c72 100%)',
    glowColor: 'rgba(98, 126, 234, 0.45)',
  },
]

export const usdRates: Record<CryptoCardData['currency'], number> = {
  USDT: 1,
  BTC: 65000,
  ETH: 3400,
}

export const transactions: Transaction[] = [
  { id: 't1', direction: 'in', currency: 'USDT', amount: 500, date: '28 июля, 14:32', counterparty: 'Binance', status: 'completed' },
  { id: 't2', direction: 'out', currency: 'BTC', amount: 0.015, date: '27 июля, 09:10', counterparty: 'bc1q...k9pl', status: 'completed' },
  { id: 't3', direction: 'out', currency: 'USDT', amount: 120, date: '26 июля, 21:05', counterparty: 'TQn9...8fRz', status: 'pending' },
  { id: 't4', direction: 'in', currency: 'ETH', amount: 1.2, date: '25 июля, 18:47', counterparty: 'Coinbase', status: 'completed' },
  { id: 't5', direction: 'in', currency: 'USDT', amount: 1000, date: '24 июля, 11:23', counterparty: 'Kraken', status: 'completed' },
  { id: 't6', direction: 'out', currency: 'ETH', amount: 0.45, date: '22 июля, 16:02', counterparty: '0x8f2...C4a1', status: 'completed' },
  { id: 't7', direction: 'out', currency: 'BTC', amount: 0.008, date: '20 июля, 08:55', counterparty: 'bc1p...m2vx', status: 'pending' },
  { id: 't8', direction: 'in', currency: 'BTC', amount: 0.05, date: '18 июля, 13:40', counterparty: 'Bybit', status: 'completed' },
  { id: 't9', direction: 'out', currency: 'USDT', amount: 75.5, date: '16 июля, 20:18', counterparty: 'TXa1...9kLp', status: 'completed' },
  { id: 't10', direction: 'in', currency: 'ETH', amount: 0.9, date: '14 июля, 10:02', counterparty: 'OKX', status: 'completed' },
]
