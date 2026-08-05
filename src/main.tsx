import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import './index.css'
import App from './App.tsx'
import { applyFontSize, readFontSize } from './lib/fontSize'

applyFontSize(readFontSize())

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: SEVEN_DAYS,
      retry: 1,
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'storetrack-cache',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: SEVEN_DAYS }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PersistQueryClientProvider>
  </StrictMode>,
)
