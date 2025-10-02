import { useQuery } from '@tanstack/react-query';
import { evpowerApi, unifiedApi } from '@/services/evpowerApi';
import type { UnifiedChargingSession, UnifiedTransaction } from '../../auth/types/unified.types';
import type { ChargingHistoryItem, TransactionHistoryItem, UsageStatistics } from '../types';

// Мок данные для демонстрации (в будущем заменить на реальный API)
const mockChargingHistory: ChargingHistoryItem[] = [
  {
    id: '1',
    sessionId: 'sess_001',
    stationId: 'EVI-0011',
    stationName: 'ТЦ Азия Молл',
    stationAddress: 'ул. Киевская 148',
    connectorId: 1,
    connectorType: 'Type 2',
    startTime: '2024-01-15T14:30:00Z',
    endTime: '2024-01-15T15:45:00Z',
    duration: 4500,
    energyConsumed: 22.5,
    totalCost: 382.5,
    averagePower: 18.0,
    maxPower: 22.0,
    status: 'completed',
    limitType: 'energy',
    limitValue: 25
  },
  {
    id: '2',
    sessionId: 'sess_002',
    stationId: 'EVI-0012',
    stationName: 'Гипермаркет Глобус',
    stationAddress: 'пр. Чуй 150/1',
    connectorId: 2,
    connectorType: 'CCS2',
    startTime: '2024-01-14T10:15:00Z',
    endTime: '2024-01-14T10:45:00Z',
    duration: 1800,
    energyConsumed: 35.2,
    totalCost: 598.4,
    averagePower: 70.4,
    maxPower: 80.0,
    status: 'completed',
    limitType: 'amount',
    limitValue: 600
  },
  {
    id: '3',
    sessionId: 'sess_003',
    stationId: 'EVI-0013',
    stationName: 'Парковка Площадь Ала-Тоо',
    stationAddress: 'пл. Ала-Тоо 1',
    connectorId: 1,
    connectorType: 'Type 2',
    startTime: '2024-01-13T18:00:00Z',
    endTime: '2024-01-13T19:30:00Z',
    duration: 5400,
    energyConsumed: 28.8,
    totalCost: 489.6,
    averagePower: 19.2,
    maxPower: 22.0,
    status: 'completed',
    limitType: 'none'
  }
];

const mockTransactionHistory: TransactionHistoryItem[] = [
  {
    id: 't1',
    type: 'topup',
    amount: 500,
    balance_before: 150,
    balance_after: 650,
    timestamp: '2024-01-15T14:00:00Z',
    description: 'Пополнение через O!Dengi',
    status: 'success',
    paymentMethod: 'qr_odengi'
  },
  {
    id: 't2',
    type: 'charge',
    amount: -382.5,
    balance_before: 650,
    balance_after: 267.5,
    timestamp: '2024-01-15T15:45:00Z',
    description: 'Зарядка на ТЦ Азия Молл',
    status: 'success',
    sessionId: 'sess_001'
  },
  {
    id: 't3',
    type: 'topup',
    amount: 1000,
    balance_before: 267.5,
    balance_after: 1267.5,
    timestamp: '2024-01-14T09:30:00Z',
    description: 'Пополнение через O!Dengi',
    status: 'success',
    paymentMethod: 'qr_odengi'
  },
  {
    id: 't4',
    type: 'charge',
    amount: -598.4,
    balance_before: 1267.5,
    balance_after: 669.1,
    timestamp: '2024-01-14T10:45:00Z',
    description: 'Зарядка на Гипермаркет Глобус',
    status: 'success',
    sessionId: 'sess_002'
  }
];

