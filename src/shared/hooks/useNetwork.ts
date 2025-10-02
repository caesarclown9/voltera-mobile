import { useState, useEffect } from 'react'
import { networkService } from '@/lib/platform'
import type { NetworkStatus } from '@/lib/platform'

/**
 * Hook для работы с сетевым состоянием
 * Использует платформенную абстракцию согласно RULES.md
 */
export const useNetwork = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    connected: true,
    connectionType: 'unknown'
  })

  useEffect(() => {
    // Получаем начальное состояние
    networkService.getStatus().then(setNetworkStatus)

    // Подписываемся на изменения
    const unsubscribe = networkService.addListener((status) => {
      setNetworkStatus(status)
    })

    return unsubscribe
  }, [])

  return networkStatus
}

/**
 * Упрощенный hook для проверки онлайн статуса
 */
export const useOnlineStatus = () => {
  const { connected } = useNetwork()
  return connected
}