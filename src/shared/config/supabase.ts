import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let url: string
let key: string

// In production, Supabase config is required
if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.PROD || import.meta.env.VITE_USE_REAL_API === 'true') {
    console.error('Missing Supabase configuration:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey
    });
    throw new Error('Supabase configuration is required in production')
  }
  // Use dummy values for development only
  url = 'https://dummy.supabase.co'
  key = 'dummy.key.for.development'
  
  console.warn('Using dummy Supabase config for development')
} else {
  url = supabaseUrl
  key = supabaseAnonKey
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'evpower-auth-token',
    detectSessionInUrl: false, // Отключаем автоматическую обработку токенов в URL
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  }
})