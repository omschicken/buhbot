import axios from 'axios'

const _base = (import.meta.env.VITE_API_URL || 'https://api-gateaway-production-cd24.up.railway.app').replace(/\/api\/?$/, '')

export const api = axios.create({
  baseURL: `${_base}/api`,
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('casino_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('casino_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
