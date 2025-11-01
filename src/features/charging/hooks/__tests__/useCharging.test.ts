import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useStartCharging,
  useStopCharging,
  useChargingStatus,
} from "../useCharging";
import React from "react";

vi.mock("@/services/evpowerApi", () => ({
  evpowerApi: {
    startCharging: vi.fn(),
    stopCharging: vi.fn(),
    getStationStatus: vi.fn(),
    getChargingStatus: vi.fn(),
  },
}));

describe("useCharging hooks", () => {
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

  describe("useStartCharging", () => {
    it("должен успешно начать зарядку", async () => {
      const { evpowerApi } = await import("@/services/evpowerApi");
      vi.mocked(evpowerApi.getStationStatus as any).mockResolvedValue({
        available_for_charging: true,
      });
      vi.mocked(evpowerApi.startCharging as any).mockResolvedValue({
        success: true,
        session_id: "session-123",
      });

      const { result } = renderHook(() => useStartCharging(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          station_id: "station-1",
          connector_id: 1,
          energy_kwh: 10,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("должен обработать ошибку при недоступной станции", async () => {
      const { evpowerApi } = await import("@/services/evpowerApi");
      vi.mocked(evpowerApi.getStationStatus as any).mockResolvedValue({
        available_for_charging: false,
      });
      vi.mocked(evpowerApi.startCharging as any).mockRejectedValue(
        new Error("Station unavailable"),
      );

      const { result } = renderHook(() => useStartCharging(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            station_id: "station-1",
            connector_id: 1,
          });
        } catch {
          /* ignore */
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useStopCharging", () => {
    it("должен успешно остановить зарядку", async () => {
      const { evpowerApi } = await import("@/services/evpowerApi");
      vi.mocked(evpowerApi.stopCharging as any).mockResolvedValue({
        success: true,
        message: "ok",
      });

      const { result } = renderHook(() => useStopCharging(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ session_id: "session-123" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });

  describe("useChargingStatus", () => {
    it("должен получить статус зарядки", async () => {
      const { evpowerApi } = await import("@/services/evpowerApi");
      vi.mocked(evpowerApi.getChargingStatus as any).mockResolvedValue({
        success: true,
        session: {
          id: "s1",
          status: "started",
          station_id: "st1",
          connector_id: 1,
          start_time: new Date().toISOString(),
          energy_consumed: 1,
          current_cost: 10,
          reserved_amount: 0,
          limit_type: "none",
          limit_reached: false,
          limit_percentage: 0,
          rate_per_kwh: 13.5,
          session_fee: 0,
          charging_duration_minutes: 1,
        },
      });

      const { result } = renderHook(() => useChargingStatus("s1"), { wrapper });

      await waitFor(() => {
        expect(result.current.data?.success).toBe(true);
      });
    });
  });
});
