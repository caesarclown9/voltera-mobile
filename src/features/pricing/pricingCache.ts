import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { PricingResult, TariffPlan, TariffRule } from './types';
import { OFFLINE_CACHE_TTL } from './types';

interface PricingDB extends DBSchema {
  pricing: {
    key: string;
    value: {
      stationId: string;
      data: PricingResult;
      timestamp: number;
    };
  };
  tariffPlans: {
    key: string;
    value: TariffPlan & { timestamp: number };
  };
  tariffRules: {
    key: string;
    value: TariffRule & { timestamp: number };
  };
  favorites: {
    key: string;
    value: {
      stationId: string;
      pricing: PricingResult;
      tariffPlan?: TariffPlan;
      rules?: TariffRule[];
      timestamp: number;
    };
  };
}

class PricingCacheService {
  private db: IDBPDatabase<PricingDB> | null = null;
  private dbName = 'evpower-pricing-cache';
  private dbVersion = 1;

  async init(): Promise<void> {
    try {
      this.db = await openDB<PricingDB>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Создаем хранилища
          if (!db.objectStoreNames.contains('pricing')) {
            db.createObjectStore('pricing');
          }
          if (!db.objectStoreNames.contains('tariffPlans')) {
            db.createObjectStore('tariffPlans');
          }
          if (!db.objectStoreNames.contains('tariffRules')) {
            db.createObjectStore('tariffRules');
          }
          if (!db.objectStoreNames.contains('favorites')) {
            db.createObjectStore('favorites');
          }
        },
      });

      // Очищаем устаревшие записи при инициализации
      await this.cleanupOldData();
    } catch (error) {
      console.error('Failed to initialize pricing cache DB:', error);
    }
  }

  /**
   * Кэширует результат расчета тарифа
   */
  async cachePricing(
    stationId: string,
    connectorType: string | undefined,
    clientId: string | undefined,
    data: PricingResult
  ): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const key = this.buildKey(stationId, connectorType, clientId);
    
    try {
      await this.db.put('pricing', {
        stationId,
        data,
        timestamp: Date.now()
      }, key);
    } catch (error) {
      console.error('Failed to cache pricing:', error);
    }
  }

  /**
   * Получает закэшированный тариф
   */
  async getCachedPricing(
    stationId: string,
    connectorType?: string,
    clientId?: string
  ): Promise<PricingResult | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    const key = this.buildKey(stationId, connectorType, clientId);
    
    try {
      const cached = await this.db.get('pricing', key);
      
      if (cached && this.isValid(cached.timestamp)) {
        return cached.data;
      }
      
      // Удаляем устаревшую запись
      if (cached) {
        await this.db.delete('pricing', key);
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached pricing:', error);
      return null;
    }
  }

  /**
   * Кэширует тарифный план
   */
  async cacheTariffPlan(plan: TariffPlan): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      await this.db.put('tariffPlans', {
        ...plan,
        timestamp: Date.now()
      }, plan.id);
    } catch (error) {
      console.error('Failed to cache tariff plan:', error);
    }
  }

  /**
   * Кэширует правила тарифа
   */
  async cacheTariffRules(rules: TariffRule[]): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      const tx = this.db.transaction('tariffRules', 'readwrite');
      
      for (const rule of rules) {
        await tx.store.put({
          ...rule,
          timestamp: Date.now()
        }, rule.id);
      }
      
      await tx.done;
    } catch (error) {
      console.error('Failed to cache tariff rules:', error);
    }
  }

  /**
   * Кэширует данные для избранных станций
   */
  async cacheFavoriteStation(
    stationId: string,
    pricing: PricingResult,
    tariffPlan?: TariffPlan,
    rules?: TariffRule[]
  ): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    try {
      await this.db.put('favorites', {
        stationId,
        pricing,
        tariffPlan,
        rules,
        timestamp: Date.now()
      }, stationId);
    } catch (error) {
      console.error('Failed to cache favorite station:', error);
    }
  }

  /**
   * Получает закэшированные данные избранной станции
   */
  async getFavoriteStation(stationId: string): Promise<{
    pricing: PricingResult;
    tariffPlan?: TariffPlan;
    rules?: TariffRule[];
  } | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    try {
      const cached = await this.db.get('favorites', stationId);
      
      if (cached && this.isValid(cached.timestamp)) {
        return {
          pricing: cached.pricing,
          tariffPlan: cached.tariffPlan,
          rules: cached.rules
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get favorite station:', error);
      return null;
    }
  }

  /**
   * Очищает устаревшие данные
   */
  async cleanupOldData(): Promise<void> {
    if (!this.db) return;

    try {
      const now = Date.now();
      
      // Очищаем pricing
      const pricingTx = this.db.transaction('pricing', 'readwrite');
      const pricingKeys = await pricingTx.store.getAllKeys();
      
      for (const key of pricingKeys) {
        const item = await pricingTx.store.get(key);
        if (item && !this.isValid(item.timestamp)) {
          await pricingTx.store.delete(key);
        }
      }
      
      await pricingTx.done;

      // Очищаем favorites старше 7 дней
      const favoritesTx = this.db.transaction('favorites', 'readwrite');
      const favoritesKeys = await favoritesTx.store.getAllKeys();
      
      for (const key of favoritesKeys) {
        const item = await favoritesTx.store.get(key);
        if (item && now - item.timestamp > 7 * 24 * 60 * 60 * 1000) {
          await favoritesTx.store.delete(key);
        }
      }
      
      await favoritesTx.done;
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  /**
   * Очищает весь кэш
   */
  async clearAll(): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.clear('pricing');
      await this.db.clear('tariffPlans');
      await this.db.clear('tariffRules');
      await this.db.clear('favorites');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Проверяет валидность кэша по времени
   */
  private isValid(timestamp: number): boolean {
    return Date.now() - timestamp < OFFLINE_CACHE_TTL;
  }

  /**
   * Создает ключ для кэширования
   */
  private buildKey(
    stationId: string,
    connectorType?: string,
    clientId?: string
  ): string {
    return `${stationId}-${connectorType || 'any'}-${clientId || 'guest'}`;
  }

  /**
   * Получает статистику кэша
   */
  async getCacheStats(): Promise<{
    pricingCount: number;
    tariffPlansCount: number;
    tariffRulesCount: number;
    favoritesCount: number;
    totalSize: number;
  }> {
    if (!this.db) await this.init();
    if (!this.db) {
      return {
        pricingCount: 0,
        tariffPlansCount: 0,
        tariffRulesCount: 0,
        favoritesCount: 0,
        totalSize: 0
      };
    }

    try {
      const pricingCount = await this.db.count('pricing');
      const tariffPlansCount = await this.db.count('tariffPlans');
      const tariffRulesCount = await this.db.count('tariffRules');
      const favoritesCount = await this.db.count('favorites');

      // Примерная оценка размера
      const totalSize = (pricingCount * 1024) + 
                       (tariffPlansCount * 512) + 
                       (tariffRulesCount * 256) + 
                       (favoritesCount * 2048);

      return {
        pricingCount,
        tariffPlansCount,
        tariffRulesCount,
        favoritesCount,
        totalSize
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        pricingCount: 0,
        tariffPlansCount: 0,
        tariffRulesCount: 0,
        favoritesCount: 0,
        totalSize: 0
      };
    }
  }
}

export const pricingCache = new PricingCacheService();