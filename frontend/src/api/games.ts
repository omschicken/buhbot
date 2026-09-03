import { api } from './axios'
export const getGames = (category?: string) => api.get('/games', { params: { category } })
export const launchGame = (id: string) => api.post(`/games/${id}/launch`)
