/* eslint-disable @typescript-eslint/no-explicit-any */
// Offline functionality utilities
// Note: `any` types used for generic offline queue and storage handling
import React from "react";
import { logger } from "./logger";

export class OfflineManager {
  private static instance: OfflineManager;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  private _isOnline: boolean = navigator.onLine;

  constructor() {
    if (OfflineManager.instance) {
      return OfflineManager.instance;
    }

    OfflineManager.instance = this;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  private handleOnline = () => {
    logger.info("🌐 Connection restored");
    this._isOnline = true;
    this.notifyListeners(true);
  };

  private handleOffline = () => {
    logger.info("📵 Connection lost");
    this._isOnline = false;
    this.notifyListeners(false);
  };

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach((listener) => listener(isOnline));
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    this.listeners.clear();
  }
}

// Offline storage manager
export class OfflineStorage {
  private static readonly OFFLINE_KEY = "evpower_offline_data";
  private static readonly MAX_ITEMS = 100;

  static save(key: string, data: any, expiry?: number): void {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        expiry: expiry ? Date.now() + expiry : null,
      };

      const offlineData = this.getAll();
      offlineData[key] = item;

      // Ограничиваем количество сохраненных элементов
      const keys = Object.keys(offlineData);
      if (keys.length > this.MAX_ITEMS) {
        const sortedKeys = keys.sort(
          (a, b) => offlineData[a].timestamp - offlineData[b].timestamp,
        );
        const keysToDelete = sortedKeys.slice(0, keys.length - this.MAX_ITEMS);
        keysToDelete.forEach((keyToDelete) => delete offlineData[keyToDelete]);
      }

      localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(offlineData));
    } catch (error) {
      logger.error("Failed to save offline data:", error);
    }
  }

  static get(key: string): any | null {
    try {
      const offlineData = this.getAll();
      const item = offlineData[key];

      if (!item) {
        return null;
      }

      // Проверяем срок действия
      if (item.expiry && Date.now() > item.expiry) {
        this.remove(key);
        return null;
      }

      return item.data;
    } catch (error) {
      logger.error("Failed to get offline data:", error);
      return null;
    }
  }

  static remove(key: string): void {
    try {
      const offlineData = this.getAll();
      delete offlineData[key];
      localStorage.setItem(this.OFFLINE_KEY, JSON.stringify(offlineData));
    } catch (error) {
      logger.error("Failed to remove offline data:", error);
    }
  }

  static getAll(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.OFFLINE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      logger.error("Failed to get all offline data:", error);
      return {};
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(this.OFFLINE_KEY);
    } catch (error) {
      logger.error("Failed to clear offline data:", error);
    }
  }

  static getSize(): number {
    return Object.keys(this.getAll()).length;
  }
}

// Hook для отслеживания онлайн статуса
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const manager = OfflineManager.getInstance();
    const unsubscribe = manager.subscribe(setIsOnline);

    // Синхронизируем начальное состояние
    setIsOnline(manager.isOnline);

    return unsubscribe;
  }, []);

  return isOnline;
}

// Интерфейс для элемента очереди
interface QueueItem {
  id: string;
  url: string;
  method: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

// Offline queue для отложенных запросов
export class OfflineQueue {
  private static readonly QUEUE_KEY = "evpower_offline_queue";
  private static readonly MAX_QUEUE_SIZE = 50;

  static add(item: Omit<QueueItem, "id" | "timestamp" | "retryCount">): void {
    try {
      const queue = this.getQueue();

      if (queue.length >= this.MAX_QUEUE_SIZE) {
        logger.warn("Offline queue is full, removing oldest item");
        queue.shift();
      }

      const queueItem: QueueItem = {
        ...item,
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      queue.push(queueItem);
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));

      logger.debug("📤 Added to offline queue:", queueItem);
    } catch (error) {
      logger.error("Failed to add to offline queue:", error);
    }
  }

  static getQueue(): QueueItem[] {
    try {
      const data = localStorage.getItem(this.QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error("Failed to get offline queue:", error);
      return [];
    }
  }

  static async processQueue(): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    logger.info(`📤 Processing ${queue.length} items from offline queue`);

    const failedItems: QueueItem[] = [];

    for (const item of queue) {
      try {
        // Импортируем apiClient динамически чтобы избежать циклических зависимостей
        // Используем fetch напрямую для offline queue
        await fetch(item.url, {
          method: item.method,
          body: item.data ? JSON.stringify(item.data) : undefined,
          headers: {
            "Content-Type": "application/json",
            ...item.headers,
          },
        });

        logger.debug("✅ Successfully processed offline item:", item.id);
      } catch (error) {
        logger.error(`❌ Failed to process offline item: ${item.id}`, error);

        item.retryCount++;

        // Повторяем попытки до 3 раз
        if (item.retryCount < 3) {
          failedItems.push(item);
        } else {
          logger.warn("🗑️ Removing failed item after 3 retries:", item.id);
        }
      }
    }

    // Сохраняем только неудачные элементы для повторной попытки
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(failedItems));
  }

  static clear(): void {
    localStorage.removeItem(this.QUEUE_KEY);
  }

  static getSize(): number {
    return this.getQueue().length;
  }
}

// Initialize offline manager
const offlineManager = OfflineManager.getInstance();

// Process offline queue when connection is restored
offlineManager.subscribe((isOnline) => {
  if (isOnline) {
    // Задержка для стабилизации соединения
    setTimeout(() => {
      OfflineQueue.processQueue();
    }, 1000);
  }
});

export { offlineManager };
