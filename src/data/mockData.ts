export const mockGames = [
  { id: '1', name: 'Book of Ra', provider: 'Novomatic', category: 'slots', rtp: 96.1, hot: true },
  { id: '2', name: 'Starburst', provider: 'NetEnt', category: 'slots', rtp: 96.1, isNew: true },
  { id: '3', name: 'Blackjack Pro', provider: 'Evolution', category: 'table', rtp: 99.5, hot: true },
  { id: '4', name: 'Roulette Live', provider: 'Evolution', category: 'live', rtp: 97.3 },
  { id: '5', name: 'Sweet Bonanza', provider: 'Pragmatic', category: 'slots', rtp: 96.5, hot: true },
  { id: '6', name: 'Gates of Olympus', provider: 'Pragmatic', category: 'slots', rtp: 96.5, isNew: true },
  { id: '7', name: 'Crazy Time', provider: 'Evolution', category: 'live', rtp: 96.1, hot: true },
  { id: '8', name: 'Texas Holdem', provider: 'Playtech', category: 'table', rtp: 98.6 },
  { id: '9', name: 'Wolf Gold', provider: 'Pragmatic', category: 'slots', rtp: 96.0 },
  { id: '10', name: 'Lightning Roulette', provider: 'Evolution', category: 'live', rtp: 97.3, isNew: true },
  { id: '11', name: 'Baccarat', provider: 'Ezugi', category: 'table', rtp: 98.9 },
  { id: '12', name: 'Fruit Party', provider: 'Pragmatic', category: 'slots', rtp: 96.5 },
  { id: '13', name: 'Big Bass Bonanza', provider: 'Pragmatic', category: 'slots', rtp: 96.7 },
  { id: '14', name: 'Monopoly Live', provider: 'Evolution', category: 'live', rtp: 96.2 },
  { id: '15', name: 'Dragon Tiger', provider: 'Ezugi', category: 'table', rtp: 96.8 },
  { id: '16', name: 'Razor Shark', provider: 'Push Gaming', category: 'slots', rtp: 96.7, isNew: true },
]

export const mockWinners = [
  { user: 'cry***789', game: 'Gates of Olympus', amount: 12480.50, multiplier: 248 },
  { user: 'sta***123', game: 'Crazy Time', amount: 8920.00, multiplier: 89 },
  { user: 'neo***456', game: 'Sweet Bonanza', amount: 4230.75, multiplier: 142 },
  { user: 'vip***001', game: 'Lightning Roulette', amount: 22100.00, multiplier: 442 },
  { user: 'pro***777', game: 'Book of Ra', amount: 3150.25, multiplier: 63 },
  { user: 'ace***888', game: 'Blackjack Pro', amount: 5600.00, multiplier: 56 },
  { user: 'bet***321', game: 'Monopoly Live', amount: 9870.50, multiplier: 197 },
  { user: 'win***555', game: 'Starburst', amount: 2340.00, multiplier: 117 },
]

export const mockProviders = ['Evolution', 'Pragmatic Play', 'NetEnt', 'Playtech', 'Microgaming', 'Ezugi', 'Push Gaming', 'Novomatic']

export const mockTransactions = [
  { id: '1', type: 'deposit', amount: 500, currency: 'USDT', status: 'completed', createdAt: '2024-01-15T10:30:00Z', txHash: '0x1a2b3c...' },
  { id: '2', type: 'bet', amount: -50, currency: 'USDT', status: 'completed', createdAt: '2024-01-15T11:00:00Z', game: 'Crazy Time' },
  { id: '3', type: 'win', amount: 340, currency: 'USDT', status: 'completed', createdAt: '2024-01-15T11:05:00Z', game: 'Crazy Time' },
  { id: '4', type: 'bet', amount: -100, currency: 'USDT', status: 'completed', createdAt: '2024-01-15T12:00:00Z', game: 'Blackjack Pro' },
  { id: '5', type: 'withdrawal', amount: -200, currency: 'USDT', status: 'pending', createdAt: '2024-01-14T09:00:00Z', txHash: '0x4d5e6f...' },
  { id: '6', type: 'bonus', amount: 100, currency: 'USDT', status: 'completed', createdAt: '2024-01-13T08:00:00Z' },
]

export const mockBalanceHistory = [
  { day: 'Mon', balance: 800 }, { day: 'Tue', balance: 1200 }, { day: 'Wed', balance: 950 },
  { day: 'Thu', balance: 1500 }, { day: 'Fri', balance: 1100 }, { day: 'Sat', balance: 1800 }, { day: 'Sun', balance: 1337 },
]

export const mockBonuses = [
  { id: '1', type: 'welcome', label: 'Welcome Bonus', amount: 500, currency: 'USDT', wagering: 30, wagerDone: 6500, wagerTotal: 15000, expiresAt: '2024-02-15', color: '#00ff88' },
  { id: '2', type: 'freespin', label: 'Free Spins', amount: 50, currency: 'FS', wagering: 40, wagerDone: 2100, wagerTotal: 5000, expiresAt: '2024-01-28', color: '#7c3aed' },
  { id: '3', type: 'reload', label: 'Reload Bonus', amount: 200, currency: 'USDT', wagering: 25, wagerDone: 0, wagerTotal: 5000, expiresAt: '2024-01-22', color: '#0ea5e9' },
]
