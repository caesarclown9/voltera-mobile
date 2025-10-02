import { useEffect } from 'react'
import { useAuthStore } from '../store'
import { authService } from '../services/authService'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { login, logout, setInitialized } = useAuthStore()

  useEffect(() => {
    // Rehydrate the store on mount
    useAuthStore.persist.rehydrate()

    // Initialize auth state - проверяем сохраненную сессию
    const initializeAuth = async () => {
      try {
        const user = await authService.getCurrentUser()
        if (user) {
          // Преобразуем Client в UnifiedUser
          const unifiedUser = {
            id: user.id,
            email: user.email,
            phone: user.phone || null,
            name: user.name || 'User',
            balance: user.balance || 0,
            status: 'active' as const,
            favoriteStations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          login(unifiedUser)
        } else {
          // Проверяем сохраненное состояние
          const storedAuth = localStorage.getItem('auth-storage')
          if (!storedAuth || storedAuth === 'null') {
            // Нет сессии и нет сохраненного состояния
            setInitialized(true)
          } else {
            // Есть сохраненное состояние, но нет сессии в Supabase
            // Оставляем состояние как есть (пользователь авторизован локально)
            setInitialized(true)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setInitialized(true)
      }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        authService.getCurrentUser().then(user => {
          if (user) {
            // Преобразуем Client в UnifiedUser
            const unifiedUser = {
              id: user.id,
              email: user.email,
              phone: user.phone || null,
              name: user.name || 'User',
              balance: user.balance || 0,
              status: 'active' as const,
              favoriteStations: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
            login(unifiedUser)
          }
        })
      } else if (event === 'SIGNED_OUT') {
        // Явный выход - очищаем состояние
        const currentUser = authService.getCurrentUser()
        currentUser.then(user => {
          if (!user) {
            logout()
          }
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [login, logout])

  return <>{children}</>
}