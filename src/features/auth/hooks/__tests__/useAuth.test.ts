import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSignIn, useSignUp, useLogout, useAuthStatus } from "../useAuth";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../store";
import React from "react";

// Мокаем зависимости
vi.mock("../../services/authService");
vi.mock("../../store");
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

describe("useAuth hooks", () => {
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

  describe("useSignIn", () => {
    it("должен успешно авторизовать пользователя с email", async () => {
      const mockUser = {
        id: "test-id",
        email: "test@example.com",
        name: "Test User",
        balance: 100,
      };

      const mockLogin = vi.fn();
      (useAuthStore as any).mockReturnValue({ login: mockLogin });

      (authService.signInWithEmail as any).mockResolvedValue({
        success: true,
        client: mockUser,
      });

      const { result } = renderHook(() => useSignIn(), { wrapper });

      await act(async () => {
        result.current.mutate({
          email: "test@example.com",
          password: "password123",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.signInWithEmail).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
      );
      expect(mockLogin).toHaveBeenCalled();
    });

    it("должен успешно авторизовать пользователя с телефоном", async () => {
      const mockUser = {
        id: "test-id",
        phone: "+996700123456",
        name: "Test User",
        balance: 100,
      };

      const mockLogin = vi.fn();
      (useAuthStore as any).mockReturnValue({ login: mockLogin });

      (authService.signInWithPhone as any).mockResolvedValue({
        success: true,
        client: mockUser,
      });

      const { result } = renderHook(() => useSignIn(), { wrapper });

      await act(async () => {
        result.current.mutate({
          phone: "+996700123456",
          password: "password123",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.signInWithPhone).toHaveBeenCalledWith(
        "+996700123456",
        "password123",
      );
      expect(mockLogin).toHaveBeenCalled();
    });

    it("должен обработать ошибку при неудачной авторизации", async () => {
      (useAuthStore as any).mockReturnValue({ login: vi.fn() });
      (authService.signInWithEmail as any).mockRejectedValue(
        new Error("Invalid credentials"),
      );

      const { result } = renderHook(() => useSignIn(), { wrapper });

      await act(async () => {
        result.current.mutate({
          email: "test@example.com",
          password: "wrongpassword",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Invalid credentials");
    });
  });

  describe("useSignUp", () => {
    it("должен успешно зарегистрировать нового пользователя", async () => {
      const mockUser = {
        id: "new-user-id",
        email: "newuser@example.com",
        phone: "+996700123456",
        name: "New User",
        balance: 0,
      };

      const mockLogin = vi.fn();
      (useAuthStore as any).mockReturnValue({ login: mockLogin });

      (authService.signUpWithEmail as any).mockResolvedValue({
        success: true,
        client: mockUser,
      });

      const { result } = renderHook(() => useSignUp(), { wrapper });

      await act(async () => {
        result.current.mutate({
          email: "newuser@example.com",
          phone: "+996700123456",
          password: "password123",
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.signUpWithEmail).toHaveBeenCalledWith(
        "newuser@example.com",
        "password123",
        "+996700123456",
      );
      expect(mockLogin).toHaveBeenCalled();
    });

    it("должен обработать ошибку при регистрации", async () => {
      (useAuthStore as any).mockReturnValue({ login: vi.fn() });
      (authService.signUpWithEmail as any).mockRejectedValue(
        new Error("Email already exists"),
      );

      const { result } = renderHook(() => useSignUp(), { wrapper });

      await act(async () => {
        result.current.mutate({
          email: "existing@example.com",
          phone: "+996700123456",
          password: "password123",
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error?.message).toBe("Email already exists");
    });
  });

  describe("useLogout", () => {
    it("должен успешно выйти из системы", async () => {
      const mockLogout = vi.fn();
      (useAuthStore as any).mockReturnValue({ logout: mockLogout });
      (authService.signOut as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogout(), { wrapper });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.signOut).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe("useAuthStatus", () => {
    it("должен вернуть статус авторизации и данные пользователя", () => {
      const mockUser = {
        id: "user-id",
        email: "user@example.com",
        phone: "+996700123456",
        name: "Test User",
      };

      (useAuthStore as any).mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
        isInitialized: true,
      });

      const { result } = renderHook(() => useAuthStatus());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.phone).toBe("+996700123456");
      expect(result.current.isLoading).toBe(false);
    });

    it("должен вернуть false для неавторизованного пользователя", () => {
      (useAuthStore as any).mockReturnValue({
        isAuthenticated: false,
        user: null,
        isInitialized: true,
      });

      const { result } = renderHook(() => useAuthStatus());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.phone).toBeNull();
    });
  });
});
