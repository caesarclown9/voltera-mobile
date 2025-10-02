/**
 * Geolocation abstraction
 * Согласно MOBILE_PLAN.md - единый интерфейс для web и native
 */

import { Geolocation } from '@capacitor/geolocation';
import { isNativePlatform } from './env';
import { logger } from '@/shared/utils/logger';

/**
 * Интерфейс для координат
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

/**
 * Интерфейс для результата геолокации
 */
export interface GeolocationResult {
  success: boolean;
  coords?: Coordinates;
  error?: string;
}

/**
 * Опции для получения геолокации
 */
export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * Сервис для работы с геолокацией
 */
class GeolocationService {
  /**
   * Запрашивает разрешения на использование геолокации
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (isNativePlatform()) {
        const permissions = await Geolocation.requestPermissions();
        return permissions.location === 'granted' || permissions.coarseLocation === 'granted';
      } else {
        // Для веба разрешения запрашиваются автоматически при вызове getCurrentPosition
        return true;
      }
    } catch (error) {
      logger.error('Geolocation: failed to request permissions', error);
      return false;
    }
  }

  /**
   * Проверяет наличие разрешений на геолокацию
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (isNativePlatform()) {
        const permissions = await Geolocation.checkPermissions();
        return permissions.location === 'granted' || permissions.coarseLocation === 'granted';
      } else {
        // Для веба проверяем через Permissions API
        if ('permissions' in navigator) {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          return result.state === 'granted';
        }
        return true; // Предполагаем, что разрешения будут запрошены
      }
    } catch (error) {
      logger.error('Geolocation: failed to check permissions', error);
      return false;
    }
  }

  /**
   * Получает текущую позицию пользователя
   */
  async getCurrentPosition(options?: GeolocationOptions): Promise<GeolocationResult> {
    try {
      // Сначала проверяем разрешения
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return {
            success: false,
            error: 'Геолокация не разрешена пользователем'
          };
        }
      }

      const defaultOptions: GeolocationOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        ...options
      };

      if (isNativePlatform()) {
        // Используем Capacitor Geolocation для нативных платформ
        const position = await Geolocation.getCurrentPosition(defaultOptions);

        return {
          success: true,
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
          }
        };
      } else {
        // Используем Web API для PWA
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                success: true,
                coords: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  altitude: position.coords.altitude,
                  altitudeAccuracy: position.coords.altitudeAccuracy,
                  heading: position.coords.heading,
                  speed: position.coords.speed
                }
              });
            },
            (error) => {
              logger.error('Geolocation: Web API error', error);
              resolve({
                success: false,
                error: this.getErrorMessage(error)
              });
            },
            defaultOptions
          );
        });
      }
    } catch (error) {
      logger.error('Geolocation: failed to get position', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Не удалось определить местоположение'
      };
    }
  }

  /**
   * Начинает отслеживание позиции пользователя
   */
  async watchPosition(
    callback: (position: GeolocationResult) => void,
    options?: GeolocationOptions
  ): Promise<string | number> {
    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options
    };

    if (isNativePlatform()) {
      // Для нативных платформ используем Capacitor
      const watchId = await Geolocation.watchPosition(defaultOptions, (position, err) => {
        if (err) {
          callback({
            success: false,
            error: err.message
          });
        } else if (position) {
          callback({
            success: true,
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed
            }
          });
        }
      });

      return watchId;
    } else {
      // Для веба используем Web API
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          callback({
            success: true,
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed
            }
          });
        },
        (error) => {
          callback({
            success: false,
            error: this.getErrorMessage(error)
          });
        },
        defaultOptions
      );

      return watchId;
    }
  }

  /**
   * Останавливает отслеживание позиции
   */
  async clearWatch(watchId: string | number): Promise<void> {
    if (isNativePlatform()) {
      await Geolocation.clearWatch({ id: watchId as string });
    } else {
      navigator.geolocation.clearWatch(watchId as number);
    }
  }

  /**
   * Преобразует ошибку геолокации в понятное сообщение
   */
  private getErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Доступ к геолокации запрещен';
      case error.POSITION_UNAVAILABLE:
        return 'Информация о местоположении недоступна';
      case error.TIMEOUT:
        return 'Превышено время ожидания запроса геолокации';
      default:
        return 'Не удалось определить местоположение';
    }
  }
}

// Экспортируем singleton instance
export const geolocationService = new GeolocationService();