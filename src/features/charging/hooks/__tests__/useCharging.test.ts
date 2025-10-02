import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStartCharging, useStopCharging, useChargingSession } from '../useCharging';
import { chargingService } from '../../services/chargingService';
import React from 'react';

vi.mock('../../services/chargingService');
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('useCharging hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('useStartCharging', () => {
    it('должен успешно начать зарядку', async () => {
      const mockSession = {
        id: 'session-123',
        stationId: 'station-1',
        connectorId: 1,
        status: 'active',
        startTime: new Date().toISOString(),
      };

      (chargingService.startCharging as any).mockResolvedValue({
        success: true,
        session: mockSession,
      });

      const { result } = renderHook(() => useStartCharging(), { wrapper });

      await act(async () => {
        result.current.mutate({
          stationId: 'station-1',
          connectorId: 1,
          limitType: 'energy',
          limitValue: 10,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(chargingService.startCharging).toHaveBeenCalledWith({
        stationId: 'station-1',
        connectorId: 1,
        limitType: 'energy',
        limitValue: 10,
      });
    });

    it('должен обработать ошибку при недоступной станции', async () => {
      (chargingService.startCharging as any).mockRejectedValue(
        new Error('Station unavailable')
      );

      const { result } = renderHook(() => useStartCharging(), { wrapper });

      await act(async () => {
        result.current.mutate({
          stationId: 'station-1',
          connectorId: 1,
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Station unavailable');
    });

    it('должен применить лимиты зарядки', async () => {
      const mockSession = {
        id: 'session-456',
        limitType: 'amount',
        limitValue: 500,
      };

      (chargingService.startCharging as any).mockResolvedValue({
        success: true,
        session: mockSession,
      });

      const { result } = renderHook(() => useStartCharging(), { wrapper });

      await act(async () => {
        result.current.mutate({
          stationId: 'station-2',
          connectorId: 2,
          limitType: 'amount',
          limitValue: 500,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(chargingService.startCharging).toHaveBeenCalledWith(
        expect.objectContaining({
          limitType: 'amount',
          limitValue: 500,
        })
      );
    });
  });

  describe('useStopCharging', () => {
    it('должен успешно остановить зарядку', async () => {
      (chargingService.stopCharging as any).mockResolvedValue({
        success: true,
        session: {
          id: 'session-123',
          status: 'completed',
          totalEnergy: 15.5,
          totalCost: 263.5,
        },
      });

      const { result } = renderHook(() => useStopCharging(), { wrapper });

      await act(async () => {
        result.current.mutate('session-123');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(chargingService.stopCharging).toHaveBeenCalledWith('session-123');
    });

    it('должен обработать ошибку при остановке', async () => {
      (chargingService.stopCharging as any).mockRejectedValue(
        new Error('Failed to stop charging')
      );

      const { result } = renderHook(() => useStopCharging(), { wrapper });

      await act(async () => {
        result.current.mutate('session-123');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Failed to stop charging');
    });
  });

  describe('useChargingSession', () => {
    it('должен получить активную сессию зарядки', async () => {
      const mockSession = {
        id: 'session-789',
        stationId: 'station-3',
        status: 'active',
        currentPower: 22,
        energyDelivered: 5.2,
        duration: 900,
        cost: 88.4,
      };

      (chargingService.getActiveSession as any).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useChargingSession('session-789'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockSession);
      expect(chargingService.getActiveSession).toHaveBeenCalledWith('session-789');
    });

    it('должен обновлять данные сессии с интервалом', async () => {
      let callCount = 0;
      const mockSession = {
        id: 'session-789',
        energyDelivered: 5.2,
      };

      (chargingService.getActiveSession as any).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ...mockSession,
          energyDelivered: mockSession.energyDelivered + callCount,
        });
      });

      const { result } = renderHook(() => useChargingSession('session-789'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const initialEnergy = result.current.data?.energyDelivered;

      // Ждем обновления (refetchInterval установлен в хуке)
      await waitFor(
        () => {
          expect(chargingService.getActiveSession).toHaveBeenCalledTimes(2);
        },
        { timeout: 4000 }
      );

      expect(result.current.data?.energyDelivered).toBeGreaterThan(initialEnergy!);
    });

    it('должен вернуть null для несуществующей сессии', async () => {
      (chargingService.getActiveSession as any).mockResolvedValue(null);

      const { result } = renderHook(() => useChargingSession('non-existent'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('должен обработать ошибку при получении сессии', async () => {
      (chargingService.getActiveSession as any).mockRejectedValue(
        new Error('Session not found')
      );

      const { result } = renderHook(() => useChargingSession('session-404'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe('Session not found');
    });
  });
});