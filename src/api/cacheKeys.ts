/**
 * Centralized cache keys for React Query
 * Single source of truth for all query keys
 */

export const CACHE_KEYS = {
  // Location keys
  locations: {
    all: ['locations'] as const,
    detail: (id: string, includeStations = true) => ['location', id, includeStations] as const,
  },
  
  // Station keys
  stations: {
    all: ['stations'] as const,
    detail: (id: string) => ['station', id] as const,
    status: (id: string) => ['station-status', id] as const,
  },
  
  // Charging keys (not persisted)
  charging: {
    session: (id: string) => ['charging', 'session', id] as const,
    status: (id: string) => ['charging', 'status', id] as const,
    history: (clientId: string) => ['charging', 'history', clientId] as const,
  },
  
  // User/Profile keys
  profile: {
    current: ['profile'] as const,
    detail: (id: string) => ['profile', id] as const,
  },
  
  // Balance keys
  balance: {
    current: (clientId: string) => ['balance', clientId] as const,
  },
  
  // Payment keys (not persisted)
  payment: {
    status: (invoiceId: string) => ['payment', 'status', invoiceId] as const,
    history: (clientId: string) => ['payment', 'history', clientId] as const,
  },
  
  // Auth keys
  auth: {
    session: ['auth', 'session'] as const,
    user: ['auth', 'user'] as const,
  },
} as const

/**
 * Helper to create mutation keys
 */
export const MUTATION_KEYS = {
  charging: {
    start: ['charging', 'start'] as const,
    stop: ['charging', 'stop'] as const,
  },
  
  payment: {
    createQR: ['payment', 'createQR'] as const,
    cancel: ['payment', 'cancel'] as const,
  },
  
  auth: {
    signIn: ['auth', 'signIn'] as const,
    signUp: ['auth', 'signUp'] as const,
    signOut: ['auth', 'signOut'] as const,
    verify: ['auth', 'verify'] as const,
  },
} as const

/**
 * Check if a query key should be persisted
 */
export function shouldPersistQueryKey(queryKey: unknown): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false
  
  const firstKey = queryKey[0]
  if (typeof firstKey !== 'string') return false
  
  // Keys that should be persisted
  const persistableKeys = ['locations', 'location', 'stations', 'station', 'profile', 'balance']
  
  // Keys that should NOT be persisted (real-time data)
  const nonPersistableKeys = ['charging', 'status', 'payment', 'station-status']
  
  // Check non-persistable first
  for (const key of nonPersistableKeys) {
    if (queryKey.some(k => typeof k === 'string' && k.includes(key))) {
      return false
    }
  }
  
  // Check persistable
  return persistableKeys.includes(firstKey)
}