// Хук для получения истории зарядок
export const useChargingHistory = (limit: number = 50) => {
  return useQuery({
    queryKey: ['charging-history', limit],
    queryFn: async (): Promise<ChargingHistoryItem[]> => {
      try {
        // Получаем историю напрямую через evpowerApi
        const data = await unifiedApi.getChargingHistory(limit);

        if (!data || data.length === 0) {
          // Возвращаем мок данные если нет данных
          return mockChargingHistory;
        }

        // Преобразуем данные в ChargingHistoryItem
        return data.map((session: any): ChargingHistoryItem => ({
          id: session.id,
          sessionId: session.id,
          stationId: session.station_id,
          stationName: session.stations?.locations?.name || 'Станция',
          stationAddress: session.stations?.locations?.address || '',
          connectorId: session.connector_id,
          connectorType: 'Type 2', // TODO: получать из данных станции
          startTime: session.created_at,
          endTime: session.end_time,
          duration: session.duration || 0,
          energyConsumed: session.energy_consumed || 0,
          totalCost: session.total_cost || 0,
          averagePower: session.average_power || 0,
          maxPower: session.max_power || 0,
          status: session.status || 'completed',
          limitType: session.limit_type,
          limitValue: session.limit_value
        }));
      } catch (error) {
        console.error('Failed to fetch charging history:', error);
        // В случае ошибки возвращаем мок данные
        return mockChargingHistory;
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
    queryKey: ['transaction-history', limit],
    queryFn: async (): Promise<TransactionHistoryItem[]> => {
      try {
        // Получаем историю транзакций напрямую через evpowerApi
        const data = await unifiedApi.getTransactionHistory(limit);

        if (!data || data.length === 0) {
          // Возвращаем мок данные если нет данных
          return mockTransactionHistory;
        }

        // Преобразуем данные в TransactionHistoryItem
        return data.map((tx: any): TransactionHistoryItem => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          balance_before: tx.balance_before,
          balance_after: tx.balance_after,
          timestamp: tx.created_at,
          description: tx.description,
          status: tx.status,
          sessionId: tx.session_id,
          paymentMethod: tx.payment_method
        }));
      } catch (error) {
        console.error('Failed to fetch transaction history:', error);
        // В случае ошибки возвращаем мок данные
        return mockTransactionHistory;
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
    queryKey: ['usage-statistics'],
    queryFn: async (): Promise<UsageStatistics> => {
      try {
        // Получаем историю зарядок для расчета статистики
        const chargingHistory = await unifiedApi.getChargingHistory(100);

        if (!chargingHistory || chargingHistory.length === 0) {
          // Используем мок данные если API недоступен
          const totalEnergy = mockChargingHistory.reduce((sum, item) => sum + item.energyConsumed, 0);
          const totalCost = mockChargingHistory.reduce((sum, item) => sum + item.totalCost, 0);
          const totalDuration = mockChargingHistory.reduce((sum, item) => sum + item.duration, 0) / 60;

          return {
            totalSessions: mockChargingHistory.length,
            totalEnergy,
            totalCost,
            totalDuration,
            averageSessionEnergy: totalEnergy / mockChargingHistory.length,
            averageSessionCost: totalCost / mockChargingHistory.length,
            averageSessionDuration: totalDuration / mockChargingHistory.length,
            favoriteStation: {
              id: 'EVI-0011',
              name: 'ТЦ Азия Молл',
              visitsCount: 5
            },
            monthlyData: [
              { month: 'Декабрь', sessions: 8, energy: 180.5, cost: 3069 },
              { month: 'Январь', sessions: 3, energy: 86.5, cost: 1470.5 }
            ]
          };
        }

        const totalEnergy = chargingHistory.reduce((sum: number, item: any) => sum + (item.energy_consumed || 0), 0);
        const totalCost = chargingHistory.reduce((sum: number, item: any) => sum + (item.total_cost || 0), 0);
        const totalDuration = chargingHistory.reduce((sum: number, item: any) => sum + (item.duration || 0), 0) / 60;

        return {
          totalSessions: chargingHistory.length,
          totalEnergy,
          totalCost,
          totalDuration,
          averageSessionEnergy: chargingHistory.length > 0 ? totalEnergy / chargingHistory.length : 0,
          averageSessionCost: chargingHistory.length > 0 ? totalCost / chargingHistory.length : 0,
          averageSessionDuration: chargingHistory.length > 0 ? totalDuration / chargingHistory.length : 0,
          monthlyData: []
        };
      } catch (error) {
        console.error('Failed to fetch usage statistics:', error);
        return {
          totalSessions: 0,
          totalEnergy: 0,
          totalCost: 0,
          totalDuration: 0,
          averageSessionEnergy: 0,
          averageSessionCost: 0,
          averageSessionDuration: 0,
          monthlyData: []
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 минут
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};