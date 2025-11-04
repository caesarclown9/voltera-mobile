import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "kg.voltera.app",
  appName: "Voltera",
  webDir: "dist",
  server: {
    // Для безопасности используем https схему на Android
    androidScheme: "https",
    // Исключаем localhost из проверок для разработки
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3B82F6", // Primary electric blue color
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Используем системный стиль по умолчанию (адаптивный)
      style: "DEFAULT",
    },
  },
  ios: {
    // Настройки для iOS
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    // Настройки для Android
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Автоматическая поддержка edge-to-edge для Android 15+
    // Заменяет deprecated StatusBar.setBackgroundColor() и setOverlaysWebView()
    // См. https://capacitorjs.com/docs/config#androidadjustmarginsforedgetoedge
    adjustMarginsForEdgeToEdge: "auto",
  },
};

export default config;
