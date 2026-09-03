import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ui/ProtectedRoute'
import Cursor from './effects/Cursor'
import Particles from './effects/Particles'
import RouletteBg from './effects/RouletteBg'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Game from './pages/Game'
import Wallet from './pages/Wallet'
import Profile from './pages/Profile'
import Bonuses from './pages/Bonuses'
import Affiliate from './pages/Affiliate'
import './styles/globals.css'
import './styles/animations.css'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } } })

function WinnersTicker() {
  const parts = [
    { text: '🏆 Alex won ' }, { gold: '$4,200' }, { text: ' · Gates of Olympus · Maria won ' }, { gold: '$890' },
    { text: ' · Sweet Bonanza · Ivan won ' }, { gold: '$12,400' }, { text: ' · Crazy Time · Sophia won ' },
    { gold: '$2,100' }, { text: ' · Lightning Roulette · Carlos won ' }, { gold: '$780' }, { text: ' · Dog House · ' },
  ]
  const inner = (
    <span>
      {parts.map((p, i) =>
        'gold' in p
          ? <span key={i} style={{ color: '#e4a832' }}>{p.gold}</span>
          : <span key={i} style={{ color: '#555' }}>{p.text}</span>
      )}
    </span>
  )
  return (
    <div style={{ background: '#1a1a1a', borderBottom: '1px solid #222', height: 30, overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', animation: 'marquee 25s linear infinite', whiteSpace: 'nowrap', height: '100%', alignItems: 'center' }}>
        <span style={{ fontSize: 11, paddingRight: 40 }}>{inner}</span>
        <span style={{ fontSize: 11, paddingRight: 40 }}>{inner}</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Cursor />
        <Particles />
        <RouletteBg />
        <Routes>
          <Route element={<><WinnersTicker /><Layout /></>}>
            <Route path="/" element={<Home />} />
            <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/bonuses" element={<ProtectedRoute><Bonuses /></ProtectedRoute>} />
            <Route path="/affiliate" element={<ProtectedRoute><Affiliate /></ProtectedRoute>} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/game/:id" element={<ProtectedRoute><Game /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
