import { useQuery } from "@tanstack/react-query";
import { evpowerApi } from "@/services/evpowerApi";
import {
  extractStationsFromLocations,
  type StationWithLocation,
} from "../types";
import { logger } from "@/shared/utils/logger";

// Get all stations from API with location data
export const useStations = (
  onlyAvailable = true,
  userLocation?: { lat: number; lng: number },
) => {
  return useQuery<StationWithLocation[]>({
    queryKey: ["stations-v3", onlyAvailable, userLocation],
    queryFn: async () => {
      try {
        // Получаем все локации со станциями
        const locations = await evpowerApi.getLocations(true);

        // Извлекаем и обогащаем станции данными локаций
        const allStations = extractStationsFromLocations(
          locations,
          userLocation,
        );

        // Фильтруем только доступные станции если требуется
        // Бэкенд возвращает вычисленный статус: 'available', 'occupied', 'offline', 'maintenance'
        const filteredStations = onlyAvailable
          ? allStations.filter(
              (s) => s.status === "available" || s.status === "occupied",
            )
          : allStations;

        return filteredStations;
      } catch (error) {
        logger.error("Failed to load stations:", error);
        throw error;
      }
    },
    staleTime: 1000 * 30, // 30 seconds - синхронизировано с useLocations
    gcTime: 1000 * 60 * 60, // 1 hour - храним в кеше
    refetchInterval: 1000 * 30, // Автообновление каждые 30 секунд (незаметно в фоне)
    refetchIntervalInBackground: false, // НЕ обновлять когда приложение в фоне (экономия батареи)
    refetchOnWindowFocus: true, // Обновлять при возврате в приложение
    refetchOnReconnect: true, // Обновлять при восстановлении сети
    retry: 2, // Retry failed requests in production
  });
};

// Get single station status (returns Station from API)
export const useStationStatus = (stationId: string) => {
  return useQuery({
    queryKey: ["station-status", stationId],
    queryFn: async () => {
      return await evpowerApi.getStationStatus(stationId);
    },
    enabled: !!stationId,
    refetchInterval: 30000, // Update every 30 seconds
  });
};

// Хук для поиска станций по разным полям
export const useStationSearch = (
  query: string,
  onlyAvailable = true,
  userLocation?: { lat: number; lng: number },
) => {
  const { data: allStations, ...restQuery } = useStations(
    onlyAvailable,
    userLocation,
  );

  const filteredStations = allStations?.filter(
    (station) =>
      station.model.toLowerCase().includes(query.toLowerCase()) ||
      station.serial_number.toLowerCase().includes(query.toLowerCase()) ||
      station.manufacturer.toLowerCase().includes(query.toLowerCase()) ||
      station.locationName?.toLowerCase().includes(query.toLowerCase()) ||
      station.locationAddress?.toLowerCase().includes(query.toLowerCase()),
  );

  return {
    data: filteredStations,
    ...restQuery,
  };
};

// Хук для получения статистики станций
// Бэкенд возвращает вычисленный статус: 'available', 'occupied', 'offline', 'maintenance'
export const useStationsStats = () => {
  const { data: stations } = useStations(false); // Получаем все станции для статистики

  const stats = {
    total: stations?.length || 0,
    available: stations?.filter((s) => s.status === "available").length || 0,
    occupied: stations?.filter((s) => s.status === "occupied").length || 0,
    offline: stations?.filter((s) => s.status === "offline").length || 0,
    maintenance:
      stations?.filter((s) => s.status === "maintenance").length || 0,
    totalConnectors:
      stations?.reduce((sum, s) => sum + s.connectors_count, 0) || 0,
    totalPower: stations?.reduce((sum, s) => sum + s.power_capacity, 0) || 0,
  };

  return stats;
};
