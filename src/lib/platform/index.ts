/**
 * Platform abstractions export
 * Единая точка входа для всех платформенных функций
 * Согласно RULES.md - единые паттерны во всех модулях
 */

// Экспорт функций определения платформы
export {
  isNativePlatform,
  isWebPlatform,
  getPlatform,
  isIOS,
  isAndroid,
  getPlatformInfo
} from './env';

// Экспорт безопасного хранилища
export {
  secureStorage,
  authStorage,
  type StorageResult
} from './secureStorage';

// Экспорт геолокации
export {
  geolocationService,
  type Coordinates,
  type GeolocationResult,
  type GeolocationOptions
} from './geolocation';

// Экспорт QR сканера
export {
  qrScannerService,
  type QRScanResult,
  type QRScanOptions
} from './qrScanner';

// Экспорт работы с сетью
export {
  networkService,
  type NetworkStatus,
  type ConnectionType,
  type NetworkStatusChangeCallback
} from './network';

// Экспорт push-уведомлений
export {
  pushNotificationService,
  type PushNotification,
  type TokenCallback,
  type NotificationCallback
} from './push';