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
        // На Android настраиваем status bar в правильном порядке
        if (Capacitor.getPlatform() === "android") {
          // 1. Сначала делаем overlay
          await StatusBar.setOverlaysWebView({ overlay: true });
          // 2. Затем прозрачный фон
          await StatusBar.setBackgroundColor({ color: "#00000000" });
          // 3. И наконец темные иконки (для светлого контента)
          await StatusBar.setStyle({ style: Style.Dark });
        } else if (Capacitor.getPlatform() === "ios") {
          // На iOS также используем overlay и темный стиль
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setStyle({ style: Style.Dark });
        }

        logger.debug("Platform: StatusBar configured");
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
        // Например: evpower://charging/station_001
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
