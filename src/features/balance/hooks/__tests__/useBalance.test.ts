import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useBalance,
  useQRTopup as useTopUpBalance,
  usePaymentStatus,
} from "../useBalance";
import { balanceService } from "../../services/balanceService";
import { useAuthStore } from "../../../auth/store";
import React from "react";

vi.mock("../../services/balanceService");
vi.mock("../../../auth/store", () => ({ useAuthStore: vi.fn() }));

describe("useBalance hooks", () => {
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

  describe("useBalance", () => {
    it("должен получить текущий баланс пользователя", async () => {
      const mockUser = {
        id: "user-123",
        balance: 1500.5,
      };

      (useAuthStore as any).mockReturnValue({
        user: mockUser,
      });

      (balanceService.getBalance as any).mockResolvedValue({
        balance: 1500.5,
        currency: "KGS",
      });

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        balance: 1500.5,
        currency: "KGS",
      });
      expect(balanceService.getBalance).toHaveBeenCalledWith("user-123");
    });

    it("должен вернуть 0 для неавторизованного пользователя", async () => {
      (useAuthStore as any).mockReturnValue({
        user: null,
      });

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBeUndefined();
      });

      expect(balanceService.getBalance).not.toHaveBeenCalled();
    });

    it("должен обработать ошибку при получении баланса", async () => {
      const mockUser = { id: "user-123" };
      (useAuthStore as any).mockReturnValue({ user: mockUser });

      (balanceService.getBalance as any).mockRejectedValue(
        new Error("Network error"),
      );

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Network error");
    });

    it("должен обновлять баланс с интервалом", async () => {
      const mockUser = { id: "user-123" };
      (useAuthStore as any).mockReturnValue({ user: mockUser });

      let callCount = 0;
      (balanceService.getBalance as any).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          balance: 1000 + callCount * 100,
          currency: "KGS",
        });
      });

      const { result } = renderHook(() => useBalance(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const initialBalance = result.current.data?.balance;

      await result.current.refetch?.();

      await waitFor(() => {
        expect(balanceService.getBalance).toHaveBeenCalledTimes(2);
        expect(result.current.data?.balance).toBe(1200);
      });
    });
  });

  describe("useTopUpBalance", () => {
    it("должен успешно создать QR код для пополнения", async () => {
      const mockQRData = {
        qrCode: "data:image/png;base64,iVBORw0KGgoAAAANS...",
        paymentId: "payment-456",
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      (balanceService.generateTopUpQR as any).mockResolvedValue(mockQRData);
      (useAuthStore as any).mockReturnValue({ user: { id: "user-123" } });

      const { result } = renderHook(() => useTopUpBalance(), { wrapper });

      await act(async () => {
        result.current.mutate({ amount: 500 });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockQRData);
      expect(balanceService.generateTopUpQR).toHaveBeenCalledWith(500);
    });

    it("должен обработать ошибку при создании QR кода", async () => {
      (useAuthStore as any).mockReturnValue({ user: { id: "user-123" } });

      (balanceService.generateTopUpQR as any).mockRejectedValue(
        new Error("Invalid amount"),
      );

      const { result } = renderHook(() => useTopUpBalance(), { wrapper });

      await act(async () => {
        result.current.mutate({ amount: -100 });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Invalid amount");
    });

    it("должен проверить минимальную сумму пополнения", async () => {
      (useAuthStore as any).mockReturnValue({ user: { id: "user-123" } });

      (balanceService.generateTopUpQR as any).mockRejectedValue(
        new Error("Minimum amount is 50 KGS"),
      );

      const { result } = renderHook(() => useTopUpBalance(), { wrapper });

      await act(async () => {
        result.current.mutate({ amount: 10 });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Minimum amount is 50 KGS");
    });
  });

  describe("usePaymentStatus", () => {
    it("должен получить статус платежа", async () => {
      (balanceService.checkPaymentStatus as any).mockResolvedValue({
        status: "pending",
        amount: 500,
        createdAt: new Date().toISOString(),
      });

      const { result } = renderHook(() => usePaymentStatus("payment-789"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual({
        status: "pending",
        amount: 500,
        createdAt: expect.any(String),
      });
      expect(balanceService.checkPaymentStatus).toHaveBeenCalledWith(
        "payment-789",
      );
    });

    it("должен определить успешный платеж", async () => {
      (balanceService.checkPaymentStatus as any).mockResolvedValue({
        status: "success",
        amount: 500,
        completedAt: new Date().toISOString(),
      });

      const { result } = renderHook(() => usePaymentStatus("payment-success"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.status).toBe("success");
    });

    it("должен определить неудачный платеж", async () => {
      (balanceService.checkPaymentStatus as any).mockResolvedValue({
        status: "failed",
        error: "Insufficient funds",
      });

      const { result } = renderHook(() => usePaymentStatus("payment-failed"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.status).toBe("failed");
      expect(result.current.data?.error).toBe("Insufficient funds");
    });

    it("должен обновлять статус с интервалом для pending платежей", async () => {
      let callCount = 0;
      const statuses = ["pending", "pending", "success"];

      (balanceService.checkPaymentStatus as any).mockImplementation(() => {
        const status = statuses[callCount] || "success";
        callCount++;
        return Promise.resolve({
          status,
          amount: 500,
        });
      });

      const { result } = renderHook(() => usePaymentStatus("payment-polling"), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data?.status).toBe("pending");
      });

      await result.current.refetch?.();
      await result.current.refetch?.();
      await waitFor(() => {
        expect(result.current.data?.status).toBe("success");
      });

      expect(balanceService.checkPaymentStatus).toHaveBeenCalledTimes(3);
    });

    it("должен не запрашивать статус для пустого paymentId", () => {
      const { result } = renderHook(() => usePaymentStatus(null), { wrapper });

      expect(result.current.data).toBeUndefined();
      expect(balanceService.checkPaymentStatus).not.toHaveBeenCalled();
    });
  });
});
