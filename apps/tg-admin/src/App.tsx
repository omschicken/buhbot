import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import LoginPage from './pages/Login'
import Dashboard from './pages/Dashboard'
import Withdrawals from './pages/Withdrawals'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import KYC from './pages/KYC'

function TabBar() {
  const tabs = [
    { icon: '📊', label: 'Stats', to: '/' },
    { icon: '💸', label: 'Withdrawals', to: '/withdrawals' },
    { icon: '👥', label: 'Players', to: '/players' },
    { icon: '🔐', label: 'KYC', to: '/kyc' },
  ]
  return (
    <nav className="tab-bar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token'))

  useEffect(() => {
    const check = () => setToken(localStorage.getItem('admin_token'))
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [])

  if (!token) return <LoginPage onLogin={(t) => { localStorage.setItem('admin_token', t); setToken(t) }} />

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/withdrawals" element={<Withdrawals />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerDetail />} />
        <Route path="/kyc" element={<KYC />} />
      </Routes>
      <TabBar />
    </HashRouter>
  )
}
