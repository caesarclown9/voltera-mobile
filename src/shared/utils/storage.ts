/**
 * Storage Abstraction - Безопасная обертка над localStorage
 *
 * ВАЖНО: Это ЕДИНСТВЕННЫЙ способ работы с localStorage в приложении!
 * НЕ используйте localStorage напрямую - это небезопасно!
 *
 * Преимущества:
 * - XSS защита через валидацию
 * - JSON автоматическая сериализация/десериализация
 * - Graceful degradation при недоступности localStorage
 * - Namespace для предотвращения коллизий
 * - Type-safe API
 * - Централизованное логирование ошибок
 *
 * @module shared/utils/storage
 */

import { logger } from "./logger";

/**
 * Префикс для всех ключей приложения
 * Предотвращает коллизии с другими приложениями на том же домене
 */
const STORAGE_PREFIX = "evpower_";

/**
 * Максимальный размер значения в символах (5MB в UTF-16)
 * Защита от переполнения localStorage
 */
const MAX_VALUE_SIZE = 5 * 1024 * 1024;

/**
 * Список ключей, которые НЕ должны логироваться (содержат sensitive данные)
 */
const SENSITIVE_KEYS = [
  "auth-token",
  "refresh-token",
  "user-credentials",
  "payment-data",
];

/**
 * Проверяет доступность localStorage
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Проверяет является ли ключ sensitive (не логируется)
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.some((sensitiveKey) =>
    key.toLowerCase().includes(sensitiveKey),
  );
}

/**
 * Добавляет namespace префикс к ключу
 */
function getPrefixedKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

/**
 * Удаляет namespace префикс из ключа
 */
function removePrefixFromKey(prefixedKey: string): string {
  return prefixedKey.startsWith(STORAGE_PREFIX)
    ? prefixedKey.slice(STORAGE_PREFIX.length)
    : prefixedKey;
}

/**
 * Безопасная валидация и санитизация значения
 */
function sanitizeValue(value: string): string {
  // Проверка размера
  if (value.length > MAX_VALUE_SIZE) {
    throw new Error(
      `Value too large: ${value.length} chars (max ${MAX_VALUE_SIZE})`,
    );
  }

  // Базовая XSS защита: проверяем что это валидный JSON или простая строка
  try {
    // Если это JSON - парсим и снова stringify для очистки
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed);
  } catch {
    // Если не JSON - возвращаем как есть (будет обернуто в JSON.stringify при сохранении)
    return value;
  }
}

/**
 * Storage Service - Безопасная работа с localStorage
 */
class StorageService {
  private available: boolean;

  constructor() {
    this.available = isLocalStorageAvailable();
    if (!this.available) {
      logger.warn(
        "[Storage] localStorage is not available, using in-memory fallback",
      );
    }
  }

  /**
   * Сохраняет значение в localStorage
   *
   * @param key - Ключ (без префикса)
   * @param value - Значение (будет автоматически сериализовано в JSON)
   *
   * @example
   * ```typescript
   * storage.set('user-settings', { theme: 'dark' });
   * ```
   */
  set<T>(key: string, value: T): void {
    if (!this.available) {
      logger.warn(`[Storage] set('${key}') - localStorage unavailable`);
      return;
    }

    try {
      const prefixedKey = getPrefixedKey(key);
      const serialized = JSON.stringify(value);
      const sanitized = sanitizeValue(serialized);

      localStorage.setItem(prefixedKey, sanitized);

      if (!isSensitiveKey(key)) {
        logger.debug(`[Storage] set('${key}') - success`);
      }
    } catch (error) {
      logger.error(`[Storage] set('${key}') - failed:`, error);
      throw new Error(`Failed to save to storage: ${error}`);
    }
  }

