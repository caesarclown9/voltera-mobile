/**
 * Инициализация платформенных сервисов
 * Согласно MOBILE_PLAN.md
 */

import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
// Push notifications disabled in Variant A
import { logger } from "@/shared/utils/logger";

/**
 * Инициализирует все платформенные сервисы при запуске приложения
 */
export const initializePlatformServices = async () => {
  try {
    logger.info("Platform: Initializing services", {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
    });

    if (Capacitor.isNativePlatform()) {
      // Настройка StatusBar для нативных платформ
      try {
        if (Capacitor.getPlatform() === "android") {
          // Android: Edge-to-edge управляется через:
          // 1. MainActivity.java - современный WindowInsetsController API (без deprecated методов)
          // 2. capacitor.config.ts - adjustMarginsForEdgeToEdge: 'auto'
          //
          // StatusBar плагин НЕ используется на Android, так как:
          // - setBackgroundColor() использует deprecated window.setStatusBarColor()
          // - setOverlaysWebView() использует deprecated window.getStatusBarColor()
          // - setStyle() тоже триггерит deprecated API внутри плагина
          //
          // Google Play требует отказаться от этих API для Android 15+ (API 35)
          // См. https://developer.android.com/about/versions/15/behavior-changes-15#edge-to-edge
          logger.debug(
            "Platform: Android edge-to-edge configured via MainActivity + Capacitor config",
          );
        } else if (Capacitor.getPlatform() === "ios") {
          // iOS: StatusBar плагин работает корректно, deprecated API только на Android
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setStyle({ style: Style.Dark });
          logger.debug("Platform: iOS StatusBar configured");
        }
      } catch (error) {
        logger.warn("Platform: StatusBar configuration failed", error);
      }

      // Push notifications disabled (Variant A)

      // Скрываем SplashScreen после инициализации
      try {
        await SplashScreen.hide();
        logger.debug("Platform: SplashScreen hidden");
      } catch (error) {
        logger.warn("Platform: SplashScreen hide failed", error);
      }
    }

    // Инициализация для всех платформ
    logger.info("Platform: Services initialized successfully");
  } catch (error) {
    logger.error("Platform: Initialization error", error);
  }
};

/**
 * Регистрирует обработчики для платформенных событий
 */
export const registerPlatformHandlers = () => {
  if (Capacitor.isNativePlatform()) {
    // Обработка Android back button
    if (Capacitor.getPlatform() === "android") {
      import("@capacitor/app").then(({ App }) => {
        App.addListener("backButton", ({ canGoBack }) => {
          if (!canGoBack) {
            App.exitApp();
          } else {
            window.history.back();
          }
        });
        logger.debug("Platform: Android back button handler registered");
      });
    }

    // Обработка изменений состояния приложения
    import("@capacitor/app").then(({ App }) => {
      App.addListener("appStateChange", ({ isActive }) => {
        logger.debug("Platform: App state changed", { isActive });

        // Можно добавить логику для паузы/возобновления операций
        if (isActive) {
          // Приложение стало активным
          // Например, возобновить polling
        } else {
          // Приложение ушло в фон
          // Например, приостановить polling
        }
      });
    });

    // Обработка deep links
    import("@capacitor/app").then(({ App }) => {
      App.addListener("appUrlOpen", ({ url }) => {
        logger.info("Platform: Deep link opened", { url });

        // Обработка deep links для зарядки
        // Например: voltera://charging/station_001
        if (url.includes("charging")) {
          const match = url.match(/charging\/([^?/]+)/);
          if (match) {
            // TODO: Навигация к странице зарядки
            window.location.href = `/charging/${match[1]}`;
          }
        }
      });
    });
  }
};

/**
 * Очистка ресурсов при завершении приложения
 */
export const cleanupPlatformServices = () => {
  // Очистка слушателей и ресурсов
  if (Capacitor.isNativePlatform()) {
    import("@capacitor/app").then(({ App }) => {
      App.removeAllListeners();
    });
  }

  logger.info("Platform: Services cleanup completed");
};
