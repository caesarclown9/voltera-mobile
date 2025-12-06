import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { evpowerApi } from "@/services/evpowerApi";
import { logger } from "@/shared/utils/logger";

/**
 * Компонент для предзагрузки данных в фоне
 * Загружает основные данные сразу при старте приложения,
 * чтобы страницы открывались мгновенно
 */
export function DataPrefetcher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Предзагружаем локации/станции - основные данные для карты и списка
    const prefetchLocations = async () => {
      try {
        const locations = await queryClient.fetchQuery({
          queryKey: ["locations"],
          queryFn: () => evpowerApi.getLocations(true),
          staleTime: 1000 * 30, // 30 секунд
        });
        logger.debug("[Prefetcher] Locations prefetched");

        // После загрузки локаций, prefetch статусы первых 3 станций
        // Это позволит быстро открывать страницы станций
        const stationIds: string[] = [];
        for (const location of locations.slice(0, 3)) {
          if (location.stations) {
            for (const station of location.stations.slice(0, 2)) {
              stationIds.push(station.serial_number);
            }
          }
        }

        // Prefetch station statuses in background
        for (const stationId of stationIds.slice(0, 5)) {
          queryClient.prefetchQuery({
            queryKey: ["station-status", stationId],
            queryFn: () => evpowerApi.getStationStatus(stationId),
            staleTime: 1000 * 30,
          });
        }
        logger.debug("[Prefetcher] Station statuses prefetched:", stationIds.length);
      } catch (error) {
        logger.debug("[Prefetcher] Failed to prefetch locations:", error);
      }
    };

    // Предзагружаем станции v3 (используются в StationsList)
    const prefetchStations = async () => {
      try {
        const { extractStationsFromLocations } = await import(
          "@/features/stations/types"
        );

        await queryClient.prefetchQuery({
          queryKey: ["stations-v3", false, undefined],
          queryFn: async () => {
            const locations = await evpowerApi.getLocations(true);
            return extractStationsFromLocations(locations, undefined);
          },
          staleTime: 1000 * 30,
        });
        logger.debug("[Prefetcher] Stations prefetched");
      } catch (error) {
        logger.debug("[Prefetcher] Failed to prefetch stations:", error);
      }
    };

    // Запускаем prefetch с небольшой задержкой, чтобы не блокировать первоначальный рендер
    const timer = setTimeout(() => {
      prefetchLocations();
      prefetchStations();
    }, 500);

    return () => clearTimeout(timer);
  }, [queryClient]);

  // Компонент не рендерит ничего
  return null;
}
