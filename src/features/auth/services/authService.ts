/**
 * Auth Service - авторизация через телефон + WhatsApp OTP
 *
 * Основной flow:
 * 1. sendOtp(phone) - отправить OTP код на WhatsApp
 * 2. verifyOtp(phone, code) - проверить код и получить токены
 * 3. logout() - выход из системы
 *
 * Также поддерживает обновление токенов через tokenService
 */

import { tokenService, type UserType } from "./tokenService";
import { pushNotificationService } from "@/lib/platform/push";
import { logger } from "@/shared/utils/logger";
import { supabase } from "@/shared/config/supabase";

// API URL
const API_URL = import.meta.env["VITE_API_URL"] || "";

// Типы
export interface Client {
  id: string;
  phone: string | null;
  name: string | null;
  balance: number;
  status: "active" | "inactive" | "blocked";
  created_at: string | null;
}

export interface AdminUser {
  id: string;
  phone: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string | null;
}

export type AuthUser = Client | AdminUser;

export interface SendOtpResponse {
  success: boolean;
  phone: string;
  expires_in_seconds: number;
  resend_available_in_seconds: number;
}

export interface VerifyOtpResponse {
  success: boolean;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
  user_type: UserType;
  is_new_user: boolean;
}

export interface AuthError {
  success: false;
  error: string;
  message: string;
  retry_after_seconds?: number;
}

/**
 * Нормализует телефон в формат E.164 (+996XXXXXXXXX)
 */
function normalizePhone(phone: string): string {
  // Убираем все кроме цифр
  const digits = phone.replace(/\D/g, "");

  // Обрабатываем разные форматы
  if (digits.startsWith("996") && digits.length === 12) {
    return `+${digits}`;
  } else if (digits.startsWith("0") && digits.length === 10) {
    return `+996${digits.slice(1)}`;
  } else if (digits.length === 9 && !digits.startsWith("996")) {
    return `+996${digits}`;
  }

  // Если уже начинается с +
  if (phone.startsWith("+")) {
    return phone;
  }

  return `+${digits}`;
}

/**
 * Auth Service class
 */
class AuthServiceClass {
  private static instance: AuthServiceClass;

  private constructor() {}

  static getInstance(): AuthServiceClass {
    if (!AuthServiceClass.instance) {
      AuthServiceClass.instance = new AuthServiceClass();
    }
    return AuthServiceClass.instance;
  }

  /**
   * Отправляет OTP код на телефон через WhatsApp
   */
  async sendOtp(phone: string): Promise<SendOtpResponse> {
    const normalizedPhone = normalizePhone(phone);

    logger.info(`Sending OTP to ${normalizedPhone.slice(0, 7)}***`);

    const response = await fetch(`${API_URL}/api/v1/auth/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: normalizedPhone }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as AuthError;
      logger.warn(`Send OTP failed: ${errorData.error} - ${errorData.message}`);

      // Специальная обработка rate limit
      if (response.status === 429) {
        const error = new Error(errorData.message) as Error & {
          code: string;
          retryAfter: number;
        };
        error.code = "rate_limit";
        error.retryAfter = errorData.retry_after_seconds || 60;
        throw error;
      }

      throw new Error(errorData.message || "Не удалось отправить код");
    }

    return data as SendOtpResponse;
  }

  /**
   * Проверяет OTP код и выполняет вход
   * При успехе сохраняет токены и возвращает данные пользователя
   */
  async verifyOtp(phone: string, code: string): Promise<VerifyOtpResponse> {
    const normalizedPhone = normalizePhone(phone);

    logger.info(`Verifying OTP for ${normalizedPhone.slice(0, 7)}***`);

    const response = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        code: code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as AuthError;
      logger.warn(
        `Verify OTP failed: ${errorData.error} - ${errorData.message}`,
      );
      throw new Error(errorData.message || "Неверный код");
    }

    const result = data as VerifyOtpResponse;

    // Сохраняем токены
    await tokenService.saveTokens({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
    });

    // Регистрируем push notifications
    try {
      await pushNotificationService.register();
    } catch (error) {
      logger.warn("Failed to register push notifications:", error);
    }

    logger.info(`Auth successful: ${result.user_type} ${result.user.id}`);

    return result;
  }

  /**
   * Выход из системы
   */
  async signOut(): Promise<void> {
    logger.info("Signing out...");

    try {
      // Получаем refresh token для logout
      const refreshToken = await tokenService.getRefreshToken();

      if (refreshToken) {
        // Отправляем запрос на logout
        try {
          await fetch(`${API_URL}/api/v1/auth/logout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
        } catch (error) {
          logger.warn("Logout request failed:", error);
        }
      }

