import { api } from './axios'
export const getKYCStatus = () => api.get('/kyc/status')
