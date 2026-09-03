import { api } from './axios'
export const getBalance = () => api.get('/wallet/balance')
export const getTransactions = (page = 1) => api.get('/wallet/transactions', { params: { page, pageSize: 20 } })
export const withdraw = (amount: number, method: string, destination: string) => api.post('/wallet/withdraw', { amount, method, destination })
