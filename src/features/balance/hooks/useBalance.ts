import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { evpowerApi, handleApiError } from '@/services/evpowerApi'
import type {
  TopupQRResponse,
  PaymentStatus
} from '@/services/evpowerApi'
import { useAuthStore } from '../../auth/store'
import { supabase } from '../../../shared/config/supabase'

// Get balance query - берем из БД Supabase
export const useBalance = () => {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['balance', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      // Сначала пробуем получить баланс из таблицы clients
      const { data: clientData, error } = await supabase
        .from('clients')
        .select('balance')
        .eq('id', user.id)
        .single()

      if (!error && clientData) {
        return {
          client_id: user.id,
          balance: clientData.balance || 0,
          currency: 'KGS'
        }
      }

      // Fallback на API если БД не доступна
      try {
        const balance = await evpowerApi.getBalance()
        return {
          client_id: user.id,
          balance: balance,
          currency: 'KGS'
        }
      } catch (apiError) {
        // Если и API не доступен, возвращаем баланс из локального состояния
        return {
          client_id: user.id,
          balance: user.balance || 0,
          currency: 'KGS'
        }
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 секунд
    refetchInterval: 1000 * 60, // Обновлять каждую минуту
  })
}

// QR Topup mutation
export const useQRTopup = () => {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation<TopupQRResponse, Error, { amount: number; description?: string }>({
    mutationFn: async (data) => {
      if (!user?.id) throw new Error('User not authenticated')
      return await evpowerApi.topupWithQR(data.amount, data.description)
    },
    onSuccess: () => {
      // Invalidate balance to refresh after successful topup
      queryClient.invalidateQueries({ queryKey: ['balance'] })
    },
  })
}

// Payment status polling
export const usePaymentStatus = (invoiceId: string, enabled = false) => {
  return useQuery<PaymentStatus>({
    queryKey: ['payment-status', invoiceId],
    queryFn: async () => {
      return await evpowerApi.getPaymentStatus(invoiceId)
    },
    enabled: enabled && !!invoiceId,
    refetchInterval: (data) => {
      // Проверять каждые 5 секунд пока не оплачен
      if (data && 'status' in data && data.status === 1) return false // Оплачен
      if (data && 'invoice_expired' in data && data.invoice_expired) return false // Истек
      return 5000 // 5 секунд
    },
    refetchIntervalInBackground: true,
  })
}

// Cancel payment mutation
// Note: Backend API не имеет endpoint для отмены платежа
// Платеж автоматически истекает через 10 минут
export const useCancelPayment = () => {
  return useMutation<void, Error, string>({
    mutationFn: async (invoiceId) => {
      // Placeholder - backend не поддерживает отмену
      console.warn('Cancel payment not supported by backend API')
    },
  })
}

// Payment monitoring hook (legacy support)
export function usePaymentMonitoring() {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [monitoring, setMonitoring] = useState(false)

  const monitorPayment = useCallback((invoiceId: string, onSuccess?: () => void, onError?: (error: string) => void) => {
    let attempts = 0
    const maxAttempts = 40 // 40 attempts * 15 seconds = 10 minutes
    setMonitoring(true)

    const checkStatus = async () => {
      try {
        const status = await evpowerApi.getPaymentStatus(invoiceId)
        setPaymentStatus(status)

        // Payment successful
        if (status.status === 1) {
          setMonitoring(false)
          onSuccess?.()
          return
        }

        // Payment canceled
        if (status.status === 2) {
          setMonitoring(false)
          onError?.('Платеж отменен')
          return
        }

        // Payment expired
        if (status.qr_expired || status.invoice_expired) {
          setMonitoring(false)
          onError?.('Время оплаты истекло')
          return
        }

        // Continue monitoring
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 15000) // Check every 15 seconds
        } else {
          setMonitoring(false)
          onError?.('Время ожидания оплаты истекло')
        }

      } catch (error) {
        
        setMonitoring(false)
        onError?.(handleApiError(error))
      }
    }

    // Start checking after 15 seconds
    setTimeout(checkStatus, 15000)
  }, [])

  const stopMonitoring = useCallback(() => {
    setMonitoring(false)
    setPaymentStatus(null)
  }, [])

  return {
    paymentStatus,
    monitoring,
    monitorPayment,
    stopMonitoring
  }
}