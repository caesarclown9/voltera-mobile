import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AuthProvider } from '../features/auth/providers/AuthProvider'
import { websocketManager } from '../features/locations/services/websocketManager'
import { createWsCacheAdapter } from '../features/locations/services/wsCacheAdapter'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = useQueryClient()
  const hasPrefetched = useRef(false)
  const wsCacheAdapterRef = useRef<ReturnType<typeof createWsCacheAdapter>>()

  useEffect(() => {
    // Prefetch basic data on mount (only once)
    if (!hasPrefetched.current) {
      hasPrefetched.current = true
      
      // Parallel prefetch of basic data
      Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['locations'],
          queryFn: async () => {
            // This will be overridden by actual query function
            return []
          },
          staleTime: 1000 * 60 * 10, // 10 minutes for locations
        }),
        queryClient.prefetchQuery({
          queryKey: ['stations'],
          queryFn: async () => {
            // This will be overridden by actual query function
            return []
          },
          staleTime: 1000 * 60 * 10, // 10 minutes for stations
        }),
      ]).catch(console.error)
    }
  }, [queryClient])

  useEffect(() => {
    // Set up WebSocket to React Query cache adapter
    if (!wsCacheAdapterRef.current) {
      wsCacheAdapterRef.current = createWsCacheAdapter(queryClient)
    }

    const adapter = wsCacheAdapterRef.current

    // WebSocket handler that uses the adapter
    const handleWsMessage = (data: any) => {
      adapter.processMessage(data)
    }

    // Connect WebSocket and set up handler
    websocketManager.connect()
    websocketManager.subscribe('all')
    websocketManager.addUpdateHandler(handleWsMessage)

    // Cleanup
    return () => {
      websocketManager.removeUpdateHandler(handleWsMessage)
      websocketManager.unsubscribe('all')
      // Don't disconnect here as other components might be using it
    }
  }, [queryClient])

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}