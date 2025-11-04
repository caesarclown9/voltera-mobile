/**
 * Secure Storage abstraction
 * Согласно RULES.md п.11 - Токены: web — HttpOnly cookie; native — Secure Storage
 * КРИТИЧНО: НЕ используем localStorage для токенов!
 */

import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { isNativePlatform, isWebPlatform } from "./env";
import { logger } from "@/shared/utils/logger";

// Ключи для хранения
const AUTH_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const CLIENT_ID_KEY = "client_id";

/**
 * Интерфейс для результата операций с хранилищем
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Абстрактный класс для безопасного хранения данных
 */
class SecureStorageService {
  /**
   * Сохраняет значение в безопасном хранилище
   */
  async set(key: string, value: string): Promise<StorageResult<void>> {
    try {
      if (isNativePlatform()) {
        // Используем Secure Storage для нативных платформ (шифрование на уровне ОС)
        await SecureStoragePlugin.set({ key, value });
        logger.debug(`SecureStorage: saved ${key} in native secure storage`);
      } else if (isWebPlatform()) {
        // Временное решение для веб до миграции на HttpOnly cookies
        // TODO: Migrate to HttpOnly cookies with backend support
        // ВАЖНО: это временное решение, в продакшене нужны HttpOnly cookies!

        // Используем sessionStorage как более безопасную альтернативу localStorage
        // sessionStorage очищается при закрытии вкладки
        sessionStorage.setItem(key, value);
        logger.warn(
          `SecureStorage: using sessionStorage for ${key} (temporary solution)`,
        );
      }

      return { success: true };
    } catch (error) {
      logger.error(`SecureStorage: failed to save ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Получает значение из безопасного хранилища
   */
  async get(key: string): Promise<StorageResult<string>> {
    try {
      if (isNativePlatform()) {
        const result = await SecureStoragePlugin.get({ key });
        return { success: true, data: result.value };
      } else if (isWebPlatform()) {
        // Временное решение для веб
        const value = sessionStorage.getItem(key);

        // Fallback на localStorage для совместимости с текущим кодом
        // Будет удалено после полной миграции
        const fallbackValue = value || localStorage.getItem(key);

        if (fallbackValue) {
          // Мигрируем из localStorage в sessionStorage
          if (!value && fallbackValue) {
            sessionStorage.setItem(key, fallbackValue);
            localStorage.removeItem(key);
            logger.info(
              `SecureStorage: migrated ${key} from localStorage to sessionStorage`,
            );
          }

          return { success: true, data: fallbackValue };
        }

        return { success: false, error: "Value not found" };
      }

      return { success: false, error: "Platform not supported" };
    } catch (error) {
      logger.error(`SecureStorage: failed to get ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Удаляет значение из безопасного хранилища
   */
  async remove(key: string): Promise<StorageResult<void>> {
    try {
      if (isNativePlatform()) {
        await SecureStoragePlugin.remove({ key });
      } else if (isWebPlatform()) {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key); // Очищаем и localStorage для полной очистки
      }

      logger.debug(`SecureStorage: removed ${key}`);
      return { success: true };
    } catch (error) {
      logger.error(`SecureStorage: failed to remove ${key}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Очищает все данные из безопасного хранилища
   */
  async clear(): Promise<StorageResult<void>> {
    try {
      if (isNativePlatform()) {
        await SecureStoragePlugin.clear();
      } else if (isWebPlatform()) {
        // Очищаем только наши ключи, не трогаем другие данные
        const keysToRemove = [AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, CLIENT_ID_KEY];
        keysToRemove.forEach((key) => {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        });
      }

      logger.debug("SecureStorage: cleared all auth data");
      return { success: true };
    } catch (error) {
      logger.error("SecureStorage: failed to clear", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

// Экспортируем singleton instance
export const secureStorage = new SecureStorageService();

/**
 * Специализированные методы для работы с токенами
 */
export const authStorage = {
  async setAuthToken(token: string): Promise<boolean> {
    const result = await secureStorage.set(AUTH_TOKEN_KEY, token);
    return result.success;
  },

  async getAuthToken(): Promise<string | null> {
    const result = await secureStorage.get(AUTH_TOKEN_KEY);
    return result.success ? result.data || null : null;
  },

  async removeAuthToken(): Promise<boolean> {
    const result = await secureStorage.remove(AUTH_TOKEN_KEY);
    return result.success;
  },

  async setRefreshToken(token: string): Promise<boolean> {
    const result = await secureStorage.set(REFRESH_TOKEN_KEY, token);
    return result.success;
  },

  async getRefreshToken(): Promise<string | null> {
    const result = await secureStorage.get(REFRESH_TOKEN_KEY);
    return result.success ? result.data || null : null;
  },

  async setClientId(clientId: string): Promise<boolean> {
    const result = await secureStorage.set(CLIENT_ID_KEY, clientId);
    return result.success;
  },

  async getClientId(): Promise<string | null> {
    const result = await secureStorage.get(CLIENT_ID_KEY);
    return result.success ? result.data || null : null;
  },

  async clearAll(): Promise<boolean> {
    const result = await secureStorage.clear();
    return result.success;
  },
};
