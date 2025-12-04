import { logger } from "./logger";

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class NotificationService {
  private static readonly PUBLIC_VAPID_KEY =
    import.meta.env["VITE_VAPID_PUBLIC_KEY"] || "";

  /**
   * Запрашивает разрешение на уведомления
   */
  static async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      logger.warn("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission === "denied") {
      logger.warn("Notifications are blocked by the user");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (error) {
      logger.error("Error requesting notification permission:", error);
      return false;
    }
  }

  /**
   * Подписывается на push уведомления
   */
  static async subscribeToPush(): Promise<PushSubscription | null> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      logger.warn("Push messaging is not supported");
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      if (!registration.pushManager) {
        logger.warn("Push manager unavailable");
        return null;
      }

      // Проверяем существующую подписку
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription && this.PUBLIC_VAPID_KEY) {
        // Создаем новую подписку
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            this.PUBLIC_VAPID_KEY,
          ) as BufferSource,
        });
      }

      if (subscription) {
        // Отправляем подписку на бэкенд (должно быть реализовано)
        // await apiClient.post('/api/notifications/subscribe', subscription);
        logger.debug("Push subscription created:", subscription);
      }

      return subscription;
    } catch (error) {
      logger.error("Error subscribing to push notifications:", error);
      return null;
    }
  }

  /**
   * Отправляет локальное уведомление
   */
  static async showNotification(
    title: string,
    options?: NotificationOptions & {
      action?: string;
      data?: unknown;
    },
  ): Promise<void> {
    if (!("Notification" in window)) {
      logger.warn("Notifications not supported");
      return;
    }

    const permission = await this.requestPermission();
    if (!permission) {
      logger.warn("Notification permission not granted");
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: "/icons/manifest-icon-192.maskable.png",
      badge: "/icons/manifest-icon-192.maskable.png",
      // image: options?.image, // Не поддерживается в стандартном API
      // vibrate: [200, 100, 200], // Не поддерживается в стандартном Notification API
      requireInteraction: false,
      tag: "evpower-notification",
      ...options,
    };

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, defaultOptions);
      } else {
        new Notification(title, defaultOptions);
      }
    } catch (error) {
      logger.error("Error showing notification:", error);
    }
  }

  /**
   * Уведомления для зарядки
   */
  static async notifyChargingStarted(stationId: string): Promise<void> {
    await this.showNotification("Зарядка началась", {
      body: `Зарядка на станции ${stationId} успешно запущена`,
      tag: "charging-started",
      data: { stationId, type: "charging_started" },
    });
  }

  static async notifyChargingComplete(
    stationId: string,
    energy: number,
    cost: number,
  ): Promise<void> {
    await this.showNotification("Зарядка завершена", {
      body: `Заряжено ${energy.toFixed(1)} кВт·ч на сумму ${cost.toFixed(2)} сом`,
      tag: "charging-complete",
      data: { stationId, energy, cost, type: "charging_complete" },
      requireInteraction: true,
    });
  }

  static async notifyChargingError(
    stationId: string,
    error: string,
  ): Promise<void> {
    await this.showNotification("Ошибка зарядки", {
      body: `Проблема на станции ${stationId}: ${error}`,
      tag: "charging-error",
      data: { stationId, error, type: "charging_error" },
      requireInteraction: true,
    });
  }

  static async notifyLowBalance(balance: number): Promise<void> {
    await this.showNotification("Низкий баланс", {
      body: `Ваш баланс ${balance.toFixed(2)} сом. Рекомендуем пополнить`,
      tag: "low-balance",
      data: { balance, type: "low_balance" },
      // actions не поддерживается в стандартном Notification API
      // Используется только в Service Worker notifications
    });
  }

  /**
   * Очищает старые уведомления
   */
  static async clearNotifications(tag?: string): Promise<void> {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const notifications = await registration.getNotifications(
        tag ? { tag } : {},
      );

      notifications.forEach((notification) => notification.close());
    } catch (error) {
      logger.error("Error clearing notifications:", error);
    }
  }

  /**
   * Проверяет поддержку уведомлений
   */
  static isSupported(): boolean {
    return "Notification" in window && "serviceWorker" in navigator;
  }

  /**
   * Возвращает текущее разрешение
   */
  static getPermission(): NotificationPermission {
    return Notification.permission;
  }
}
