import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { logger } from "./shared/utils/logger";
import "./shared/utils/errorMonitoring";
// import { initSentry } from './shared/monitoring/sentry' // Uncomment after installing @sentry/react
import {
  initializePlatformServices,
  registerPlatformHandlers,
} from "./lib/platform/init";
import { isNativePlatform } from "./lib/platform/env";

// Register service worker using VitePWA
// ВАЖНО: Service Worker не поддерживается в нативных iOS/Android приложениях Capacitor
// На iOS WKWebView использует capacitor:// протокол, который не поддерживает SW
// См. https://github.com/ionic-team/capacitor/issues/7069
if (!isNativePlatform()) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({
        onNeedRefresh() {
          logger.info("New content available, please refresh.");
        },
        onOfflineReady() {
          logger.info("App ready to work offline");
        },
        onRegistered(registration) {
          logger.info("SW registered:", registration);
        },
        onRegisteredSW(swScriptUrl) {
          logger.info("SW registered:", swScriptUrl);
        },
        onRegisterError(error) {
          logger.error("SW registration error:", error);
        },
      });
    })
    .catch((error) => {
      // Не критичная ошибка - приложение работает и без SW
      logger.warn("SW registration skipped:", error);
    });
} else {
  logger.info("SW registration skipped: running on native platform");
}

// Инициализируем Sentry для production мониторинга
// initSentry() // Uncomment after installing @sentry/react

// Инициализируем платформенные сервисы
initializePlatformServices().then(() => {
  registerPlatformHandlers();
  logger.info("Platform services ready");
});

createRoot(document.getElementById("root")!).render(<App />);
