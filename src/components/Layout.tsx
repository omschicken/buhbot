import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Header />
      <main className="pt-16">
        <Outlet />
      </main>
      <footer className="border-t border-white/5 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="gradient-text font-bold text-lg mb-2">🎰 NeonBet</p>
          <p className="text-white/20 text-sm">© 2024 NeonBet Casino. Play responsibly. 18+</p>
          <div className="flex justify-center gap-6 mt-4">
            {['Privacy', 'Terms', 'Responsible Gaming', 'Support'].map((l) => (
              <a key={l} href="#" className="text-white/30 hover:text-white/60 text-xs transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
