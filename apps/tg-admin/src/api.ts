import axios from 'axios'

const BASE = 'https://api-gateaway-production-cd24.up.railway.app/api'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use((c) => {
  const token = localStorage.getItem('admin_token')
  if (token) c.headers.Authorization = `Bearer ${token}`
  return c
})

api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.reload()
    }
    return Promise.reject(e)
  }
)

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password })

export const getAdminStats = () => api.get('/admin/stats')

export const getWithdrawals = (status = 'pending') =>
  api.get(`/admin/withdrawals?status=${status}`)

export const approveWithdrawal = (id: string, txHash?: string) =>
  api.post(`/admin/withdrawals/${id}/approve`, { txHash })

export const rejectWithdrawal = (id: string, reason: string) =>
  api.post(`/admin/withdrawals/${id}/reject`, { reason })

export const getPlayers = (search?: string) =>
  api.get('/admin/players', { params: { search } })

export const getPlayer = (id: string) =>
  api.get(`/admin/players/${id}`)

export const setPlayerStatus = (id: string, status: string) =>
  api.post(`/admin/players/${id}/status`, { status })

export const getKYCPending = () =>
  api.get('/admin/kyc/pending')

export const reviewKYC = (userId: string, action: string, level?: number) =>
  api.post(`/admin/kyc/${userId}/review`, { action, level })

export default api
