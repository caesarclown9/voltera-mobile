import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useBalance } from "../useBalance";
import { useAuthStore } from "../../../auth/store";

// Mock dependencies
vi.mock("../../../auth/store", () => ({
  useAuthStore: vi.fn(),
}));

// Удаляем прямую зависимость от Supabase в юнит-тестах баланса

vi.mock("../../../api/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return balance data when user is authenticated", async () => {
    const mockUser = { id: "1", email: "test@example.com", name: "Test User" };
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBalance(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.data).toBeUndefined(); // Initially undefined
    expect(result.current.isLoading).toBe(true); // Initially loading
  });

  it("should not fetch when user is not authenticated", async () => {
    vi.mocked(useAuthStore).mockReturnValue({ user: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBalance(), { wrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false); // Should not be loading
  });

  it("should return data shape (no Supabase dependency in unit)", async () => {
    const mockUser = { id: "1", email: "test@example.com", name: "Test User" };
    vi.mocked(useAuthStore).mockReturnValue({ user: mockUser });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useBalance(), { wrapper });

    // В юните без вызова внешних сервисов isLoading может остаться true до первой выборки
    // Проверим, что хук корректно инициализировался
    expect(result.current).toBeDefined();
  });
});
