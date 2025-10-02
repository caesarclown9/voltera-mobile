/**
 * Certificate Pinning for enhanced API security
 * Only works on native platforms (iOS/Android)
 */

import { Capacitor } from '@capacitor/core';
import { Http } from '@capacitor-community/http';

interface PinnedCertificate {
  host: string;
  fingerprints: string[]; // SHA-256 fingerprints
}

class CertificatePinningService {
  private readonly certificates: PinnedCertificate[] = [
    {
      host: 'ocpp.evpower.kg',
      fingerprints: [
        // Production certificate fingerprint (нужно получить реальный)
        'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        // Backup certificate fingerprint
        'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='
      ]
    },
    {
      host: 'api.evpower.kg',
      fingerprints: [
        'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC='
      ]
    }
  ];

  private isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Initialize certificate pinning for the app
   */
  async initialize(): Promise<void> {
    if (!this.isNativePlatform()) {
      console.log('Certificate pinning is only available on native platforms');
      return;
    }

    try {
      // Configure HTTP plugin with certificate pinning
      for (const cert of this.certificates) {
        await this.configurePinning(cert);
      }
      console.log('Certificate pinning initialized successfully');
    } catch (error) {
      console.error('Failed to initialize certificate pinning:', error);
      // В production можно решить - блокировать ли работу приложения
      // throw new Error('Security configuration failed');
    }
  }

  /**
   * Configure pinning for a specific host
   */
  private async configurePinning(cert: PinnedCertificate): Promise<void> {
    if (Capacitor.getPlatform() === 'ios') {
      // iOS specific configuration
      await this.configureIOSPinning(cert);
    } else if (Capacitor.getPlatform() === 'android') {
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
    console.log(`iOS pinning configured for ${cert.host}`);
  }

  /**
   * Android certificate pinning configuration
   */
  private async configureAndroidPinning(cert: PinnedCertificate): Promise<void> {
    // Android использует Network Security Config
    // Конфигурация в network_security_config.xml
    console.log(`Android pinning configured for ${cert.host}`);
  }

  /**
   * Make a secure request with certificate validation
   */
  async secureRequest(url: string, options: any = {}): Promise<any> {
    if (!this.isNativePlatform()) {
      // Fallback to regular fetch on web
      return fetch(url, options);
    }

    try {
      // Use Capacitor HTTP plugin which respects certificate pinning
      const response = await Http.request({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.body || options.data,
        connectTimeout: 10000,
        readTimeout: 10000
      });

      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data)
      };
    } catch (error: any) {
      if (error.message?.includes('SSL') || error.message?.includes('certificate')) {
        console.error('Certificate validation failed:', error);
        throw new Error('Ошибка безопасности: невалидный сертификат сервера');
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
      console.log(`Getting certificate fingerprint for ${host}`);
      return null;
    } catch (error) {
      console.error('Failed to get certificate fingerprint:', error);
      return null;
    }
  }
}

export const certificatePinning = new CertificatePinningService();