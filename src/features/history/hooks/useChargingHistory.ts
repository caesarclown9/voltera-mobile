import { useQuery } from "@tanstack/react-query";
import { unifiedApi } from "@/services/evpowerApi";
import type {
  ChargingHistoryItem,
  TransactionHistoryItem,
  UsageStatistics,
} from "../types";

// Хук для получения истории зарядок
export const useChargingHistory = (limit: number = 50) => {
  return useQuery({
    queryKey: ["charging-history", limit],
    queryFn: async (): Promise<ChargingHistoryItem[]> => {
      try {
        // Получаем историю напрямую через evpowerApi
        const data = await unifiedApi.getChargingHistory(limit);

        if (!data || data.length === 0) {
          return [];
        }

        // Преобразуем данные в ChargingHistoryItem
        return data.map((session: any): ChargingHistoryItem => {
          // Вычисляем duration из start_time и stop_time
          const duration =
            session.start_time && session.stop_time
              ? Math.floor(
                  (new Date(session.stop_time).getTime() -
                    new Date(session.start_time).getTime()) /
                    1000,
                )
              : 0;

          // Вычисляем средню и максимальную мощность
          const energyKwh = session.energy || 0;
          const durationHours = duration / 3600;
          const averagePower =
            durationHours > 0 ? energyKwh / durationHours : 0;

          return {
            id: session.id,
            sessionId: session.id,
            stationId: session.station_id,
            stationName: session.stations?.locations?.name || "Станция",
            stationAddress: session.stations?.locations?.address || "",
            connectorId: 1, // TODO: добавить поле connector_id в charging_sessions
            connectorType: "Type 2", // TODO: получать из данных коннектора
            startTime: session.start_time,
            endTime: session.stop_time,
            duration,
            energyConsumed: energyKwh,
            totalCost: session.amount || 0,
            averagePower,
            maxPower: averagePower, // TODO: хранить max_power в БД
            status: session.status === "stopped" ? "completed" : session.status,
            limitType: session.limit_type,
            limitValue: session.limit_value,
          };
        });
      } catch (error) {
        console.error("Failed to fetch charging history:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Хук для получения истории транзакций
export const useTransactionHistory = (limit: number = 50) => {
  return useQuery({
    queryKey: ["transaction-history", limit],
    queryFn: async (): Promise<TransactionHistoryItem[]> => {
      try {
        // Получаем историю транзакций напрямую через evpowerApi
        const data = await unifiedApi.getTransactionHistory(limit);

        if (!data || data.length === 0) {
          return [];
        }

        // Преобразуем данные в TransactionHistoryItem
        return data.map((tx: any): TransactionHistoryItem => {
          // Определяем тип транзакции на основе transaction_type
          let type: "topup" | "charge" | "refund" = "charge";
          if (tx.transaction_type === "balance_topup") {
            type = "topup";
          } else if (tx.transaction_type === "charge_refund") {
            type = "refund";
          }

          return {
            id: tx.id.toString(),
            type,
            amount: parseFloat(tx.amount),
            balance_before: parseFloat(tx.balance_before),
            balance_after: parseFloat(tx.balance_after),
            timestamp: tx.created_at,
            description: tx.description || `Транзакция ${type}`,
            status: "success", // TODO: добавить поле status в таблицу
            sessionId: tx.charging_session_id,
            paymentMethod: "qr_odengi", // TODO: определять по данным
          };
        });
      } catch (error) {
        console.error("Failed to fetch transaction history:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Хук для получения статистики использования
export const useUsageStatistics = () => {
  return useQuery({
    queryKey: ["usage-statistics"],
    queryFn: async (): Promise<UsageStatistics> => {
      try {
        // Получаем историю зарядок для расчета статистики
        const chargingHistory = await unifiedApi.getChargingHistory(100);

        if (!chargingHistory || chargingHistory.length === 0) {
          return {
            totalSessions: 0,
            totalEnergy: 0,
            totalCost: 0,
            totalDuration: 0,
            averageSessionEnergy: 0,
            averageSessionCost: 0,
            averageSessionDuration: 0,
            monthlyData: [],
          };
        }

        // Вычисляем статистику из реальных данных
        const totalEnergy = chargingHistory.reduce(
          (sum: number, session: any) => sum + (session.energy || 0),
          0,
        );
        const totalCost = chargingHistory.reduce(
          (sum: number, session: any) => sum + (session.amount || 0),
          0,
        );

        // Вычисляем общую длительность в минутах
        const totalDuration = chargingHistory.reduce(
          (sum: number, session: any) => {
            if (session.start_time && session.stop_time) {
              const duration =
                (new Date(session.stop_time).getTime() -
                  new Date(session.start_time).getTime()) /
                1000 /
                60;
              return sum + duration;
            }
            return sum;
          },
          0,
        );

        // Находим любимую станцию
        const stationCounts = chargingHistory.reduce(
          (acc: Record<string, any>, session: any) => {
            const stationId = session.station_id;
            if (!acc[stationId]) {
              acc[stationId] = {
                id: stationId,
                name: session.stations?.locations?.name || "Станция",
                count: 0,
              };
            }
            acc[stationId].count++;
            return acc;
          },
          {},
        );

        const favoriteStation = Object.values(stationCounts).reduce(
          (max: any, station: any) =>
            station.count > (max?.count || 0) ? station : max,
          null,
        ) as { id: string; name: string; count: number } | null;

        // Группируем по месяцам
        const monthlyGroups = chargingHistory.reduce(
          (acc: Record<string, any>, session: any) => {
            const date = new Date(session.start_time);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            const monthName = date.toLocaleDateString("ru-RU", {
              month: "long",
              year: "numeric",
            });

            if (!acc[monthKey]) {
              acc[monthKey] = {
                month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                sessions: 0,
                energy: 0,
                cost: 0,
              };
            }

            acc[monthKey].sessions++;
            acc[monthKey].energy += session.energy || 0;
            acc[monthKey].cost += session.amount || 0;

            return acc;
          },
          {},
        );

        const monthlyData = Object.values(monthlyGroups).reverse().slice(0, 6);

        return {
          totalSessions: chargingHistory.length,
          totalEnergy,
          totalCost,
          totalDuration,
          averageSessionEnergy:
            chargingHistory.length > 0
              ? totalEnergy / chargingHistory.length
              : 0,
          averageSessionCost:
            chargingHistory.length > 0 ? totalCost / chargingHistory.length : 0,
          averageSessionDuration:
            chargingHistory.length > 0
              ? totalDuration / chargingHistory.length
              : 0,
          favoriteStation: favoriteStation
            ? {
                id: favoriteStation.id,
                name: favoriteStation.name,
                visitsCount: favoriteStation.count,
              }
            : undefined,
          monthlyData: monthlyData as Array<{
            month: string;
            sessions: number;
            energy: number;
            cost: number;
          }>,
        };
      } catch (error) {
        console.error("Failed to fetch usage statistics:", error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 минут
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