      // Удаляем FCM токен
      try {
        await pushNotificationService.unregister();
      } catch (error) {
        logger.warn("Failed to unregister push:", error);
      }

      // Очищаем токены
      await tokenService.clearTokens();

      // Очищаем localStorage от старых Supabase ключей (для миграции)
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // Ignore
      }

      logger.info("Sign out successful");
    } catch (error) {
      logger.error("Sign out error:", error);
      // Все равно очищаем токены локально
      await tokenService.clearTokens();
    }
  }

  /**
   * Получает текущего пользователя
   * Использует /auth/me endpoint или локальные данные
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const accessToken = await tokenService.getAccessToken();

      if (!accessToken) {
        return null;
      }

      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Токен недействителен - очищаем
          await tokenService.clearTokens();
        }
        return null;
      }

      const data = await response.json();

      if (data.success && data.user) {
        return data.user as AuthUser;
      }

      return null;
    } catch (error) {
      logger.error("Failed to get current user:", error);
      return null;
    }
  }

  /**
   * Проверяет авторизацию пользователя
   */
  async isAuthenticated(): Promise<boolean> {
    return tokenService.hasTokens();
  }

  /**
   * Получает ID текущего пользователя
   */
  async getClientId(): Promise<string | null> {
    return tokenService.getClientId();
  }

  /**
   * Получает access token для API запросов
   */
  async getAccessToken(): Promise<string | null> {
    return tokenService.getAccessToken();
  }

  /**
   * Получает тип пользователя
   */
  getUserType(): UserType | null {
    return tokenService.getUserType();
  }

  /**
   * Получает данные клиента из Supabase (для UI)
   * Используется для получения баланса и других данных
   */
  async getClientData(clientId: string): Promise<Client | null> {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, phone, name, balance, status, created_at")
        .eq("id", clientId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Client;
    } catch (error) {
      logger.error("Failed to get client data:", error);
      return null;
    }
  }

  /**
   * Обновляет данные профиля
   */
  async updateProfile(data: { name?: string }): Promise<boolean> {
    try {
      const accessToken = await tokenService.getAccessToken();
      const clientId = await tokenService.getClientId();

      if (!accessToken || !clientId) {
        return false;
      }

      // Обновляем через Supabase напрямую (RLS разрешает)
      const { error } = await supabase
        .from("clients")
        .update({ name: data.name, updated_at: new Date().toISOString() })
        .eq("id", clientId);

      return !error;
    } catch (error) {
      logger.error("Failed to update profile:", error);
      return false;
    }
  }

  /**
   * Слушает изменения авторизации (для совместимости с AuthProvider)
   * В новой системе не используется, возвращает dummy subscription
   */
  onAuthStateChange(
    _callback: (
      event: string,
      session: { user?: { id?: string } } | null,
    ) => void,
  ): { data: { subscription: { unsubscribe: () => void } } } {
    // Dummy subscription для совместимости
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            // No-op
          },
        },
      },
    };
  }
}

// Экспортируем singleton
export const authService = AuthServiceClass.getInstance();

// Экспортируем класс для тестов
export { AuthServiceClass };
