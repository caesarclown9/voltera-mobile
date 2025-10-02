import { useEffect, useCallback, useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { NotificationService } from '@/shared/utils/notifications'
import { logger } from '@/shared/utils/logger'
import { apiClient } from '@/services/evpowerApi'
import { API_ENDPOINTS } from '@/api/endpoints'

interface ChargingSession {
  sessionId: string
  stationId: string
  connectorId: string
  status: 'preparing' | 'charging' | 'suspended' | 'finishing' | 'finished' | 'faulted'
  energy: number // kWh
  duration: number // seconds
  cost: number // som
  power: number // kW
  startTime: string
  endTime?: string
}

export const useChargingPolling = (sessionId: string) => {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<ChargingSession | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(false)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  
  // Функция для получения статуса зарядки через HTTP API
  const fetchChargingStatus = useCallback(async (retryCount = 0): Promise<any> => {
    try {
      logger.info('Polling charging status for session:', sessionId)

      // Используем evpowerApi для получения статуса зарядки
      const status = await apiClient.getChargingStatus(sessionId)

      logger.info('Charging status received:', status)
      return status
    } catch (error) {
      logger.error('Ошибка получения статуса зарядки:', error)
      
      // Retry логика
      if (retryCount < maxRetries) {
        logger.info(`Повтор запроса ${retryCount + 1}/${maxRetries}`)
        setTimeout(() => {
          fetchChargingStatus(retryCount + 1)
        }, 2000)
      } else {
        setConnectionStatus('error')
      }
      return null
    }
  }, [sessionId])
  
  // Функция для обновления UI
  const updateChargingStatus = useCallback((status: any) => {
    if (!status) return

    // Преобразуем данные из API в формат ChargingSession
    const sessionData: ChargingSession = {
      sessionId: status.session_id || sessionId,
      stationId: status.station_id || '',
      connectorId: status.connector_id || '',
      status: status.status || 'preparing',
      energy: status.energy_delivered || status.energy || 0,
      duration: status.duration || 0,
      cost: status.current_cost || status.cost || 0,
      power: status.power || 0,
      startTime: status.start_time || status.startTime || new Date().toISOString(),
      endTime: status.end_time || status.endTime
    }

    setSession(sessionData)
    
    // Обновляем cache для других компонентов
    queryClient.setQueryData(['charging-status', sessionId], status)
    
    // Отправляем уведомления при изменении статуса
    if (status.status) {
      const currentStatus = status.status
      if (currentStatus === 'charging' && session?.status !== 'charging') {
        NotificationService.notifyChargingStarted(sessionData.stationId)
      } else if (currentStatus === 'finished') {
        NotificationService.notifyChargingComplete(
          sessionData.stationId,
          sessionData.energy,
          sessionData.cost
        )
      } else if (currentStatus === 'faulted') {
        NotificationService.notifyChargingError(
          sessionData.stationId,
          'Ошибка зарядки'
        )
      }
    }

    logger.info('Статус зарядки обновлен:', sessionData)
  }, [sessionId, session, queryClient])

  // Функция polling
  const poll = useCallback(async () => {
    if (!isPollingRef.current) return
    
    const status = await fetchChargingStatus()
    if (status) {
      updateChargingStatus(status)
      retryCountRef.current = 0 // Сбрасываем счетчик ошибок при успехе
      
      // Остановить polling если зарядка завершена
      if (status.status === 'finished' || status.status === 'faulted') {
        logger.info('Зарядка завершена, остановка мониторинга')
        stopPolling()
      }
    }
  }, [fetchChargingStatus, updateChargingStatus])

  // Запуск polling
  const startPolling = useCallback(() => {
    if (isPollingRef.current || !sessionId) return
    
    logger.info('Starting charging status polling for session:', sessionId)
    isPollingRef.current = true
    setConnectionStatus('connecting')
    
    // Первый запрос сразу
    poll().then(() => {
      setConnectionStatus('connected')
    })
    
    // Затем каждые 5 секунд
    pollingIntervalRef.current = setInterval(poll, 5000)
  }, [sessionId, poll])

  // Остановка polling
  const stopPolling = useCallback(() => {
    logger.info('Stopping charging status polling')
    isPollingRef.current = false
    setConnectionStatus('disconnected')
    retryCountRef.current = 0
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  // Обновление статуса (для совместимости с предыдущим API)
  const updateChargingSession = useCallback((newStatus: Partial<ChargingSession>) => {
    setSession(prevSession => ({
      ...prevSession!,
      ...newStatus,
    }))
  }, [])

  // Заглушка для отправки сообщений (для совместимости)
  const sendMessage = useCallback((_message: any) => {
    logger.warn('sendMessage called but HTTP polling does not support sending messages')
  }, [])

  // Автоматический запуск polling при монтировании
  useEffect(() => {
    if (sessionId) {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [sessionId, startPolling, stopPolling])

  return {
    session,
    connectionStatus,
    updateChargingStatus: updateChargingSession,
    sendMessage,
    reconnect: startPolling,
    disconnect: stopPolling,
    isConnected: connectionStatus === 'connected',
    reconnectAttempts: retryCountRef.current,
  }
}