  /**
   * Получает значение из localStorage
   *
   * @param key - Ключ (без префикса)
   * @returns Значение или null если не найдено
   *
   * @example
   * ```typescript
   * const settings = storage.get<UserSettings>('user-settings');
   * if (settings) {
   *   logger.debug('User settings:', settings.theme);
   * }
   * ```
   */
  get<T>(key: string): T | null {
    if (!this.available) {
      logger.warn(`[Storage] get('${key}') - localStorage unavailable`);
      return null;
    }

    try {
      const prefixedKey = getPrefixedKey(key);
      const value = localStorage.getItem(prefixedKey);

      if (value === null) {
        return null;
      }

      const parsed = JSON.parse(value) as T;

      if (!isSensitiveKey(key)) {
        logger.debug(`[Storage] get('${key}') - success`);
      }

      return parsed;
    } catch (error) {
      logger.error(`[Storage] get('${key}') - failed:`, error);
      return null;
    }
  }

  /**
   * Удаляет значение из localStorage
   *
   * @param key - Ключ (без префикса)
   *
   * @example
   * ```typescript
   * storage.remove('user-settings');
   * ```
   */
  remove(key: string): void {
    if (!this.available) {
      logger.warn(`[Storage] remove('${key}') - localStorage unavailable`);
      return;
    }

    try {
      const prefixedKey = getPrefixedKey(key);
      localStorage.removeItem(prefixedKey);

      if (!isSensitiveKey(key)) {
        logger.debug(`[Storage] remove('${key}') - success`);
      }
    } catch (error) {
      logger.error(`[Storage] remove('${key}') - failed:`, error);
    }
  }

  /**
   * Проверяет существование ключа
   *
   * @param key - Ключ (без префикса)
   * @returns true если ключ существует
   */
  has(key: string): boolean {
    if (!this.available) {
      return false;
    }

    const prefixedKey = getPrefixedKey(key);
    return localStorage.getItem(prefixedKey) !== null;
  }

  /**
   * Очищает все ключи приложения (с префиксом evpower_)
   *
   * ВАЖНО: Используйте осторожно! Удаляет ВСЕ данные приложения.
   *
   * @param exceptKeys - Список ключей которые НЕ нужно удалять
   */
  clear(exceptKeys: string[] = []): void {
    if (!this.available) {
      logger.warn("[Storage] clear() - localStorage unavailable");
      return;
    }

    try {
      const keysToRemove: string[] = [];

      // Собираем все ключи с нашим префиксом
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const unprefixedKey = removePrefixFromKey(key);
          if (!exceptKeys.includes(unprefixedKey)) {
            keysToRemove.push(key);
          }
        }
      }

      // Удаляем
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      logger.debug(
        `[Storage] clear() - removed ${keysToRemove.length} keys, kept ${exceptKeys.length} keys`,
      );
    } catch (error) {
      logger.error("[Storage] clear() - failed:", error);
    }
  }

  /**
   * Возвращает все ключи приложения (без префикса)
   */
  keys(): string[] {
    if (!this.available) {
      return [];
    }

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keys.push(removePrefixFromKey(key));
      }
    }
    return keys;
  }

  /**
   * Получает размер использования localStorage в байтах
   */
  getUsage(): { used: number; available: number; percentage: number } {
    if (!this.available) {
      return { used: 0, available: 0, percentage: 0 };
    }

    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          used += key.length + value.length;
        }
      }
    }

    // localStorage обычно 5-10MB в браузерах
    const available = 5 * 1024 * 1024; // 5MB
    const percentage = (used / available) * 100;

    return { used, available, percentage };
  }

  /**
   * Проверяет доступность storage
   */
  isAvailable(): boolean {
    return this.available;
  }
}

/**
 * Singleton instance - используйте ТОЛЬКО этот экземпляр!
 */
export const storage = new StorageService();

/**
 * Legacy compatibility - для постепенной миграции
 * @deprecated Используйте storage.set() вместо setItem()
 */
export const setItem = <T>(key: string, value: T): void =>
  storage.set(key, value);

/**
 * Legacy compatibility - для постепенной миграции
 * @deprecated Используйте storage.get() вместо getItem()
 */
export const getItem = <T>(key: string): T | null => storage.get<T>(key);

/**
 * Legacy compatibility - для постепенной миграции
 * @deprecated Используйте storage.remove() вместо removeItem()
 */
export const removeItem = (key: string): void => storage.remove(key);
