import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import BalanceWidget from './BalanceWidget'

export default function Header() {
  const { token, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f3460] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-white flex items-center gap-2">
          🎰 <span className="text-[#00ff88]">CasinoPro</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-gray-300 hover:text-[#00ff88] transition-colors font-medium">
            Lobby
          </Link>
          <Link to="/bonuses" className="text-gray-300 hover:text-[#00ff88] transition-colors font-medium">
            Bonuses
          </Link>
          <Link to="/affiliate" className="text-gray-300 hover:text-[#00ff88] transition-colors font-medium">
            Affiliate
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {token ? (
            <>
              <BalanceWidget />
              <Link
                to="/profile"
                className="hidden md:block text-gray-300 hover:text-white text-sm font-medium"
              >
                {user?.username || 'Profile'}
              </Link>
              <Link to="/wallet" className="hidden md:inline-flex bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-[#00ff88]/20 transition-all">
                Wallet
              </Link>
              <button
                onClick={handleLogout}
                className="hidden md:block text-gray-400 hover:text-red-400 text-sm transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-gray-300 hover:text-white text-sm font-medium px-3 py-2"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-[#00ff88] text-[#1a1a2e] font-bold rounded-lg px-4 py-2 text-sm hover:bg-[#00cc70] transition-all"
              >
                Register
              </Link>
            </>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden text-gray-300 hover:text-white p-1"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0f3460] border-t border-white/10 px-4 py-4 flex flex-col gap-3">
          <Link to="/" className="text-gray-300 hover:text-[#00ff88] py-2" onClick={() => setMenuOpen(false)}>Lobby</Link>
          <Link to="/bonuses" className="text-gray-300 hover:text-[#00ff88] py-2" onClick={() => setMenuOpen(false)}>Bonuses</Link>
          <Link to="/affiliate" className="text-gray-300 hover:text-[#00ff88] py-2" onClick={() => setMenuOpen(false)}>Affiliate</Link>
          {token && (
            <>
              <Link to="/wallet" className="text-gray-300 hover:text-[#00ff88] py-2" onClick={() => setMenuOpen(false)}>Wallet</Link>
              <Link to="/profile" className="text-gray-300 hover:text-[#00ff88] py-2" onClick={() => setMenuOpen(false)}>Profile</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="text-red-400 text-left py-2">Logout</button>
            </>
          )}
        </div>
      )}
    </header>
  )
}
