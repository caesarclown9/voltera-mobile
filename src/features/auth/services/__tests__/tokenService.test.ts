/**
 * Token Service Tests - тесты для управления JWT токенами
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Мокаем зависимости перед импортом
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

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Создаем валидный JWT для тестов
function createMockJwt(payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };
  const base64Header = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const base64Payload = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const signature = "mock_signature";
  return `${base64Header}.${base64Payload}.${signature}`;
}

// Импортируем после моков
import { tokenService } from "../tokenService";
import { authStorage } from "@/lib/platform/secureStorage";

describe("TokenService", () => {
  const mockPayload = {
    sub: "user-123",
    type: "client",
    phone: "+996700123456",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const mockAccessToken = createMockJwt(mockPayload);
  const mockRefreshToken = "mock.refresh.token";

  // Создаем реальный sessionStorage для тестов
  let realSessionStorage: Storage;

  beforeEach(() => {
    vi.clearAllMocks();

    // Используем реальную реализацию sessionStorage вместо мока
    realSessionStorage = {
      _data: {} as Record<string, string>,
      getItem(key: string) {
        return this._data[key] ?? null;
      },
      setItem(key: string, value: string) {
        this._data[key] = value;
      },
      removeItem(key: string) {
        delete this._data[key];
      },
      clear() {
        this._data = {};
      },
      get length() {
        return Object.keys(this._data).length;
      },
      key(index: number) {
        return Object.keys(this._data)[index] ?? null;
      },
    } as Storage & { _data: Record<string, string> };

    vi.stubGlobal("sessionStorage", realSessionStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("saveTokens", () => {
    it("should save tokens and extract user data from JWT", async () => {
      await tokenService.saveTokens({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: 3600,
      });

      expect(authStorage.setAuthToken).toHaveBeenCalledWith(mockAccessToken);
      expect(authStorage.setRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
      expect(authStorage.setClientId).toHaveBeenCalledWith("user-123");
    });

    it("should store expiry and user type in sessionStorage", async () => {
      await tokenService.saveTokens({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: 3600,
      });

      expect(sessionStorage.getItem("user_type")).toBe("client");
      expect(sessionStorage.getItem("client_id")).toBe("user-123");
      expect(sessionStorage.getItem("access_token_expiry")).toBeTruthy();
    });

    it("should throw error for invalid token", async () => {
      await expect(
        tokenService.saveTokens({
          accessToken: "invalid.token",
          refreshToken: mockRefreshToken,
          expiresIn: 3600,
        }),
      ).rejects.toThrow("Invalid access token");
    });
  });

  describe("getAccessToken", () => {
    it("should return token when valid and not expired", async () => {
      vi.mocked(authStorage.getAuthToken).mockResolvedValueOnce(
        mockAccessToken,
      );

      // Устанавливаем expiry в будущем
      const futureExpiry = Date.now() + 60 * 60 * 1000; // +1 час
      sessionStorage.setItem("access_token_expiry", futureExpiry.toString());

      const token = await tokenService.getAccessToken();
      expect(token).toBe(mockAccessToken);
    });

    it("should return null when no token exists", async () => {
      vi.mocked(authStorage.getAuthToken).mockResolvedValueOnce(null);

      const token = await tokenService.getAccessToken();
      expect(token).toBeNull();
    });
  });

  describe("getRefreshToken", () => {
    it("should return refresh token from storage", async () => {
      vi.mocked(authStorage.getRefreshToken).mockResolvedValueOnce(
        mockRefreshToken,
      );

      const token = await tokenService.getRefreshToken();
      expect(token).toBe(mockRefreshToken);
    });
  });

  describe("getClientId", () => {
    it("should return client ID from sessionStorage cache first", async () => {
      sessionStorage.setItem("client_id", "cached-user-id");

      const clientId = await tokenService.getClientId();
      expect(clientId).toBe("cached-user-id");
      expect(authStorage.getClientId).not.toHaveBeenCalled();
    });

    it("should fall back to secure storage when not in sessionStorage", async () => {
      vi.mocked(authStorage.getClientId).mockResolvedValueOnce(
        "stored-user-id",
      );

      const clientId = await tokenService.getClientId();
      expect(clientId).toBe("stored-user-id");
    });
  });

  describe("getUserType", () => {
    it("should return client type", () => {
      sessionStorage.setItem("user_type", "client");
      expect(tokenService.getUserType()).toBe("client");
    });

    it("should return admin type", () => {
      sessionStorage.setItem("user_type", "admin");
      expect(tokenService.getUserType()).toBe("admin");
    });

    it("should return null for invalid type", () => {
      sessionStorage.setItem("user_type", "invalid");
      expect(tokenService.getUserType()).toBeNull();
    });

    it("should return null when not set", () => {
      expect(tokenService.getUserType()).toBeNull();
    });
  });

  describe("isAccessTokenExpired", () => {
    it("should return true when no expiry set", () => {
      expect(tokenService.isAccessTokenExpired()).toBe(true);
    });

    it("should return true when token is expired", () => {
      const pastExpiry = Date.now() - 1000;
      sessionStorage.setItem("access_token_expiry", pastExpiry.toString());
      expect(tokenService.isAccessTokenExpired()).toBe(true);
    });

    it("should return true when token expires within buffer (5 min)", () => {
      // Токен истекает через 4 минуты (меньше 5-минутного буфера)
      const nearExpiry = Date.now() + 4 * 60 * 1000;
      sessionStorage.setItem("access_token_expiry", nearExpiry.toString());
      expect(tokenService.isAccessTokenExpired()).toBe(true);
    });

    it("should return false when token is valid", () => {
      // Токен истекает через 1 час
      const futureExpiry = Date.now() + 60 * 60 * 1000;
      sessionStorage.setItem("access_token_expiry", futureExpiry.toString());
      expect(tokenService.isAccessTokenExpired()).toBe(false);
    });
  });

  describe("hasTokens", () => {
    it("should return true when both tokens exist", async () => {
      vi.mocked(authStorage.getAuthToken).mockResolvedValueOnce(
        mockAccessToken,
      );
      vi.mocked(authStorage.getRefreshToken).mockResolvedValueOnce(
        mockRefreshToken,
      );

      const result = await tokenService.hasTokens();
      expect(result).toBe(true);
    });

    it("should return false when access token missing", async () => {
      vi.mocked(authStorage.getAuthToken).mockResolvedValueOnce(null);
      vi.mocked(authStorage.getRefreshToken).mockResolvedValueOnce(
        mockRefreshToken,
      );

      const result = await tokenService.hasTokens();
      expect(result).toBe(false);
    });

    it("should return false when refresh token missing", async () => {
      vi.mocked(authStorage.getAuthToken).mockResolvedValueOnce(
        mockAccessToken,
      );
      vi.mocked(authStorage.getRefreshToken).mockResolvedValueOnce(null);

      const result = await tokenService.hasTokens();
      expect(result).toBe(false);
    });
  });

  describe("clearTokens", () => {
    it("should clear all tokens and session data", async () => {
      sessionStorage.setItem("access_token_expiry", "123");
      sessionStorage.setItem("user_type", "client");
      sessionStorage.setItem("client_id", "user-123");

      await tokenService.clearTokens();

      expect(authStorage.clearAll).toHaveBeenCalled();
      expect(sessionStorage.getItem("access_token_expiry")).toBeNull();
      expect(sessionStorage.getItem("user_type")).toBeNull();
      expect(sessionStorage.getItem("client_id")).toBeNull();
    });
  });

  describe("getTokenInfo", () => {
    it("should return all stored token info", async () => {
      vi.mocked(authStorage.getAuthToken).mockResolvedValueOnce(
        mockAccessToken,
      );
      vi.mocked(authStorage.getRefreshToken).mockResolvedValueOnce(
        mockRefreshToken,
      );
      vi.mocked(authStorage.getClientId).mockResolvedValueOnce("user-123");

      sessionStorage.setItem("access_token_expiry", "1700000000000");
      sessionStorage.setItem("user_type", "client");

      const info = await tokenService.getTokenInfo();

      expect(info).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        clientId: "user-123",
        userType: "client",
        expiresAt: 1700000000000,
      });
    });
  });
});
