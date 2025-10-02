/**
 * Утилиты для улучшения безопасности токенов
 * Временное решение до миграции на HttpOnly cookies
 */

// Простая обфускация для усложнения чтения токенов
export class TokenObfuscator {
  private static readonly KEY = 'ev-power-2025-mobile';

  /**
   * Обфусцирует токен перед сохранением
   */
  static obfuscate(token: string): string {
    if (!token) return '';

    try {
      // Простое XOR шифрование с ключом
      let result = '';
      for (let i = 0; i < token.length; i++) {
        const tokenChar = token.charCodeAt(i);
        const keyChar = this.KEY.charCodeAt(i % this.KEY.length);
        result += String.fromCharCode(tokenChar ^ keyChar);
      }
      // Кодируем в base64 для безопасного хранения
      return btoa(result);
    } catch (error) {
      console.error('Token obfuscation failed:', error);
      return token; // Fallback to plain token
    }
  }

  /**
   * Деобфусцирует токен после чтения
   */
  static deobfuscate(obfuscatedToken: string): string {
    if (!obfuscatedToken) return '';

    try {
      // Декодируем из base64
      const decoded = atob(obfuscatedToken);

      // Применяем XOR для восстановления
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const decodedChar = decoded.charCodeAt(i);
        const keyChar = this.KEY.charCodeAt(i % this.KEY.length);
        result += String.fromCharCode(decodedChar ^ keyChar);
      }

      return result;
    } catch (error) {
      console.error('Token deobfuscation failed:', error);
      return obfuscatedToken; // Fallback to return as-is
    }
  }
}

/**
 * Менеджер безопасного хранения токенов
 */
export class SecureTokenStorage {
  private static readonly TOKEN_KEY = 'auth_token_secure';
  private static readonly EXPIRY_KEY = 'auth_token_expiry';
  private static readonly TOKEN_LIFETIME = 15 * 60 * 1000; // 15 минут

  /**
   * Сохраняет токен с обфускацией и временем жизни
   */
  static setToken(token: string): void {
    if (!token) return;

    try {
      const obfuscated = TokenObfuscator.obfuscate(token);
      const expiry = Date.now() + this.TOKEN_LIFETIME;

      // Используем sessionStorage для автоочистки при закрытии вкладки
      sessionStorage.setItem(this.TOKEN_KEY, obfuscated);
      sessionStorage.setItem(this.EXPIRY_KEY, expiry.toString());
    } catch (error) {
      console.error('Failed to store token securely:', error);
    }
  }

  /**
   * Получает токен с проверкой срока действия
   */
  static getToken(): string | null {
    try {
      const obfuscated = sessionStorage.getItem(this.TOKEN_KEY);
      const expiry = sessionStorage.getItem(this.EXPIRY_KEY);

      if (!obfuscated || !expiry) return null;

      // Проверяем срок действия
      if (Date.now() > parseInt(expiry)) {
        this.clearToken();
        return null;
      }

      return TokenObfuscator.deobfuscate(obfuscated);
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Очищает токен
   */
  static clearToken(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
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
    const token = this.getToken();
    if (token) {
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

    return this.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Санитизирует потенциально опасный ввод
   */
  static sanitize(input: string): string {
    if (!input) return '';

    // Базовая санитизация HTML
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
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
      console.warn('Multiple failed auth attempts detected');
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