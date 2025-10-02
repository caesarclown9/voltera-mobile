import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../store'
import { authService } from '../services/authService'
import { useNavigate } from 'react-router-dom'

interface SignInRequest {
  email?: string
  phone?: string
  password: string
}

interface SignUpRequest {
  email: string
  phone: string
  password: string
}

// Sign In mutation - для входа существующих пользователей
export const useSignIn = () => {
  const { login } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (data: SignInRequest) => {
      // Определяем, что использовать - email или phone
      if (data.phone) {
        const result = await authService.signInWithPhone(data.phone, data.password)
        return result
      } else if (data.email) {
        const result = await authService.signInWithEmail(data.email, data.password)
        return result
      } else {
        throw new Error('Email или телефон обязателен')
      }
    },
    onSuccess: (data, _variables) => {
      if (data.success && data.client) {
        // Преобразуем Client в UnifiedUser
        const unifiedUser = {
          id: data.client.id,
          email: data.client.email,
          phone: data.client.phone || null,
          name: data.client.name || 'User',
          balance: data.client.balance || 0,
          status: 'active' as const,
          favoriteStations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        login(unifiedUser)
        navigate('/', { replace: true })
      }
    },
  })
}

// Sign Up mutation - для регистрации новых пользователей
export const useSignUp = () => {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  
  return useMutation({
    mutationFn: async (data: SignUpRequest) => {
      const result = await authService.signUpWithEmail(
        data.email,
        data.password,
        data.phone
      )
      return result
    },
    onSuccess: (data, _variables) => {
      if (data.success && data.client) {
        // Преобразуем Client в UnifiedUser
        const unifiedUser = {
          id: data.client.id,
          email: data.client.email,
          phone: data.client.phone || null,
          name: data.client.name || 'User',
          balance: data.client.balance || 0,
          status: 'active' as const,
          favoriteStations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        login(unifiedUser)
        navigate('/', { replace: true })
      }
    },
  })
}

// Старый хук для обратной совместимости
export const useLogin = useSignIn

// Logout mutation
export const useLogout = () => {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  
  return useMutation({
    mutationFn: async () => {
      await authService.signOut()
      return Promise.resolve()
    },
    onSuccess: () => {
      logout()
      navigate('/auth', { replace: true })
    },
  })
}

// Check if user is authenticated
export const useAuthStatus = () => {
  const { isAuthenticated, user, isInitialized } = useAuthStore()

  return {
    isAuthenticated,
    user,
    phone: user?.phone || null,
    isInitialized,
    isLoading: !isInitialized, // Loading пока не завершена инициализация
  }
}

// Alias for useAuthStatus for backward compatibility
export const useAuth = useAuthStatus