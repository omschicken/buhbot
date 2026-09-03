import client from './client'

export const getGames = (category?: string) =>
  client.get('/games', { params: { category } })

export const getGame = (id: string) => client.get(`/games/${id}`)

export const launchGame = (id: string) => client.post(`/games/${id}/launch`)
