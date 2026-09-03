import axios from 'axios'

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'https://api-gateaway-production-cd24.up.railway.app'}/api`,
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
