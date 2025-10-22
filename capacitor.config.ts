import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "kg.evpower.app",
  appName: "EvPower",
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
      backgroundColor: "#10B981", // Primary green color
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
  },
};

export default config;
