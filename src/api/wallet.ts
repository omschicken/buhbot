import { client } from './client'
export const getWallet = () => client.get('/wallet')
export const getTransactions = () => client.get('/wallet/transactions')
export const withdraw = (amount: number, address: string) => client.post('/wallet/withdraw', { amount, address })
