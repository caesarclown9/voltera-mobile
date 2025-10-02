import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { evpowerApi } from '@/services/evpowerApi'
import type { StartChargingResponse, ChargingStatus, StopChargingResponse } from '@/services/evpowerApi'
import { parseConnectorId } from '../../../shared/utils/parsers'

// Состояния сессии зарядки (синхронизировано с backend)
export const ChargingSessionStatus = {
  PREPARING: 'preparing' as const,    // Подготовка к началу зарядки
  STARTING: 'starting' as const,      // Запуск зарядки в процессе  
  CHARGING: 'charging' as const,      // Активная зарядка
  STOPPING: 'stopping' as const,      // Остановка зарядки в процессе
  STOPPED: 'stopped' as const,        // Зарядка остановлена
  FINISHED: 'finished' as const,      // Зарядка завершена успешно
  FAULTED: 'faulted' as const,        // Ошибка зарядки
  SYNCING: 'syncing' as const         // Синхронизация с OCPP станцией
} as const

// Состояния станции OCPP (из стандарта)
export const OCPPConnectorStatus = {
  AVAILABLE: 'Available' as const,
  PREPARING: 'Preparing' as const, 
  CHARGING: 'Charging' as const,
  SUSPENDED_EVSE: 'SuspendedEVSE' as const,
  SUSPENDED_EV: 'SuspendedEV' as const,
  FINISHING: 'Finishing' as const,
  RESERVED: 'Reserved' as const,
  UNAVAILABLE: 'Unavailable' as const,
  FAULTED: 'Faulted' as const
} as const

export type ChargingSessionStatusType = typeof ChargingSessionStatus[keyof typeof ChargingSessionStatus]
export type OCPPConnectorStatusType = typeof OCPPConnectorStatus[keyof typeof OCPPConnectorStatus]

// Start charging mutation
export const useStartCharging = () => {
  const queryClient = useQueryClient()

  return useMutation<StartChargingResponse, Error, { station_id: string; connector_id: number; energy_kwh?: number; amount_som?: number }>({
    mutationFn: async (data) => {
      return await evpowerApi.startCharging(
        data.station_id,
        data.connector_id,
        {
          energy_kwh: data.energy_kwh,
          amount_som: data.amount_som
        }
      )
    },
    onSuccess: () => {
      // Start polling charging status
      queryClient.invalidateQueries({ queryKey: ['charging-status'] })
    },
  })
}

// Stop charging mutation
export const useStopCharging = () => {
  const queryClient = useQueryClient()

  return useMutation<StopChargingResponse, Error, { session_id: string }>({
    mutationFn: async (data) => {
      return await evpowerApi.stopCharging(data.session_id)
    },
    onSuccess: () => {
      // Update charging status and balance
      queryClient.invalidateQueries({ queryKey: ['charging-status'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
    },
  })
}


// Get charging status with real-time updates
export const useChargingStatus = (sessionId?: string) => {
  return useQuery<ChargingStatus>({
    queryKey: ['charging-status', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required')
      return await evpowerApi.getChargingStatus(sessionId)
    },
    enabled: !!sessionId,
    refetchInterval: (query) => {
      // Stop polling if session is finished
      const status = query.state.data?.session?.status;
      if (status === 'stopped' || status === 'error') {
        return false
      }
      return 3000 // Update every 3 seconds during active charging
    },
    refetchIntervalInBackground: true,
  })
}

// Current charging session store (for active session tracking)
export const useChargingSession = (() => {
  let currentSessionId: string | null = null
  const listeners: Set<() => void> = new Set()
  
  const notify = () => listeners.forEach(listener => listener())
  
  return () => ({
    currentSessionId,
    setCurrentSession: (sessionId: string | null) => {
      currentSessionId = sessionId
      notify()
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  })
})()

// Main unified charging hook
export const useCharging = () => {
  const startChargingMutation = useStartCharging()
  const stopChargingMutation = useStopCharging()

  const startCharging = async (data: {
    stationId: string;
    connectorId: string;
    energy_kwh?: number;
    amount_som?: number;
  }) => {
    try {
      // Шаг 1: Проверяем доступность станции
      const stationStatus = await evpowerApi.getStationStatus(data.stationId)

      // Проверяем доступность станции
      if (!stationStatus.available_for_charging) {
        return {
          success: false,
          sessionId: '',
          message: 'Станция недоступна для зарядки'
        }
      }

      // Шаг 2: Запускаем зарядку (backend сам проверит активные сессии)
      const result = await startChargingMutation.mutateAsync({
        station_id: data.stationId,
        connector_id: parseConnectorId(data.connectorId),
        energy_kwh: data.energy_kwh,
        amount_som: data.amount_som,
      })

      // КРИТИЧЕСКИ ВАЖНО: проверяем success в ответе API
      if (result.success === false) {
        return {
          success: false,
          sessionId: '',
          message: result.error || result.message || 'Ошибка запуска зарядки'
        }
      }

      // Сохраняем sessionId в Secure Storage для восстановления
      if (result.session_id) {
        const { secureStorage } = await import('@/lib/platform');
        await secureStorage.set('activeChargingSession', result.session_id);
      }

      return {
        success: true,
        sessionId: result.session_id || '',
        message: result.message || 'Зарядка запущена успешно'
      }
    } catch (error: any) {
      return {
        success: false,
        sessionId: '',
        message: error.message || 'Сетевая ошибка запуска зарядки'
      }
    }
  }

  const stopCharging = async (sessionId: string) => {
    try {
      const result = await stopChargingMutation.mutateAsync({
        session_id: sessionId // API требует session_id согласно документации
      })

      // Очищаем sessionId из Secure Storage при остановке
      const { secureStorage } = await import('@/lib/platform');
      await secureStorage.remove('activeChargingSession');

      return {
        success: true,
        message: result.message || 'Зарядка остановлена',
        data: result // Возвращаем полный ответ с информацией о возврате
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Ошибка остановки зарядки',
        error: error.message
      }
    }
  }

  return {
    startCharging,
    stopCharging,
    isStarting: startChargingMutation.isPending,
    isStoppingCharging: stopChargingMutation.isPending,
  }
}