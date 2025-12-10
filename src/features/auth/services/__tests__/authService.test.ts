/**
 * Auth Service Tests - тесты для сервиса авторизации по телефону + OTP
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Мокаем зависимости перед импортом authService
vi.mock("@/lib/platform/secureStorage", () => ({
  authStorage: {
    setAuthToken: vi.fn(),
    setRefreshToken: vi.fn(),
    setClientId: vi.fn(),
    getAuthToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getClientId: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock("@/lib/platform/push", () => ({
  pushNotificationService: {
    register: vi.fn(),
    unregister: vi.fn(),
  },
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/shared/config/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

vi.mock("../tokenService", () => ({
  tokenService: {
    saveTokens: vi.fn(),
    clearTokens: vi.fn(),
    getRefreshToken: vi.fn(),
    getAccessToken: vi.fn(),
    hasTokens: vi.fn(),
    getUserType: vi.fn(),
    getClientId: vi.fn(),
  },
}));

// Импортируем после моков
import { authService } from "../authService";
import { tokenService } from "../tokenService";

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("sendOtp", () => {
    it("should send OTP successfully", async () => {
      const mockResponse = {
        success: true,
        phone: "+996700123456",
        expires_in_seconds: 300,
        resend_available_in_seconds: 60,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await authService.sendOtp("+996700123456");

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/send-otp"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: "+996700123456" }),
        }),
      );
    });

    it("should normalize phone number formats", async () => {
      const mockResponse = {
        success: true,
        phone: "+996700123456",
        expires_in_seconds: 300,
        resend_available_in_seconds: 60,
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // Тест с разными форматами номера
      await authService.sendOtp("0700123456");
      expect(fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ phone: "+996700123456" }),
        }),
      );

      await authService.sendOtp("996700123456");
      expect(fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ phone: "+996700123456" }),
        }),
      );

      await authService.sendOtp("700123456");
      expect(fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ phone: "+996700123456" }),
        }),
      );
    });

    it("should handle rate limit error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            success: false,
            error: "rate_limit",
            message: "Слишком много запросов. Попробуйте через 60 секунд",
            retry_after_seconds: 60,
          }),
      } as Response);

      await expect(authService.sendOtp("+996700123456")).rejects.toThrow(
        "Слишком много запросов",
      );
    });

    it("should handle network error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            success: false,
            error: "server_error",
            message: "Внутренняя ошибка сервера",
          }),
      } as Response);

      await expect(authService.sendOtp("+996700123456")).rejects.toThrow(
        "Внутренняя ошибка сервера",
      );
    });
  });

  describe("verifyOtp", () => {
    it("should verify OTP and return tokens", async () => {
      const mockResponse = {
        success: true,
        access_token: "mock.access.token",
        refresh_token: "mock.refresh.token",
        token_type: "Bearer",
        expires_in: 3600,
        user: {
          id: "user-123",
          phone: "+996700123456",
          name: "Test User",
          balance: 100,
          status: "active",
          created_at: "2024-01-01T00:00:00Z",
        },
        user_type: "client",
        is_new_user: false,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      vi.mocked(tokenService.saveTokens).mockResolvedValueOnce(undefined);

      const result = await authService.verifyOtp("+996700123456", "123456");

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/auth/verify-otp"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            phone: "+996700123456",
            code: "123456",
          }),
        }),
      );
      // Проверяем что tokenService.saveTokens был вызван с правильными параметрами
      expect(tokenService.saveTokens).toHaveBeenCalledWith({
        accessToken: "mock.access.token",
        refreshToken: "mock.refresh.token",
        expiresIn: 3600,
      });
    });

    it("should handle invalid OTP error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: "invalid_code",
            message: "Неверный код",
          }),
      } as Response);

      await expect(
        authService.verifyOtp("+996700123456", "000000"),
      ).rejects.toThrow("Неверный код");
    });

    it("should handle expired OTP error", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            success: false,
            error: "code_expired",
            message: "Код истек. Запросите новый",
          }),
      } as Response);

      await expect(
        authService.verifyOtp("+996700123456", "123456"),
      ).rejects.toThrow("Код истек");
    });
  });

  describe("signOut", () => {
    it("should clear tokens on sign out", async () => {
      vi.mocked(tokenService.getRefreshToken).mockResolvedValueOnce(
        "mock.refresh.token",
      );
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await authService.signOut();

      expect(tokenService.clearTokens).toHaveBeenCalled();
    });

    it("should handle logout API failure gracefully", async () => {
      vi.mocked(tokenService.getRefreshToken).mockResolvedValueOnce(
        "mock.refresh.token",
      );
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

      // Не должен выбрасывать ошибку - все равно очищает токены
      await expect(authService.signOut()).resolves.not.toThrow();
      expect(tokenService.clearTokens).toHaveBeenCalled();
    });
  });

  describe("isAuthenticated", () => {
    it("should return true when tokens exist", async () => {
      vi.mocked(tokenService.hasTokens).mockResolvedValueOnce(true);

      const result = await authService.isAuthenticated();
      expect(result).toBe(true);
    });

    it("should return false when no tokens", async () => {
      vi.mocked(tokenService.hasTokens).mockResolvedValueOnce(false);

      const result = await authService.isAuthenticated();
      expect(result).toBe(false);
    });
  });
});
