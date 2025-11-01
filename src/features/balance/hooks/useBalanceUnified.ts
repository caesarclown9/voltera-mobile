/**
 * Унифицированные хуки для работы с балансом
 * Используют единый API клиент и обеспечивают синхронизацию
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'
import { unifiedApi } from '@/services/evpowerApi'
import { supabase } from '../../../shared/config/supabase'
import type { UnifiedTransaction } from '../../auth/types/unified.types'

type ClientData = {
  id: string
  email?: string
  balance?: number
  [key: string]: unknown
} | null

/**
 * Хук для получения баланса
 * Синхронизирует данные между Supabase и EvPower API
 */
export const useBalance = () => {
  const [user, setUser] = useState<ClientData>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('clients').select('*').eq('id', user.id).single()
          .then(({ data }) => setUser(data))
      }
    })
  }, [])

  return useQuery({
    queryKey: ['balance', user?.id],
    queryFn: async () => {
      const balance = await unifiedApi.getBalance()
      return {
        client_id: user?.id,
        balance: balance,
        currency: 'KGS'
      }
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 секунд
    refetchInterval: 60000, // Обновлять каждую минуту
  })
}

/**
 * Хук для пополнения баланса через QR
 */
export const useQRTopup = () => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<ClientData>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('clients').select('*').eq('id', user.id).single()
          .then(({ data }) => setUser(data))
      }
    })
  }, [])

  return useMutation({
    mutationFn: async (params: { amount: number; description?: string }) => {
      return await unifiedApi.topupWithQR(params.amount, params.description)
    },
    onSuccess: async (data) => {
      // Записываем транзакцию как pending
      if (user?.id && data.invoice_id) {
        await supabase.from('transactions').insert({
          client_id: user.id,
          type: 'topup',
          amount: data.amount,
          balance_before: user.balance,
          balance_after: user.balance, // Пока не изменился
          description: `QR пополнение #${data.invoice_id}`,
          status: 'pending',
          payment_method: 'qr_odengi',
          invoice_id: data.invoice_id,
          created_at: new Date().toISOString()
        })
      }

      // Обновляем кэш баланса после создания QR
      queryClient.invalidateQueries({ queryKey: ['balance'] })
    }
  })
}

/**
 * Хук для проверки статуса платежа
 */
export const usePaymentStatus = (invoiceId: string, enabled = false) => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<ClientData>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('clients').select('*').eq('id', user.id).single()
          .then(({ data }) => setUser(data))
      }
    })
  }, [])

  return useQuery({
    queryKey: ['payment-status', invoiceId],
    queryFn: async () => {
      return await unifiedApi.getPaymentStatus(invoiceId)
    },
    enabled: enabled && !!invoiceId,
    refetchInterval: (query) => {
      const data = query.state.data; // Получаем данные из состояния Query
      // Останавливаем polling если оплачен или истёк
      if (data?.status === 1) {
        // Оплачен - обновляем транзакцию
        if (user?.id) {
          supabase.from('transactions')
            .update({
              status: 'success',
              balance_after: user.balance + (data.amount || 0)
            })
            .eq('invoice_id', invoiceId)
            .then(() => {
              // Обновляем баланс
              queryClient.invalidateQueries({ queryKey: ['balance'] })
            })
        }
        return false
      }
      if (data?.status === 2 || data?.invoice_expired) {
        // Отменён или истёк
        if (user?.id) {
          supabase.from('transactions')
            .update({ status: 'failed' })
            .eq('invoice_id', invoiceId)
        }
        return false
      }
      return 5000 // Проверяем каждые 5 секунд
    },
    refetchIntervalInBackground: true
  })
}

/**
 * Хук для мониторинга платежа (упрощённая версия)
 */
export function usePaymentMonitoring() {
  const [paymentStatus, setPaymentStatus] = useState<unknown>(null)
  const [monitoring, setMonitoring] = useState(false)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  const monitorPayment = useCallback((
    invoiceId: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
  ) => {
    setMonitoring(true)
    let attempts = 0
    const maxAttempts = 40 // 40 * 15сек = 10 минут

    const checkStatus = async () => {
      try {
        const response = await unifiedApi.getPaymentStatus(invoiceId)

        if (response) {
          setPaymentStatus(response)

          if (response.status === 1) {
            // Успешно оплачено
            setMonitoring(false)
            if (intervalId) clearInterval(intervalId)
            onSuccess?.()
            return true
          }

          if (response.status === 2 || response.invoice_expired) {
            // Отменено или истекло
            setMonitoring(false)
            if (intervalId) clearInterval(intervalId)
            onError?.(response.status === 2 ? 'Платёж отменён' : 'Время оплаты истекло')
            return true
          }
        }

        attempts++
        if (attempts >= maxAttempts) {
          setMonitoring(false)
          if (intervalId) clearInterval(intervalId)
          onError?.('Превышено время ожидания')
          return true
        }

        return false
      } catch (error: unknown) {
        console.error('Payment monitoring error:', error)
        return false
      }
    }

    // Запускаем проверку
    const id = setInterval(async () => {
      const shouldStop = await checkStatus()
      if (shouldStop && id) {
        clearInterval(id)
      }
    }, 15000)

    setIntervalId(id)

    // Первая проверка через 15 секунд
    setTimeout(checkStatus, 15000)
  }, [intervalId])

  const stopMonitoring = useCallback(() => {
    setMonitoring(false)
    setPaymentStatus(null)
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
  }, [intervalId])

  // Очистка при unmount
  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [intervalId])

  return {
    paymentStatus,
    monitoring,
    monitorPayment,
    stopMonitoring
  }
}

/**
 * Хук для получения истории транзакций
 */
export const useTransactionHistory = (limit = 50) => {
  const [user, setUser] = useState<ClientData>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('clients').select('*').eq('id', user.id).single()
          .then(({ data }) => setUser(data))
      }
    })
  }, [])

  return useQuery({
    queryKey: ['transactions', user?.id, limit],
    queryFn: async () => {
      return await unifiedApi.getTransactionHistory(limit) as UnifiedTransaction[]
    },
    enabled: !!user?.id,
    staleTime: 60000 // 1 минута
  })
}

/**
 * Хук для real-time подписки на изменения баланса
 */
export const useBalanceSubscription = (onBalanceChange?: (newBalance: number) => void) => {
  const [user, setUser] = useState<ClientData>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('clients').select('*').eq('id', user.id).single()
          .then(({ data }) => setUser(data))
      }
    })
  }, [])

  useEffect(() => {
    if (!user?.id) return

    // Подписываемся на изменения в таблице clients
    const subscription = supabase
      .channel(`balance:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'clients',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const newBalance = payload.new['balance']
          if (typeof newBalance === 'number') {
            // Обновляем кэш
            queryClient.setQueryData(['balance', user.id], (old: unknown) => ({
              ...(old as Record<string, unknown>),
              balance: newBalance
            }))

            // Вызываем callback
            onBalanceChange?.(newBalance)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id, queryClient, onBalanceChange])
}