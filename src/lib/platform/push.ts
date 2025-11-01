/**
 * Push notifications abstraction
 * Согласно MOBILE_PLAN.md - native пуши (APNs/FCM) + web-заглушка
 */

import {
  PushNotifications,
  type PushNotificationSchema,
  type Token,
  type ActionPerformed
} from '@capacitor/push-notifications';
import { isNativePlatform, getPlatform } from './env';
import { logger } from '@/shared/utils/logger';
import { evpowerApi } from '@/services/evpowerApi';
import { APP_VERSION } from '@/lib/versionManager';

/**
 * Интерфейс для push-уведомления
 */
export interface PushNotification {
  id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  badge?: number;
}

/**
 * Callback для получения токена
 */
export type TokenCallback = (token: string) => void;

/**
 * Callback для получения уведомления
 */
export type NotificationCallback = (notification: PushNotification) => void;

/**
 * Сервис для работы с push-уведомлениями
 */
class PushNotificationService {
  private tokenCallbacks: Set<TokenCallback> = new Set();
  private notificationCallbacks: Set<NotificationCallback> = new Set();
  private currentToken: string | null = null;
  private isInitialized = false;

  /**
   * Инициализирует push-уведомления
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      if (isNativePlatform()) {
        // Регистрируем слушатели для нативных платформ
        await this.initializeNative();
        this.isInitialized = true;
        return true;
      } else {
        // Для веба пока используем заглушку
        // TODO: Реализовать Web Push API когда backend будет готов
        logger.info('Push: Web push notifications not yet implemented');
        this.isInitialized = true;
        return false;
      }
    } catch (error) {
      logger.error('Push: initialization failed', error);
      return false;
    }
  }

  /**
   * Инициализирует нативные push-уведомления
   */
  private async initializeNative(): Promise<void> {
    // Слушатель регистрации (получение токена)
    await PushNotifications.addListener('registration', async (token: Token) => {
      logger.info('Push: device registered with token');
      this.currentToken = token.value;

      // Регистрируем токен на бэкенде
      try {
        const platform = getPlatform();
        const result = await evpowerApi.registerDevice(
          token.value,
          platform,
          APP_VERSION
        );

        if (result.success) {
          logger.info('Push: token registered on backend');
        } else {
          logger.warn('Push: failed to register token on backend', result.message);
        }
      } catch (error) {
        logger.error('Push: error registering token on backend', error);
      }

      this.notifyTokenCallbacks(token.value);
    });

    // Слушатель ошибок регистрации
    await PushNotifications.addListener('registrationError', (error: unknown) => {
      logger.error('Push: registration error', error);
    });

    // Слушатель получения уведомлений (когда приложение открыто)
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        logger.info('Push: notification received', notification);
        this.handleNotification(notification);
      }
    );

    // Слушатель действий с уведомлением (клик по уведомлению)
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        logger.info('Push: notification action performed', notification);
        this.handleNotificationAction(notification);
      }
    );
  }

  /**
   * Запрашивает разрешения на push-уведомления
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (isNativePlatform()) {
        const result = await PushNotifications.requestPermissions();
        return result.receive === 'granted';
      } else {
        // Для веба используем Notification API
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
        return false;
      }
    } catch (error) {
      logger.error('Push: failed to request permissions', error);
      return false;
    }
  }

  /**
   * Проверяет наличие разрешений
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (isNativePlatform()) {
        const result = await PushNotifications.checkPermissions();
        return result.receive === 'granted';
      } else {
        // Для веба проверяем Notification API
        if ('Notification' in window) {
          return Notification.permission === 'granted';
        }
        return false;
      }
    } catch (error) {
      logger.error('Push: failed to check permissions', error);
      return false;
    }
  }

  /**
   * Регистрирует устройство для получения push-уведомлений
   */
  async register(): Promise<string | null> {
    try {
      // Сначала проверяем разрешения
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          logger.warn('Push: permissions not granted');
          return null;
        }
      }

      if (isNativePlatform()) {
        // Инициализируем если еще не инициализировано
        if (!this.isInitialized) {
          await this.initialize();
        }

        // Регистрируем устройство
        await PushNotifications.register();

        // Ждем получения токена (с таймаутом)
        return new Promise((resolve) => {
          // Если токен уже есть, возвращаем его
          if (this.currentToken) {
            resolve(this.currentToken);
            return;
          }

          // Ждем токен с таймаутом
          const timeout = setTimeout(() => {
            logger.warn('Push: token registration timeout');
            resolve(null);
          }, 10000);

          const callback: TokenCallback = (token) => {
            clearTimeout(timeout);
            this.removeTokenListener(callback);
            resolve(token);
          };

          this.addTokenListener(callback);
        });
      } else {
        // Для веба возвращаем заглушку
        logger.info('Push: web registration not implemented');
        return null;
      }
    } catch (error) {
      logger.error('Push: registration failed', error);
      return null;
    }
  }

  /**
   * Получает текущий токен устройства
   */
  getToken(): string | null {
    return this.currentToken;
  }

  /**
   * Отменяет регистрацию устройства (при выходе из аккаунта)
   */
  async unregister(): Promise<boolean> {
    try {
      if (!this.currentToken) {
        logger.warn('Push: no token to unregister');
        return false;
      }

      // Удаляем токен с бэкенда
      const result = await evpowerApi.unregisterDevice(this.currentToken);

      if (result.success) {
        logger.info('Push: token unregistered from backend');
        this.currentToken = null;
        return true;
      } else {
        logger.warn('Push: failed to unregister token from backend');
        return false;
      }
    } catch (error) {
      logger.error('Push: error unregistering token', error);
      return false;
    }
  }

  /**
   * Добавляет слушатель для получения токена
   */
  addTokenListener(callback: TokenCallback): void {
    this.tokenCallbacks.add(callback);

    // Если токен уже есть, сразу вызываем callback
    if (this.currentToken) {
      callback(this.currentToken);
    }
  }

  /**
   * Удаляет слушатель токена
   */
  removeTokenListener(callback: TokenCallback): void {
    this.tokenCallbacks.delete(callback);
  }

  /**
   * Добавляет слушатель для получения уведомлений
   */
  addNotificationListener(callback: NotificationCallback): void {
    this.notificationCallbacks.add(callback);
  }

  /**
   * Удаляет слушатель уведомлений
   */
  removeNotificationListener(callback: NotificationCallback): void {
    this.notificationCallbacks.delete(callback);
  }

  /**
   * Показывает локальное уведомление (для MVP)
   */
  async showLocalNotification(notification: PushNotification): Promise<void> {
    try {
      if (isNativePlatform()) {
        // Для нативных платформ можно использовать Local Notifications plugin
        // Пока используем системный алерт как заглушку
        logger.info('Push: showing local notification', notification);

        // TODO: Добавить @capacitor/local-notifications для полноценных локальных уведомлений
      } else {
        // Для веба используем Notification API
        if ('Notification' in window && Notification.permission === 'granted') {
          const webNotification = new Notification(notification.title || 'EvPower', {
            body: notification.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            data: notification.data,
            tag: notification.id
          });

          webNotification.onclick = () => {
            window.focus();
            this.handleNotificationAction({
              actionId: 'tap',
              notification: {
                ...notification,
                id: notification.id || ''
              } as PushNotificationSchema
            } as ActionPerformed);
          };
        }
      }
    } catch (error) {
      logger.error('Push: failed to show local notification', error);
    }
  }

  /**
   * Обрабатывает полученное уведомление
   */
  private handleNotification(notification: PushNotificationSchema): void {
    const pushNotification: PushNotification = {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      badge: notification.badge
    };

    // Уведомляем всех слушателей
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(pushNotification);
      } catch (error) {
        logger.error('Push: error in notification callback', error);
      }
    });
  }

  /**
   * Обрабатывает действие с уведомлением
   */
  private handleNotificationAction(action: ActionPerformed): void {
    // Обрабатываем навигацию или другие действия
    const data = action.notification.data;

    if (data) {
      // Например, переход на страницу зарядки
      if (data.sessionId) {
        // TODO: Implement navigation to charging session
        logger.info('Push: navigate to charging session', data.sessionId);
      }

      // Или показ уведомления о завершении
      if (data.type === 'charging_complete') {
        // TODO: Show charging complete notification
        logger.info('Push: charging complete', data);
      }
    }
  }

  /**
   * Уведомляет слушателей о получении токена
   */
  private notifyTokenCallbacks(token: string): void {
    this.tokenCallbacks.forEach(callback => {
      try {
        callback(token);
      } catch (error) {
        logger.error('Push: error in token callback', error);
      }
    });
  }
}

// Экспортируем singleton instance
export const pushNotificationService = new PushNotificationService();