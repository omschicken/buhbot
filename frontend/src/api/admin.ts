import { api } from './axios'

export const getAdminStats = () => api.get('/admin/stats')
export const getPlayers = (page = 1, search = '', status = '') =>
  api.get('/admin/players', { params: { page, search, status } })
export const getPlayer = (id: string) => api.get(`/admin/players/${id}`)
export const setPlayerStatus = (id: string, status: string) =>
  api.post(`/admin/players/${id}/status`, { status })
export const adjustBalance = (id: string, amount: number, type: string, reason: string) =>
  api.post(`/admin/players/${id}/balance`, { amount, type, reason })
export const addNote = (id: string, note: string) =>
  api.post(`/admin/players/${id}/note`, { note })

export const getWithdrawals = (status = '') => api.get('/admin/withdrawals', { params: { status } })
export const approveWithdrawal = (id: string, txHash?: string) => api.post(`/admin/withdrawals/${id}/approve`, txHash ? { txHash } : {})
export const rejectWithdrawal = (id: string, reason: string) =>
  api.post(`/admin/withdrawals/${id}/reject`, { reason })

export const getPendingKYC = () => api.get('/admin/kyc/pending')
export const reviewKYC = (userId: string, approved: boolean, level: number, reason?: string) =>
  api.post(`/admin/kyc/${userId}/review`, { approved, level, reason })

export const getAdminTransactions = (params: Record<string, string>) =>
  api.get('/admin/transactions', { params })

export const getAdminBonuses = () => api.get('/admin/bonuses')
export const createBonus = (data: Record<string, unknown>) => api.post('/admin/bonuses', data)
export const updateBonus = (id: string, data: Record<string, unknown>) => api.put(`/admin/bonuses/${id}`, data)
export const deleteBonus = (id: string) => api.delete(`/admin/bonuses/${id}`)

export const testDeposit = (id: string, amount: number, coin: string) =>
  api.post(`/admin/players/${id}/test-deposit`, { amount, coin })

export const seedAdmin = () => api.post('/admin/seed')
