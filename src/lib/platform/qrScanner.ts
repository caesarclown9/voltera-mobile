/**
 * QR Scanner abstraction
 * Согласно MOBILE_PLAN.md - native: MLKit; web: html5-qrcode
 */

import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { isNativePlatform } from "./env";
import { logger } from "@/shared/utils/logger";
type Html5QrcodeType = typeof import("html5-qrcode").Html5Qrcode;
let Html5QrcodeLazy: Html5QrcodeType | null = null;

/**
 * Интерфейс для результата сканирования
 */
export interface QRScanResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Опции для сканирования
 */
export interface QRScanOptions {
  /**
   * Показывать ли UI подсказки
   */
  showHints?: boolean;
  /**
   * Таймаут сканирования в миллисекундах
   */
  timeout?: number;
}

/**
 * Сервис для работы с QR сканером
 */
class QRScannerService {
  private html5QrCode: InstanceType<Html5QrcodeType> | null = null;
  private isScanning = false;

  /**
   * Проверяет наличие разрешений на камеру
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (isNativePlatform()) {
        const { camera } = await BarcodeScanner.checkPermissions();
        return camera === "granted" || camera === "limited";
      } else {
        // Для веба проверяем через Permissions API
        if ("permissions" in navigator && "camera" in navigator.permissions) {
          const result = await navigator.permissions.query({
            name: "camera" as PermissionName,
          });
          return result.state === "granted";
        }
        // Если API недоступно, предполагаем что разрешения будут запрошены
        return true;
      }
    } catch (error) {
      logger.error("QRScanner: failed to check permissions", error);
      return false;
    }
  }

  /**
   * Запрашивает разрешения на камеру
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (isNativePlatform()) {
        const { camera } = await BarcodeScanner.requestPermissions();
        return camera === "granted" || camera === "limited";
      } else {
        // Для веба разрешения запрашиваются при первом использовании камеры
        // Пробуем получить доступ к камере
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          // Сразу останавливаем поток, так как это только проверка
          stream.getTracks().forEach((track) => track.stop());
          return true;
        } catch {
          return false;
        }
      }
    } catch (error) {
      logger.error("QRScanner: failed to request permissions", error);
      return false;
    }
  }

  /**
   * Сканирует QR код
   */
  async scan(options: QRScanOptions = {}): Promise<QRScanResult> {
    try {
      // Проверяем и запрашиваем разрешения
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return {
            success: false,
            error: "Камера не разрешена пользователем",
          };
        }
      }

