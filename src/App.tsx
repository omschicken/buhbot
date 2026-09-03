import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import LobbyPage from './pages/LobbyPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import GamePage from './pages/GamePage'
import WalletPage from './pages/WalletPage'
import ProfilePage from './pages/ProfilePage'
import BonusesPage from './pages/BonusesPage'
import AffiliatePage from './pages/AffiliatePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/bonuses" element={
              <ProtectedRoute><BonusesPage /></ProtectedRoute>
            } />
            <Route path="/affiliate" element={
              <ProtectedRoute><AffiliatePage /></ProtectedRoute>
            } />
            <Route path="/wallet" element={
              <ProtectedRoute><WalletPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/game/:id" element={
            <ProtectedRoute><GamePage /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
