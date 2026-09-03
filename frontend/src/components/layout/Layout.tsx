import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import LoadingBar from '../ui/LoadingBar'
import ToastContainer from '../ui/Toast'

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LoadingBar />
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '20px 24px', position: 'relative', zIndex: 2, minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
