import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { Router } from './app/Router'
import { Providers } from './app/Providers'
import { ErrorBoundary } from './shared/components/ErrorBoundary'
import { AuthModal } from './features/auth/components/AuthModal'
import { ToastContainer } from './shared/hooks/useToast'
import { createIDBPersister, shouldPersistQuery } from './lib/queryPersister'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes for reference data
      gcTime: 1000 * 60 * 60, // 1 hour garbage collection
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry on certain errors
        const status = error instanceof Error && 'status' in error 
          ? (error as Error & { status: number }).status 
          : undefined
        if (status === 404 || status === 401) {
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
    },
  },
})

const persister = createIDBPersister()

function App() {
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
          dehydrateOptions: {
            shouldDehydrateQuery: (query: any) => {
              // Only persist queries that match our criteria
              return query.state.status === 'success' && shouldPersistQuery(query.queryKey)
            },
          },
        }}
      >
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <Providers>
            <div className="min-h-screen bg-gray-50">
              <Router />
              <AuthModal />
              <ToastContainer />
            </div>
          </Providers>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  )
}

export default App