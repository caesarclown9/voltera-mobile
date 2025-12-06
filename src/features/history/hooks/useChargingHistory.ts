import { useQuery } from "@tanstack/react-query";
import { evpowerApi } from "@/services/evpowerApi";
import type {
  ChargingHistoryItem,
  TransactionHistoryItem,
  UsageStatistics,
} from "../types";

interface ChargingSessionData {
  id: string;
  station_id: string;
  start_time: string;
  stop_time: string | null;
  status: string;
  energy: number;
  amount: number;
  limit_type?: string;
  limit_value?: number;
  stations?: {
    locations?: {
      name?: string;
      address?: string;
    };
  };
}

interface TransactionData {
  id: number;
  transaction_type: string;
  amount: string | number;
  balance_before: string | number;
  balance_after: string | number;
  created_at: string;
  description?: string;
  charging_session_id?: string;
}

interface StationCounts {
  [stationId: string]: {
    id: string;
    name: string;
    count: number;
  };
}

interface MonthlyGroups {
  [monthKey: string]: {
    month: string;
    sessions: number;
    energy: number;
    cost: number;
  };
}

interface UseChargingHistoryOptions {
  limit?: number;
  enabled?: boolean;
}

// Хук для получения истории зарядок
export const useChargingHistory = (options: UseChargingHistoryOptions = {}) => {
  const { limit = 50, enabled = true } = options;

  return useQuery({
    queryKey: ["charging-history", limit],
    queryFn: async (): Promise<ChargingHistoryItem[]> => {
      try {
        // Получаем историю напрямую через evpowerApi
        const data = await evpowerApi.getChargingHistory(limit);

        if (!data || data.length === 0) {
          return [];
        }

        // Преобразуем данные в ChargingHistoryItem
        return data.map((session: ChargingSessionData): ChargingHistoryItem => {
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

          // Нормализуем статус
          let normalizedStatus: "completed" | "stopped" | "failed";
          if (session.status === "stopped" || session.status === "completed") {
            normalizedStatus = "completed";
          } else if (
            session.status === "error" ||
            session.status === "failed"
          ) {
            normalizedStatus = "failed";
          } else {
            normalizedStatus = "stopped";
          }

          return {
            id: session.id,
            sessionId: session.id,
            stationId: session.station_id,
            stationName: session.stations?.locations?.name || "Станция",
            stationAddress: session.stations?.locations?.address || "",
            connectorId: 1, // TODO: добавить поле connector_id в charging_sessions
            connectorType: "Type 2", // TODO: получать из данных коннектора
            startTime: session.start_time,
            endTime: session.stop_time || "",
            duration,
            energyConsumed: energyKwh,
            totalCost: session.amount || 0,
            averagePower,
            maxPower: averagePower, // TODO: хранить max_power в БД
            status: normalizedStatus,
            stopReason: undefined,
            limitType: session.limit_type as
              | "energy"
              | "amount"
              | "none"
              | undefined,
            limitValue: session.limit_value,
          };
        });
      } catch (error) {
        console.error("Failed to fetch charging history:", error);
        throw error;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

interface UseTransactionHistoryOptions {
  limit?: number;
  enabled?: boolean;
}

// Хук для получения истории транзакций
export const useTransactionHistory = (options: UseTransactionHistoryOptions = {}) => {
  const { limit = 50, enabled = true } = options;

  return useQuery({
    queryKey: ["transaction-history", limit],
    queryFn: async (): Promise<TransactionHistoryItem[]> => {
      try {
        // Получаем историю транзакций напрямую через evpowerApi
        const data = await evpowerApi.getTransactionHistory(limit);

        if (!data || data.length === 0) {
          return [];
        }

        // Преобразуем данные в TransactionHistoryItem
        return data.map((tx: TransactionData): TransactionHistoryItem => {
          // Определяем тип и статус транзакции на основе transaction_type
          let type: "topup" | "charge" | "refund" = "charge";
          let status: "success" | "pending" | "failed" = "success";

          if (tx.transaction_type === "balance_topup") {
            type = "topup";
          } else if (tx.transaction_type === "balance_topup_canceled") {
            type = "topup";
            status = "failed"; // Отмененные транзакции
          } else if (tx.transaction_type === "charge_refund") {
            type = "refund";
          }

          // Безопасный парсинг числовых значений
          const parseAmount = (
            value: string | number | null | undefined,
          ): number => {
            if (value === null || value === undefined || value === "") return 0;
            const parsed =
              typeof value === "number" ? value : parseFloat(value);
            return isNaN(parsed) ? 0 : parsed;
          };

          return {
            id: tx.id.toString(),
            type,
            amount: parseAmount(tx.amount),
            balance_before: parseAmount(tx.balance_before),
            balance_after: parseAmount(tx.balance_after),
            timestamp: tx.created_at,
            description: tx.description || `Транзакция ${type}`,
            status,
            sessionId: tx.charging_session_id,
            paymentMethod: "qr_odengi", // TODO: определять по данным
          };
        });
      } catch (error) {
        console.error("Failed to fetch transaction history:", error);
        throw error;
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

interface UseUsageStatisticsOptions {
  enabled?: boolean;
  chargingHistory?: ChargingHistoryItem[]; // Можно передать уже загруженные данные
}

// Хук для получения статистики использования
export const useUsageStatistics = (options: UseUsageStatisticsOptions = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["usage-statistics"],
    queryFn: async (): Promise<UsageStatistics> => {
      try {
        // Получаем историю зарядок для расчета статистики
        const chargingHistory = await evpowerApi.getChargingHistory(100);

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
          (sum: number, session: ChargingSessionData) =>
            sum + (session.energy || 0),
          0,
        );
        const totalCost = chargingHistory.reduce(
          (sum: number, session: ChargingSessionData) =>
            sum + (session.amount || 0),
          0,
        );

        // Вычисляем общую длительность в минутах
        const totalDuration = chargingHistory.reduce(
          (sum: number, session: ChargingSessionData) => {
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
          (acc: StationCounts, session: ChargingSessionData) => {
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

        const stationValues = Object.values(stationCounts) as Array<{
          id: string;
          name: string;
          count: number;
        }>;
        const favoriteStation: {
          id: string;
          name: string;
          count: number;
        } | null =
          stationValues.length > 0
            ? stationValues.reduce((max, station) =>
                station.count > max.count ? station : max,
              )
            : null;

        // Группируем по месяцам
        const monthlyGroups = chargingHistory.reduce(
          (acc: MonthlyGroups, session: ChargingSessionData) => {
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
    enabled,
    staleTime: 10 * 60 * 1000, // 10 минут
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
