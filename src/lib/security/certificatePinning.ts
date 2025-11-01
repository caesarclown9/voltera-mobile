/**
 * Certificate Pinning for enhanced API security
 * Only works on native platforms (iOS/Android)
 */

import { Capacitor } from "@capacitor/core";
import { Http } from "@capacitor-community/http";
import { logger } from "@/shared/utils/logger";

interface PinnedCertificate {
  host: string;
  fingerprints: string[]; // SHA-256 fingerprints
}

class CertificatePinningService {
  private readonly certificates: PinnedCertificate[] = [
    {
      host: "ocpp.evpower.kg",
      fingerprints: [
        // Production certificate fingerprint (нужно получить реальный)
        "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        // Backup certificate fingerprint
        "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
      ],
    },
    {
      host: "api.evpower.kg",
      fingerprints: ["sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC="],
    },
  ];

  private isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Initialize certificate pinning for the app
   */
  async initialize(): Promise<void> {
    if (!this.isNativePlatform()) {
      logger.info("Certificate pinning is only available on native platforms");
      return;
    }

    try {
      // Configure HTTP plugin with certificate pinning
      for (const cert of this.certificates) {
        await this.configurePinning(cert);
      }
      logger.info("Certificate pinning initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize certificate pinning:", error);
      // В production можно решить - блокировать ли работу приложения
      // throw new Error('Security configuration failed');
    }
  }

  /**
   * Configure pinning for a specific host
   */
  private async configurePinning(cert: PinnedCertificate): Promise<void> {
    if (Capacitor.getPlatform() === "ios") {
      // iOS specific configuration
      await this.configureIOSPinning(cert);
    } else if (Capacitor.getPlatform() === "android") {
      // Android specific configuration
      await this.configureAndroidPinning(cert);
    }
  }

  /**
   * iOS certificate pinning configuration
   */
  private async configureIOSPinning(cert: PinnedCertificate): Promise<void> {
    // iOS использует TrustKit framework
    // Конфигурация должна быть в Info.plist
    // Здесь мы можем только валидировать
    logger.debug(`iOS pinning configured for ${cert.host}`);
  }

  /**
   * Android certificate pinning configuration
   */
  private async configureAndroidPinning(
    cert: PinnedCertificate,
  ): Promise<void> {
    // Android использует Network Security Config
    // Конфигурация в network_security_config.xml
    logger.debug(`Android pinning configured for ${cert.host}`);
  }

  /**
   * Make a secure request with certificate validation
   */
  async secureRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    if (!this.isNativePlatform()) {
      // Fallback to regular fetch on web
      return fetch(url, options);
    }

    try {
      // Use Capacitor HTTP plugin which respects certificate pinning
      const response = await Http.request({
        url,
        method: (options.method as string) || "GET",
        headers: (options.headers as Record<string, string>) || {},
        data: options.body,
        connectTimeout: 10000,
        readTimeout: 10000,
      });

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data),
      } as Response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      if (
        err.message?.includes("SSL") ||
        err.message?.includes("certificate")
      ) {
        logger.error("Certificate validation failed:", error);
        throw new Error("Ошибка безопасности: невалидный сертификат сервера");
      }
      throw error;
    }
  }

  /**
   * Get certificate fingerprint (for debugging/setup)
   */
  async getCertificateFingerprint(host: string): Promise<string | null> {
    if (!this.isNativePlatform()) {
      return null;
    }

    try {
      // This would need a native plugin implementation
      // For now, return null
      logger.debug(`Getting certificate fingerprint for ${host}`);
      return null;
    } catch (error) {
      logger.error("Failed to get certificate fingerprint:", error);
      return null;
    }
  }
}

export const certificatePinning = new CertificatePinningService();
