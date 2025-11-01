import { useState, useEffect, useCallback } from 'react'
import { geolocationService, type Coordinates } from '@/lib/platform'

interface GeolocationState {
  loading: boolean
  accuracy?: number
  altitude?: number | null
  altitudeAccuracy?: number | null
  heading?: number | null
  latitude?: number
  longitude?: number
  speed?: number | null
  timestamp?: number
  error?: string
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  maximumAge?: number
  timeout?: number
  watchPosition?: boolean
}

/**
 * Hook для работы с геолокацией
 * Использует платформенную абстракцию согласно RULES.md
 */
export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const {
    enableHighAccuracy = false,
    maximumAge = 0,
    timeout = 10000,
    watchPosition = false,
  } = options

  const [state, setState] = useState<GeolocationState>({
    loading: false,
  })

  const [watchId, setWatchId] = useState<string | number | null>(null)

  const updateStateFromCoords = useCallback((coords: Coordinates) => {
    setState({
      loading: false,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      latitude: coords.latitude,
      longitude: coords.longitude,
      speed: coords.speed,
      timestamp: Date.now(),
    })
  }, [])

  const getCurrentPosition = useCallback(async () => {
    setState(prevState => ({ ...prevState, loading: true, error: undefined }))

    const result = await geolocationService.getCurrentPosition({
      enableHighAccuracy,
      maximumAge,
      timeout,
    })

    if (result.success && result.coords) {
      updateStateFromCoords(result.coords)
    } else {
      setState(prevState => ({
        ...prevState,
        loading: false,
        error: result.error || 'Не удалось получить местоположение',
      }))
    }
  }, [enableHighAccuracy, maximumAge, timeout, updateStateFromCoords])

  useEffect(() => {
    let mounted = true
    let currentWatchId: string | number | null = null

    const startLocationTracking = async () => {
      if (!mounted) return

      setState(prevState => ({ ...prevState, loading: true, error: undefined }))

      if (watchPosition) {
        // Используем отслеживание позиции
        try {
          currentWatchId = await geolocationService.watchPosition(
            (result) => {
              if (!mounted) return

              if (result.success && result.coords) {
                updateStateFromCoords(result.coords)
              } else {
                setState(prevState => ({
                  ...prevState,
                  loading: false,
                  error: result.error || 'Ошибка отслеживания местоположения',
                }))
              }
            },
            {
              enableHighAccuracy,
              maximumAge,
              timeout,
            }
          )

          setWatchId(currentWatchId)
        } catch (error) {
          if (!mounted) return

          console.error('[Geolocation] Failed to watch position:', error)
          setState(prevState => ({
            ...prevState,
            loading: false,
            error: 'Не удалось начать отслеживание местоположения',
          }))
        }
      } else {
        // Получаем позицию один раз
        const result = await geolocationService.getCurrentPosition({
          enableHighAccuracy,
          maximumAge,
          timeout,
        })

        if (!mounted) return

        if (result.success && result.coords) {
          updateStateFromCoords(result.coords)
        } else {
          setState(prevState => ({
            ...prevState,
            loading: false,
            error: result.error || 'Не удалось получить местоположение',
          }))
        }
      }
    }

    startLocationTracking()

    return () => {
      mounted = false

      // Очищаем отслеживание при размонтировании
      if (currentWatchId !== null) {
        geolocationService.clearWatch(currentWatchId)
      }
    }
  }, [enableHighAccuracy, maximumAge, timeout, watchPosition, updateStateFromCoords])

  // Очищаем отслеживание при изменении watchId
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        geolocationService.clearWatch(watchId)
      }
    }
  }, [watchId])

  return {
    ...state,
    getCurrentPosition,
    isSupported: true, // Платформенная абстракция всегда поддерживается
  }
}