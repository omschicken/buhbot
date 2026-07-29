export type Currency = 'USDT' | 'BTC' | 'ETH'

export interface CryptoCardData {
  currency: Currency
  label: string
  balance: number
  cardNumberLast4: string
  holderName: string
  gradient: string
  glowColor: string
}

export type TransactionDirection = 'in' | 'out'
export type TransactionStatus = 'completed' | 'pending'

export interface Transaction {
  id: string
  direction: TransactionDirection
  currency: Currency
  amount: number
  date: string
  counterparty: string
  status: TransactionStatus
}

export type Tab = 'home' | 'cards' | 'bonuses' | 'settings'
export type SubScreen = 'deposit' | 'send' | 'history'
