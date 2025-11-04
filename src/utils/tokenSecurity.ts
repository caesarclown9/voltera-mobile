/**
 * Утилиты для улучшения безопасности токенов
 * Использует правильное безопасное хранилище вместо XOR обфускации
 */

import { authStorage } from "@/lib/platform/secureStorage";

/**
 * Менеджер безопасного хранения токенов
 * Использует Secure Storage Plugin для native и sessionStorage для web
 */
export class SecureTokenStorage {
  private static readonly EXPIRY_KEY = "auth_token_expiry";
  private static readonly TOKEN_LIFETIME = 15 * 60 * 1000; // 15 минут

  /**
   * Сохраняет токен с временем жизни
   * Использует правильное безопасное хранилище (Capacitor Secure Storage для native)
   */
  static async setToken(token: string): Promise<void> {
    if (!token) return;

    try {
      const expiry = Date.now() + this.TOKEN_LIFETIME;

      // Используем правильный authStorage (Secure Storage для native, sessionStorage для web)
      await authStorage.setAuthToken(token);

      // Время жизни сохраняем отдельно для быстрого доступа
      sessionStorage.setItem(this.EXPIRY_KEY, expiry.toString());
    } catch (error) {
      console.error("Failed to store token securely:", error);
    }
  }

  /**
   * Получает токен с проверкой срока действия
   */
  static async getToken(): Promise<string | null> {
    try {
      const expiry = sessionStorage.getItem(this.EXPIRY_KEY);

      // Проверяем срок действия
      if (!expiry || Date.now() > parseInt(expiry)) {
        await this.clearToken();
        return null;
      }

      // Получаем токен из безопасного хранилища
      const token = await authStorage.getAuthToken();
      return token;
    } catch (error) {
      console.error("Failed to retrieve token:", error);
      return null;
    }
  }

  /**
   * Очищает токен
   */
  static async clearToken(): Promise<void> {
    await authStorage.removeAuthToken();
    sessionStorage.removeItem(this.EXPIRY_KEY);
  }

  /**
   * Проверяет, истек ли токен
   */
  static isTokenExpired(): boolean {
    const expiry = sessionStorage.getItem(this.EXPIRY_KEY);
    if (!expiry) return true;
    return Date.now() > parseInt(expiry);
  }

  /**
   * Обновляет время жизни токена (при активности пользователя)
   */
  static refreshTokenExpiry(): void {
    const expiry = sessionStorage.getItem(this.EXPIRY_KEY);
    if (expiry && !this.isTokenExpired()) {
      const newExpiry = Date.now() + this.TOKEN_LIFETIME;
      sessionStorage.setItem(this.EXPIRY_KEY, newExpiry.toString());
    }
  }
}

/**
 * Детектор XSS попыток
 */
export class XSSDetector {
  private static readonly SUSPICIOUS_PATTERNS = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /data:text\/html/i,
  ];

  /**
   * Проверяет строку на подозрительные паттерны
   */
  static isSuspicious(input: string): boolean {
    if (!input) return false;

    return this.SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(input));
  }

  /**
   * Санитизирует потенциально опасный ввод
   */
  static sanitize(input: string): string {
    if (!input) return "";

    // Базовая санитизация HTML
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }
}

/**
 * Монитор безопасности для отслеживания подозрительной активности
 */
export class SecurityMonitor {
  private static failedAttempts = 0;
  private static readonly MAX_ATTEMPTS = 5;
  private static lastAttemptTime = 0;
  private static readonly LOCKOUT_DURATION = 5 * 60 * 1000; // 5 минут

  /**
   * Регистрирует неудачную попытку доступа
   */
  static recordFailedAttempt(): void {
    this.failedAttempts++;
    this.lastAttemptTime = Date.now();

    if (this.failedAttempts >= this.MAX_ATTEMPTS) {
      console.warn("Multiple failed auth attempts detected");
      // В production можно отправить алерт на сервер
    }
  }

  /**
   * Проверяет, заблокирован ли доступ
   */
  static isLocked(): boolean {
    if (this.failedAttempts < this.MAX_ATTEMPTS) return false;

    const timeSinceLastAttempt = Date.now() - this.lastAttemptTime;
    if (timeSinceLastAttempt > this.LOCKOUT_DURATION) {
      this.reset();
      return false;
    }

    return true;
  }

  /**
   * Сбрасывает счетчик попыток
   */
  static reset(): void {
    this.failedAttempts = 0;
    this.lastAttemptTime = 0;
  }

  /**
   * Получает оставшееся время блокировки
   */
  static getLockoutTimeRemaining(): number {
    if (!this.isLocked()) return 0;

    const elapsed = Date.now() - this.lastAttemptTime;
    return Math.max(0, this.LOCKOUT_DURATION - elapsed);
  }
}