      if (isNativePlatform()) {
        return await this.scanNative(options);
      } else {
        return await this.scanWeb(options);
      }
    } catch (error) {
      logger.error("QRScanner: scan failed", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Не удалось отсканировать QR код",
      };
    }
  }

  /**
   * Сканирует QR код на нативных платформах
   */
  private async scanNative(_options: QRScanOptions): Promise<QRScanResult> {
    try {
      // Проверяем поддержку сканера
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) {
        return {
          success: false,
          error: "QR сканер не поддерживается на этом устройстве",
        };
      }

      // Запускаем сканирование
      // Используем форматы из enum BarcodeFormat
      const { barcodes } = await BarcodeScanner.scan();

      if (barcodes.length > 0) {
        const barcode = barcodes[0];
        if (!barcode) {
          return {
            success: false,
            error: "QR код не найден",
          };
        }
        logger.info("QRScanner: successfully scanned", {
          format: barcode.format,
        });

        return {
          success: true,
          data: barcode.rawValue,
        };
      }

      return {
        success: false,
        error: "QR код не найден",
      };
    } catch (error) {
      logger.error("QRScanner: native scan error", error);

      // Обработка специфичных ошибок
      if (error instanceof Error) {
        if (error.message.includes("cancelled")) {
          return {
            success: false,
            error: "Сканирование отменено",
          };
        }
        if (error.message.includes("permission")) {
          return {
            success: false,
            error: "Нет доступа к камере",
          };
        }
      }

      return {
        success: false,
        error: "Ошибка сканирования",
      };
    }
  }

  /**
   * Сканирует QR код в вебе
   */
  private async scanWeb(options: QRScanOptions): Promise<QRScanResult> {
    return new Promise((resolve) => {
      // Wrap async logic in IIFE to avoid async executor
      (async () => {
        // Создаем контейнер для сканера если его нет
        let scannerContainer = document.getElementById("qr-scanner-container");
        if (!scannerContainer) {
          scannerContainer = document.createElement("div");
          scannerContainer.id = "qr-scanner-container";
          scannerContainer.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        `;
          document.body.appendChild(scannerContainer);
        }

        // Добавляем область для видео
        const videoContainer = document.createElement("div");
        videoContainer.id = "qr-video-container";
        videoContainer.style.cssText = `
        width: 100%;
        max-width: 500px;
        background: white;
        border-radius: 8px;
        padding: 20px;
      `;

        // Добавляем кнопку закрытия
        const closeButton = document.createElement("button");
        closeButton.textContent = "✕ Закрыть";
        closeButton.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        background: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        font-size: 16px;
        cursor: pointer;
      `;
        closeButton.onclick = () => {
          this.stopWebScanner();
          resolve({
            success: false,
            error: "Сканирование отменено пользователем",
          });
        };

        scannerContainer.appendChild(closeButton);
        scannerContainer.appendChild(videoContainer);

        // Инициализируем html5-qrcode лениво
        if (!Html5QrcodeLazy) {
          const mod = await import("html5-qrcode");
          Html5QrcodeLazy = mod.Html5Qrcode;
        }
        this.html5QrCode = new Html5QrcodeLazy("qr-video-container");
        this.isScanning = true;

        // Настройки сканера
        const qrCodeSuccessCallback = (decodedText: string) => {
          logger.info("QRScanner: successfully scanned QR code");
          this.stopWebScanner();
          resolve({
            success: true,
            data: decodedText,
          });
        };

        const qrCodeErrorCallback = (errorMessage: string) => {
          // Игнорируем постоянные ошибки "QR code not found"
          if (!errorMessage.includes("NotFoundException")) {
            logger.debug("QRScanner: scan attempt", errorMessage);
          }
        };

        // Запускаем сканер
        const qrInstance = this.html5QrCode;
        if (!qrInstance) {
          this.stopWebScanner();
          resolve({
            success: false,
            error: "Не удалось инициализировать сканер",
          });
          return;
        }
        qrInstance
          .start(
            { facingMode: "environment" }, // Используем заднюю камеру
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            qrCodeSuccessCallback,
            qrCodeErrorCallback,
          )
          .catch((err: Error) => {
            logger.error("QRScanner: failed to start web scanner", err);
            this.stopWebScanner();
            resolve({
              success: false,
              error: "Не удалось запустить камеру",
            });
          });

        // Таймаут сканирования
        if (options.timeout) {
          setTimeout(() => {
            if (this.isScanning) {
              this.stopWebScanner();
              resolve({
                success: false,
                error: "Время сканирования истекло",
              });
            }
          }, options.timeout);
        }
      })(); // End of IIFE
    });
  }

  /**
   * Останавливает веб сканер
   */
  private stopWebScanner(): void {
    if (this.html5QrCode && this.isScanning) {
      this.html5QrCode
        .stop()
        .then(() => {
          logger.debug("QRScanner: web scanner stopped");
        })
        .catch((err) => {
          logger.error("QRScanner: error stopping web scanner", err);
        });
    }

    this.isScanning = false;
    this.html5QrCode = null;

    // Удаляем контейнер сканера
    const container = document.getElementById("qr-scanner-container");
    if (container) {
      container.remove();
    }
  }
}

// Экспортируем singleton instance
export const qrScannerService = new QRScannerService();
