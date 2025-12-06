import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { evpowerApi } from "@/services/evpowerApi";
// WebSocket для локаций отключён, используем только HTTP + Supabase там, где нужно
import { calculateDistance } from "@/shared/utils/geo";
import { logger } from "@/shared/utils/logger";
import type { Location, StationStatusResponse } from "../../../api/types";

// Helper: добавляет расстояние к локациям
function addDistanceToLocations(
  locations: Location[],
  userLat: number,
  userLng: number,
): Location[] {
  return locations
    .map((location) => {
      if (location.latitude && location.longitude) {
        return {
          ...location,
          distance: calculateDistance(
            userLat,
            userLng,
            location.latitude,
            location.longitude,
          ),
        };
      }
      return location;
    })
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

/**
 * Хук для получения списка всех локаций
 */
export function useLocations(requestGeolocation: boolean = false) {
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Получаем геолокацию пользователя только если явно запрошено
  useEffect(() => {
    if (requestGeolocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          logger.debug("Геолокация недоступна:", error);
        },
      );
    }
  }, [requestGeolocation]);

  const {
    data: locations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      if (import.meta.env.DEV)
        logger.debug("[useLocations] Query function called!");
      const locations = await evpowerApi.getLocations(true);

      if (import.meta.env.DEV)
        logger.debug("[useLocations] Fetched locations from API", {
          count: locations.length,
          first: locations[0],
        });

      // Добавляем расстояние если есть геолокация
      if (userLocation) {
        return addDistanceToLocations(
          locations,
          userLocation.lat,
          userLocation.lng,
        );
      }

      return locations;
    },
    staleTime: 1000 * 30, // 30 seconds - данные считаются устаревшими быстро
    gcTime: 1000 * 60 * 60, // 1 hour - храним в кеше
    refetchInterval: 1000 * 30, // Автообновление каждые 30 секунд (незаметно в фоне)
    refetchIntervalInBackground: false, // НЕ обновлять когда приложение в фоне (экономия батареи)
    refetchOnWindowFocus: true, // Обновлять при возврате в приложение
    refetchOnReconnect: true, // Обновлять при восстановлении сети
  });

  return {
    locations: locations || [],
    isLoading,
    error,
    refetch,
    userLocation,
  };
}

/**
 * Хук для получения детальной информации о локации
 * Note: Backend API не поддерживает отдельный endpoint для одной локации
 * Получаем все локации и фильтруем по ID
 */
export function useLocation(
  locationId: string,
  includeStations: boolean = true,
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["location", locationId, includeStations],
    queryFn: async () => {
      const locations = await evpowerApi.getLocations(includeStations);
      return locations.find((loc) => loc.id === locationId);
    },
    enabled: !!locationId,
    staleTime: 1000 * 30, // 30 seconds - синхронизировано с useLocations
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchInterval: 1000 * 30, // Автообновление каждые 30 секунд (незаметно в фоне)
    refetchIntervalInBackground: false, // НЕ обновлять когда приложение в фоне
    refetchOnWindowFocus: true, // Обновлять при возврате в приложение
    refetchOnReconnect: true,
    placeholderData: () => {
      // Use cached data as placeholder
      return queryClient.getQueryData([
        "location",
        locationId,
        includeStations,
      ]) as Location | undefined;
    },
  });
}

/**
 * Хук для получения статуса станции
 * Кэшируем на 10 секунд чтобы избежать дублирующих запросов при переходах
 */
export function useStationStatus(stationId: string) {
  return useQuery({
    queryKey: ["station-status", stationId],
    queryFn: async (): Promise<StationStatusResponse> => {
      return await evpowerApi.getStationStatus(stationId);
    },
    enabled: !!stationId,
    staleTime: 1000 * 10, // 10 секунд - данные считаются свежими
    gcTime: 1000 * 60, // 1 минута - храним в кеше
    refetchInterval: 1000 * 10, // Poll every 10 seconds when in view
    refetchOnWindowFocus: true,
  });
}

/**
 * Хук для real-time обновлений локаций
 */
export function useLocationUpdates(channels: string[] = ["all"]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Ранее здесь подключались к WS и подписывались на каналы.
    // Теперь real-time обновления статусов обеспечиваются через Supabase и периодический refetch.
    // WS отключен, ничего не делаем
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels.join(","), queryClient]);

  return {
    isConnected: false,
    subscriptions: [],
  };
}

/**
 * Хук для получения станций с обогащением данными локаций
 * Note: Этот хук дублирует логику из features/stations/hooks/useStations.ts
 * Рекомендуется использовать тот вместо этого
 * @deprecated Use features/stations/hooks/useStations instead
 */
export function useStations(requestGeolocation: boolean = false) {
  logger.warn(
    "useStations from useLocations is deprecated. Use features/stations/hooks/useStations instead",
  );

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Получаем геолокацию если запрошено
  useEffect(() => {
    if (requestGeolocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          logger.debug("Геолокация недоступна:", error);
        },
      );
    }
  }, [requestGeolocation]);

  const {
    data: stations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["stations-v3", userLocation],
    queryFn: async () => {
      // Импортируем адаптер
      const { extractStationsFromLocations } = await import(
        "../../stations/types"
      );
      // Получаем все локации со станциями
      const locations = await evpowerApi.getLocations(true);
      // Извлекаем и обогащаем станции
      return extractStationsFromLocations(locations, userLocation || undefined);
    },
    staleTime: 1000 * 30, // 30 seconds - синхронизировано с useLocations
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchInterval: 1000 * 30, // Автообновление каждые 30 секунд
    refetchIntervalInBackground: false, // НЕ обновлять когда приложение в фоне
    refetchOnWindowFocus: true, // Обновлять при возврате в приложение
    refetchOnReconnect: true,
  });

  return {
    stations: stations || [],
    isLoading,
    error,
    refetch,
  };
}
