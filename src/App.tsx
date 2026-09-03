import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import CustomCursor from './components/CustomCursor'
import KonamiScreen from './components/KonamiScreen'
import { useKonamiCode } from './hooks/useKonamiCode'

import LobbyPage from './pages/LobbyPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GamePage from './pages/GamePage'
import WalletPage from './pages/WalletPage'
import ProfilePage from './pages/ProfilePage'
import BonusesPage from './pages/BonusesPage'
import AffiliatePage from './pages/AffiliatePage'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } })

function AppInner() {
  const [konami, setKonami] = useState(false)
  useKonamiCode(() => setKonami(true))

  return (
    <>
      <CustomCursor />
      <KonamiScreen open={konami} onClose={() => setKonami(false)} />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/bonuses" element={<ProtectedRoute><BonusesPage /></ProtectedRoute>} />
          <Route path="/affiliate" element={<ProtectedRoute><AffiliatePage /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/game/:id" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
