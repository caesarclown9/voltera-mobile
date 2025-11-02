/**
 * Version Manager
 *
 * Управляет версиями приложения, миграциями и очисткой кешей
 * при обновлении приложения
 */

import { logger } from "@/shared/utils/logger";

// Текущая версия приложения (синхронизируется с package.json)
export const APP_VERSION = "1.0.1";
export const APP_BUILD = 72; // Увеличивается при каждой сборке

// Ключи для хранения
const VERSION_STORAGE_KEY = "evpower_app_version";
const BUILD_STORAGE_KEY = "evpower_app_build";
const LAST_MIGRATION_KEY = "evpower_last_migration";

interface VersionInfo {
  version: string;
  build: number;
  timestamp: number;
}

interface MigrationResult {
  success: boolean;
  migrationsRun: string[];
  errors: string[];
}

class VersionManager {
  private currentVersion: string = APP_VERSION;
  private currentBuild: number = APP_BUILD;

  /**
   * Инициализация при старте приложения
   * Проверяет версию и запускает миграции если нужно
   */
  async initialize(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migrationsRun: [],
      errors: [],
    };

    try {
      const previousVersion = this.getPreviousVersion();
      const previousBuild = this.getPreviousBuild();

      logger.debug("[VersionManager] Current:", {
        version: this.currentVersion,
        build: this.currentBuild,
      });
      logger.debug("[VersionManager] Previous:", {
        version: previousVersion,
        build: previousBuild,
      });

      // Первая установка
      if (!previousVersion || !previousBuild) {
        logger.debug("[VersionManager] First installation");
        await this.saveCurrentVersion();
        return result;
      }

      // Проверка обновления
      const isUpdated = this.isAppUpdated(previousVersion, previousBuild);

      if (isUpdated) {
        logger.debug("[VersionManager] App updated! Running migrations...");

        // Запускаем миграции
        const migrationResult = await this.runMigrations(
          previousVersion,
          previousBuild,
        );
        result.migrationsRun = migrationResult.migrationsRun;
        result.errors = migrationResult.errors;
        result.success = migrationResult.errors.length === 0;

        // Сохраняем новую версию
        await this.saveCurrentVersion();

        logger.debug("[VersionManager] Migration complete:", result);
      } else {
        logger.debug("[VersionManager] No update detected");
      }

      return result;
    } catch (error) {
      logger.error("[VersionManager] Initialization error:", error);
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : "Unknown error",
      );
      return result;
    }
  }

  /**
   * Проверяет было ли обновление приложения
   */
  private isAppUpdated(
    previousVersion: string,
    previousBuild: number,
  ): boolean {
    // Сравниваем build number (более надежно чем версию)
    if (this.currentBuild > previousBuild) {
      return true;
    }

    // Также сравниваем версии (для случаев когда забыли обновить build)
    if (this.compareVersions(this.currentVersion, previousVersion) > 0) {
      return true;
    }

    return false;
  }

  /**
   * Запускает миграции между версиями
   */
  private async runMigrations(
    fromVersion: string,
    fromBuild: number,
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migrationsRun: [],
      errors: [],
    };

    try {
      // Миграция 1: Всегда очищаем Service Worker кеш при обновлении
      try {
        await this.clearServiceWorkerCache();
        result.migrationsRun.push("clear_service_worker_cache");
      } catch (error) {
        result.errors.push(`Service Worker cache clear failed: ${error}`);
      }

      // Миграция 2: Очистка React Query cache в IndexedDB при мажорных обновлениях
      if (this.isMajorUpdate(fromVersion, this.currentVersion)) {
        try {
          await this.clearReactQueryCache();
          result.migrationsRun.push("clear_react_query_cache");
        } catch (error) {
          result.errors.push(`React Query cache clear failed: ${error}`);
        }
      }

      // Миграция 3: Валидация и очистка Supabase сессии при несовместимых обновлениях
      try {
        await this.validateSupabaseSession();
        result.migrationsRun.push("validate_supabase_session");
      } catch (error) {
        result.errors.push(`Supabase session validation failed: ${error}`);
      }

      // Миграция 4: Очистка Zustand persist при структурных изменениях
      if (this.shouldClearZustandCache(fromBuild, this.currentBuild)) {
        try {
          await this.clearZustandCache();
          result.migrationsRun.push("clear_zustand_cache");
        } catch (error) {
          result.errors.push(`Zustand cache clear failed: ${error}`);
        }
      }

      // Миграция 5: Очистка pricing cache при обновлении тарифной системы
      try {
        await this.clearPricingCache();
        result.migrationsRun.push("clear_pricing_cache");
      } catch (error) {
        result.errors.push(`Pricing cache clear failed: ${error}`);
      }
    } catch (error) {
      logger.error("[VersionManager] Migration error:", error);
      result.errors.push(
        error instanceof Error ? error.message : "Unknown migration error",
      );
      result.success = false;
    }

    return result;
  }

  /**
   * Очищает Service Worker кеш
   */
  private async clearServiceWorkerCache(): Promise<void> {
    if ("serviceWorker" in navigator && "caches" in window) {
      logger.debug("[VersionManager] Clearing Service Worker caches...");

      // Получаем все кеши
      const cacheNames = await caches.keys();

      // Удаляем все кеши
      await Promise.all(
        cacheNames.map((cacheName) => {
          logger.debug("[VersionManager] Deleting cache:", cacheName);
          return caches.delete(cacheName);
        }),
      );

      // Обновляем Service Worker
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        logger.debug("[VersionManager] Service Worker updated");
      }
    }
  }

  /**
   * Очищает React Query кеш в IndexedDB
   */
  private async clearReactQueryCache(): Promise<void> {
    logger.debug("[VersionManager] Clearing React Query cache...");

    try {
      // React Query Persist использует idb-keyval
      const dbName = "evpower-cache";

      // Удаляем всю базу данных
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => {
          logger.debug("[VersionManager] React Query cache cleared");
          resolve();
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () => {
          logger.warn(
            "[VersionManager] IndexedDB delete blocked, will be deleted when possible",
          );
          resolve(); // Не блокируем миграцию
        };
      });
    } catch (error) {
      logger.error(
        "[VersionManager] Failed to clear React Query cache:",
        error,
      );
      // Не критично - пропускаем
    }
  }

  /**
   * Валидирует Supabase сессию
   */
  private async validateSupabaseSession(): Promise<void> {
    if (!import.meta.env.PROD) {
      logger.debug("[VersionManager] Validating Supabase session...");
    }

    // Не парсим и не логируем содержимое токена. Безопасно очищаем некорректные/устаревшие ключи.
    try {
      const key = "evpower-auth-token";
      const raw = localStorage.getItem(key);
      if (!raw) return;

      // Минимальная валидация: JSON или нет. Детали не читаем.
      try {
        JSON.parse(raw);
      } catch {
        localStorage.removeItem(key);
        return;
      }

      // Если установлена явная метка устаревшей миграции — очищаем.
      const lastMigration = localStorage.getItem("evpower_last_migration");
      if (!lastMigration) {
        // После первой миграции ключ будет выставлен; до этого безопасно не трогаем токен
        return;
      }
    } catch (error) {
      if (!import.meta.env.PROD) {
        logger.error("[VersionManager] Session validation error:", error);
      }
    }
  }

  /**
   * Очищает Zustand persist кеш
   */
  private async clearZustandCache(): Promise<void> {
    logger.debug("[VersionManager] Clearing Zustand cache...");

    // Список всех Zustand storage ключей
    const zustandKeys = [
      "auth-storage",
      "settings-storage",
      "favorites-storage",
    ];

    zustandKeys.forEach((key) => {
      if (localStorage.getItem(key)) {
        logger.debug("[VersionManager] Removing Zustand key:", key);
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Очищает pricing кеш
   */
  private async clearPricingCache(): Promise<void> {
    logger.debug("[VersionManager] Clearing pricing cache...");

    try {
      // Очищаем pricing cache в IndexedDB
      const pricingDbName = "pricing-cache";

      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase(pricingDbName);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () => resolve(); // Не критично
      });
    } catch (error) {
      logger.warn("[VersionManager] Failed to clear pricing cache:", error);
      // Не критично
    }
  }

  /**
   * Сравнивает версии (semver)
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = String(v1 || "0.0.0")
      .split(".")
      .map((n) => Number(n || 0));
    const parts2 = String(v2 || "0.0.0")
      .split(".")
      .map((n) => Number(n || 0));

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Проверяет является ли обновление мажорным (x.0.0)
   */
  private isMajorUpdate(fromVersion: string, toVersion: string): boolean {
    const fromMajor = parseInt(
      String(fromVersion || "0.0.0").split(".")[0] || "0",
    );
    const toMajor = parseInt(String(toVersion || "0.0.0").split(".")[0] || "0");
    return toMajor > fromMajor;
  }

  /**
   * Проверяет нужно ли очищать Zustand кеш
   * (при изменении структуры данных - указываем build number)
   */
  private shouldClearZustandCache(fromBuild: number, toBuild: number): boolean {
    // Список build'ов где менялась структура Zustand
    const structureChangingBuilds: number[] = [
      // Добавляйте сюда build numbers когда меняете структуру store
      // Например: 5, 10, 15
    ];

    return structureChangingBuilds.some(
      (build) => fromBuild < build && toBuild >= build,
    );
  }

  /**
   * Получает предыдущую версию из localStorage
   */
  private getPreviousVersion(): string | null {
    return localStorage.getItem(VERSION_STORAGE_KEY);
  }

  /**
   * Получает предыдущий build из localStorage
   */
  private getPreviousBuild(): number | null {
    const build = localStorage.getItem(BUILD_STORAGE_KEY);
    return build ? parseInt(build) : null;
  }

  /**
   * Сохраняет текущую версию в localStorage
   */
  private async saveCurrentVersion(): Promise<void> {
    localStorage.setItem(VERSION_STORAGE_KEY, this.currentVersion);
    localStorage.setItem(BUILD_STORAGE_KEY, this.currentBuild.toString());
    localStorage.setItem(LAST_MIGRATION_KEY, Date.now().toString());
  }

  /**
   * Получает информацию о текущей версии
   */
  getVersionInfo(): VersionInfo {
    return {
      version: this.currentVersion,
      build: this.currentBuild,
      timestamp: Date.now(),
    };
  }

  /**
   * Принудительная очистка всех кешей (для дебага)
   */
  async clearAllCaches(): Promise<void> {
    logger.debug("[VersionManager] Force clearing all caches...");

    await Promise.all([
      this.clearServiceWorkerCache(),
      this.clearReactQueryCache(),
      this.clearZustandCache(),
      this.clearPricingCache(),
    ]);

    // Очищаем localStorage (кроме критичных данных)
    const keysToKeep = ["evpower-auth-token"];
    Object.keys(localStorage).forEach((key) => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    logger.debug("[VersionManager] All caches cleared");
  }
}

export const versionManager = new VersionManager();
