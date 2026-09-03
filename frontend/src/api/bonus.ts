import { api } from './axios'
export const getBonuses = () => api.get('/bonus/bonuses/my')
export const getVIP = () => api.get('/bonus/vip')
