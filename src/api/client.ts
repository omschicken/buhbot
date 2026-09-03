import axios from 'axios'

export const client = axios.create({ baseURL: 'http://localhost:3000/api', timeout: 10000 })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('casino_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('casino_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
