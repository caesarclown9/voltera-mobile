import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { evpowerApi } from "@/services/evpowerApi";
// WebSocket для локаций отключён, используем только HTTP + Supabase там, где нужно
import { calculateDistance } from "@/shared/utils/geo";
import { logger } from "@/shared/utils/logger";
import type {
  Location,
  StationStatusResponse,
  LocationUpdate,
  WebSocketLocationUpdate,
  WebSocketStationUpdate,
} from "../../../api/types";

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
          console.log("Геолокация недоступна:", error);
        },
      );
    }
  }, [requestGeolocation]);

  const queryClient = useQueryClient();

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

      // DEBUG: временное логирование
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
    staleTime: 1000 * 60 * 10, // 10 minutes for reference data
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
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
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
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
 */
export function useStationStatus(stationId: string) {
  // Station status should NOT be cached - always fetch from network
  return useQuery({
    queryKey: ["station-status", stationId],
    queryFn: async (): Promise<StationStatusResponse> => {
      return await evpowerApi.getStationStatus(stationId);
    },
    enabled: !!stationId,
    staleTime: 0, // Always fresh
    gcTime: 0, // Don't cache
    refetchInterval: 10000, // Poll every 10 seconds when in view
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
    const handleUpdate = (
      data: WebSocketLocationUpdate | WebSocketStationUpdate,
    ) => {
      if (data.type === "location_status_update") {
        // Обновляем кэш локаций
        queryClient.setQueryData(
          ["locations"],
          (oldData: Location[] | undefined) => {
            if (!oldData) return oldData;

            return oldData.map((location) =>
              location.id === data.location_id
                ? {
                    ...location,
                    status: data.status,
                    stations_summary: data.stations_summary,
                  }
                : location,
            );
          },
        );

        // Обновляем кэш конкретной локации
        queryClient.invalidateQueries({
          queryKey: ["location", data.location_id],
        });
      }

      if (data.type === "station_status_update") {
        // Обновляем кэш статуса станции
        queryClient.setQueryData(
          ["station-status", data.station_id],
          (oldData: StationStatusResponse | undefined) => {
            if (!oldData) return oldData;

            return {
              ...oldData,
              station_status: data.status,
              connectors: data.connectors,
              available_connectors: data.connectors.filter((c) => c.available)
                .length,
              occupied_connectors: data.connectors.filter((c) => !c.available)
                .length,
            };
          },
        );
      }
    };

    // Ничего не делаем: WS отключен
    return () => {};
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
  console.warn(
    "useStations from useLocations is deprecated. Use features/stations/hooks/useStations instead",
  );

  const queryClient = useQueryClient();
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
          console.log("Геолокация недоступна:", error);
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
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    stations: stations || [],
    isLoading,
    error,
    refetch,
  };
}
