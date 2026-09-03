import client from './client'

export const getBonuses = () => client.get('/bonuses')
