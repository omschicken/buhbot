import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import App from './App'
import './styles.css'

try { WebApp.ready(); WebApp.expand() } catch {}

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
