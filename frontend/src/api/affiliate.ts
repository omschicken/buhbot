import { api } from './axios'
export const getAffiliateDashboard = () => api.get('/affiliate/dashboard')
