import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <footer className="bg-[#0f3460] border-t border-white/10 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>© 2024 CasinoPro. All rights reserved. Play responsibly. 18+</p>
          <p className="mt-1 text-gray-500 text-xs">This is a demo application. Not a real casino.</p>
        </div>
      </footer>
    </div>
  )
}
