/**
 * Token Service - управление JWT токенами для авторизации
 *
 * Обеспечивает:
 * - Хранение access и refresh токенов
 * - Автоматическое обновление access token
 * - Проверку срока действия токенов
 * - Получение данных пользователя из токена
 */

import { authStorage } from "@/lib/platform/secureStorage";
import { logger } from "@/shared/utils/logger";

// Константы
const ACCESS_TOKEN_EXPIRY_KEY = "access_token_expiry";
const USER_TYPE_KEY = "user_type";
const CLIENT_ID_KEY = "client_id";

// Буфер для обновления токена (обновляем за 5 минут до истечения)
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export type UserType = "client" | "admin";

export interface TokenPayload {
  sub: string; // user_id
  type: UserType;
  phone: string;
  role?: string; // для админов
  iat: number;
  exp: number;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // секунды
}

export interface StoredTokenInfo {
  accessToken: string | null;
  refreshToken: string | null;
  clientId: string | null;
  userType: UserType | null;
  expiresAt: number | null;
}

/**
 * Декодирует JWT без проверки подписи (для чтения payload)
 */
function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1]!;
    // Base64url decode
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );

    return JSON.parse(jsonPayload) as TokenPayload;
  } catch (error) {
    logger.error("Failed to decode JWT payload:", error);
    return null;
  }
}

/**
 * Token Service singleton
 */
class TokenServiceClass {
  private refreshPromise: Promise<boolean> | null = null;

  /**
   * Сохраняет токены после успешной авторизации
   */
  async saveTokens(data: TokenData): Promise<void> {
    const { accessToken, refreshToken, expiresIn } = data;

    try {
      // Декодируем payload для получения данных пользователя
      const payload = decodeJwtPayload(accessToken);

      if (!payload) {
        throw new Error("Invalid access token");
      }

      // Сохраняем токены
      await authStorage.setAuthToken(accessToken);
      await authStorage.setRefreshToken(refreshToken);

      // Сохраняем данные пользователя
      await authStorage.setClientId(payload.sub);

      // Сохраняем тип пользователя и время истечения в sessionStorage
      const expiresAt = Date.now() + expiresIn * 1000;
      sessionStorage.setItem(ACCESS_TOKEN_EXPIRY_KEY, expiresAt.toString());
      sessionStorage.setItem(USER_TYPE_KEY, payload.type);
      sessionStorage.setItem(CLIENT_ID_KEY, payload.sub);

      logger.info(`Tokens saved for ${payload.type} ${payload.sub}`);
    } catch (error) {
      logger.error("Failed to save tokens:", error);
      throw error;
    }
  }

  /**
   * Обновляет только access token
   */
  async updateAccessToken(
    accessToken: string,
    expiresIn: number,
  ): Promise<void> {
    try {
      await authStorage.setAuthToken(accessToken);

      const expiresAt = Date.now() + expiresIn * 1000;
      sessionStorage.setItem(ACCESS_TOKEN_EXPIRY_KEY, expiresAt.toString());

      logger.debug("Access token updated");
    } catch (error) {
      logger.error("Failed to update access token:", error);
      throw error;
    }
  }

  /**
   * Получает access token (с автоматическим обновлением если нужно)
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const token = await authStorage.getAuthToken();

      if (!token) {
        return null;
      }

      // Проверяем срок действия
      if (this.isAccessTokenExpired()) {
        // Пробуем обновить токен
        const refreshed = await this.refreshAccessToken();
        if (!refreshed) {
          return null;
        }
        // Получаем обновленный токен
        return await authStorage.getAuthToken();
      }

      return token;
    } catch (error) {
      logger.error("Failed to get access token:", error);
      return null;
    }
  }

  /**
   * Получает refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return authStorage.getRefreshToken();
  }

  /**
   * Получает ID клиента
   */
  async getClientId(): Promise<string | null> {
    // Сначала пробуем из sessionStorage (быстрее)
    const cached = sessionStorage.getItem(CLIENT_ID_KEY);
    if (cached) {
      return cached;
    }

    // Иначе из secure storage
    return authStorage.getClientId();
  }

  /**
   * Получает тип пользователя
   */
  getUserType(): UserType | null {
    const type = sessionStorage.getItem(USER_TYPE_KEY);
    if (type === "client" || type === "admin") {
      return type;
    }
    return null;
  }

  /**
   * Проверяет истечение access token
   */
  isAccessTokenExpired(): boolean {
    const expiresAt = sessionStorage.getItem(ACCESS_TOKEN_EXPIRY_KEY);
    if (!expiresAt) {
      return true;
    }

    // Считаем токен истекшим за 5 минут до реального истечения
    return Date.now() > parseInt(expiresAt, 10) - TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Проверяет наличие токенов
   */
  async hasTokens(): Promise<boolean> {
    const accessToken = await authStorage.getAuthToken();
    const refreshToken = await authStorage.getRefreshToken();
    return !!(accessToken && refreshToken);
  }

  /**
   * Обновляет access token используя refresh token
   * Возвращает true если обновление успешно
   */
  async refreshAccessToken(): Promise<boolean> {
    // Предотвращаем параллельные запросы на обновление
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async _doRefresh(): Promise<boolean> {
    try {
      const refreshToken = await authStorage.getRefreshToken();

      if (!refreshToken) {
        logger.warn("No refresh token available");
        return false;
      }

      const apiUrl = import.meta.env["VITE_API_URL"] || "";
      const response = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        logger.warn(`Token refresh failed: ${response.status}`);
        // При ошибке 401 очищаем токены
        if (response.status === 401) {
          await this.clearTokens();
        }
        return false;
      }

      const data = await response.json();

      if (data.success && data.access_token) {
        await this.updateAccessToken(data.access_token, data.expires_in);
        logger.info("Access token refreshed successfully");
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Failed to refresh token:", error);
      return false;
    }
  }

  /**
   * Очищает все токены (logout)
   */
  async clearTokens(): Promise<void> {
    try {
      await authStorage.clearAll();

      sessionStorage.removeItem(ACCESS_TOKEN_EXPIRY_KEY);
      sessionStorage.removeItem(USER_TYPE_KEY);
      sessionStorage.removeItem(CLIENT_ID_KEY);

      logger.info("All tokens cleared");
    } catch (error) {
      logger.error("Failed to clear tokens:", error);
    }
  }

  /**
   * Получает всю информацию о сохраненных токенах
   */
  async getTokenInfo(): Promise<StoredTokenInfo> {
    const [accessToken, refreshToken, clientId] = await Promise.all([
      authStorage.getAuthToken(),
      authStorage.getRefreshToken(),
      authStorage.getClientId(),
    ]);

    const expiresAtStr = sessionStorage.getItem(ACCESS_TOKEN_EXPIRY_KEY);
    const userTypeStr = sessionStorage.getItem(USER_TYPE_KEY);

    return {
      accessToken,
      refreshToken,
      clientId,
      userType: (userTypeStr as UserType) || null,
      expiresAt: expiresAtStr ? parseInt(expiresAtStr, 10) : null,
    };
  }

  /**
   * Декодирует и возвращает payload текущего access token
   */
  async getTokenPayload(): Promise<TokenPayload | null> {
    const token = await authStorage.getAuthToken();
    if (!token) {
      return null;
    }
    return decodeJwtPayload(token);
  }
}

// Экспортируем singleton
export const tokenService = new TokenServiceClass();
