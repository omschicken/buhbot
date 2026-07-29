import type { CryptoCardData, Transaction } from '../types'

export const cards: CryptoCardData[] = [
  {
    currency: 'USDT',
    label: 'Tether',
    balance: 12480.52,
    cardNumberLast4: '4832',
    holderName: 'ALEX MORGAN',
    gradient: 'from-[#00d4aa] via-[#00a884] to-[#0f766e]',
  },
  {
    currency: 'BTC',
    label: 'Bitcoin',
    balance: 0.2417,
    cardNumberLast4: '7719',
    holderName: 'ALEX MORGAN',
    gradient: 'from-[#f7931a] via-[#c9700e] to-[#7c3f05]',
  },
  {
    currency: 'ETH',
    label: 'Ethereum',
    balance: 3.842,
    cardNumberLast4: '2056',
    holderName: 'ALEX MORGAN',
    gradient: 'from-[#8a7ff0] via-[#627eea] to-[#3b4ba8]',
  },
]

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
