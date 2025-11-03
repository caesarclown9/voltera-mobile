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

// Register service worker using VitePWA
import { registerSW } from "virtual:pwa-register";

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

// Инициализируем Sentry для production мониторинга
// initSentry() // Uncomment after installing @sentry/react

// Инициализируем платформенные сервисы
initializePlatformServices().then(() => {
  registerPlatformHandlers();
  logger.info("Platform services ready");
});

createRoot(document.getElementById("root")!).render(<App />);
