import { api } from './axios'
export const getAffiliateDashboard = () => api.get('/affiliate/dashboard')
export const savePayoutSettings = (coin: string, address: string, minPayout: number) =>
  api.post('/affiliate/payout-settings', { coin, address, minPayout })
