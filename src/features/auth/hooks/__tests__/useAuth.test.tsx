import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useLogin, useLogout, useAuthStatus } from "../useAuth";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../store";
import React from "react";

// Mock auth service API used by hooks
vi.mock("../../services/authService", () => ({
  authService: {
    signInWithEmail: vi.fn(),
    signInWithPhone: vi.fn(),
    signUpWithEmail: vi.fn(),
    signOut: vi.fn(),
  },
}));

// Mock auth store with login/logout methods expected by hooks
vi.mock("../../store", () => ({
  useAuthStore: vi.fn(() => ({
    login: vi.fn(),
    logout: vi.fn(),
    user: null,
    isAuthenticated: false,
  })),
}));

describe("Auth Hooks", () => {
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

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );

  describe("useLogin", () => {
    it("successfully logs in user", async () => {
      const mockResponse = {
        token: "test-token",
        refreshToken: "refresh-token",
        user: {
          id: "123",
          email: "test@test.com",
          name: "Test User",
        },
      };

      (authService.signInWithEmail as any).mockResolvedValueOnce({
        success: true,
        client: mockResponse.user,
      });

      const { result } = renderHook(() => useLogin(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          email: "test@test.com",
          password: "password123",
        });
      });

      expect(authService.signInWithEmail).toHaveBeenCalledWith(
        "test@test.com",
        "password123",
      );

      expect(result.current.isSuccess).toBe(true);
    });

    it("handles login error correctly", async () => {
      const mockError = new Error("Invalid credentials");
      (authService.signInWithEmail as any).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useLogin(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            email: "wrong@test.com",
            password: "wrong",
          });
        } catch (error) {
          expect(error).toBe(mockError);
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });
  });

  describe("useLogout", () => {
    it("successfully logs out user", async () => {
      (authService.signOut as any).mockResolvedValueOnce(undefined);

      const mockLogout = vi.fn();
      (useAuthStore as any).mockReturnValue({
        logout: mockLogout,
      });

      const { result } = renderHook(() => useLogout(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(authService.signOut).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalled();
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe("useAuthStatus", () => {
    it("returns authenticated user", () => {
      const mockUser = {
        id: "123",
        email: "test@test.com",
        name: "Test User",
      };

      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuthStatus());

      expect(result.current.user).toBe(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("returns null when not authenticated", () => {
      (useAuthStore as any).mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      const { result } = renderHook(() => useAuthStatus());

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
