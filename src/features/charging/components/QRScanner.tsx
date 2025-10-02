import { useState } from 'react'
import { qrScannerService } from '@/lib/platform'

interface QRScanResult {
  stationId: string
  connectorId: string
}

interface QRScannerProps {
  onScan: (result: QRScanResult) => void
  onError?: (error: string) => void
  onCancel?: () => void
}

/**
 * QR Scanner компонент
 * Использует платформенную абстракцию согласно RULES.md
 */
export function QRScanner({ onScan, onError, onCancel }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const handleStartScan = async () => {
    setIsScanning(true)
    setScanError(null)

    try {
      const result = await qrScannerService.scan({
        showHints: true,
        timeout: 60000, // 1 минута на сканирование
      })

      if (result.success && result.data) {
        // Парсим QR код станции
        // Форматы:
        // 1. evpower://station/station_001/connector/1
        // 2. https://app.evpower.kg/charging/station_001?connector=1

        let stationId: string | null = null
        let connectorId: string | null = null

        // Пробуем формат deep link
        const deepLinkMatch = result.data.match(/evpower:\/\/station\/(.+)\/connector\/(.+)/)
        if (deepLinkMatch) {
          stationId = deepLinkMatch[1]
          connectorId = deepLinkMatch[2]
        }

        // Пробуем формат URL
        if (!stationId) {
          const urlMatch = result.data.match(/\/charging\/([^?]+)/)
          const connectorMatch = result.data.match(/connector=(\d+)/)

          if (urlMatch) {
            stationId = urlMatch[1]
            connectorId = connectorMatch ? connectorMatch[1] : '1'
          }
        }

        // Пробуем простой формат (только ID станции)
        if (!stationId && result.data.match(/^[A-Z0-9_-]+$/i)) {
          stationId = result.data
          connectorId = '1' // По умолчанию первый коннектор
        }

        if (stationId) {
          onScan({
            stationId,
            connectorId: connectorId || '1'
          })
        } else {
          const errorMsg = 'Неверный QR код. Используйте QR код зарядной станции EvPower.'
          setScanError(errorMsg)
          onError?.(errorMsg)
        }
      } else {
        // Обработка ошибок сканирования
        const errorMsg = result.error || 'Не удалось отсканировать QR код'
        setScanError(errorMsg)

        // Не вызываем onError для отмены пользователем
        if (!result.error?.includes('отменено')) {
          onError?.(errorMsg)
        }
      }
    } catch (error) {
      const errorMsg = 'Произошла ошибка при сканировании'
      setScanError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setIsScanning(false)
    }
  }

  const handleCancel = () => {
    setIsScanning(false)
    setScanError(null)
    onCancel?.()
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Сканируйте QR код станции
        </h3>
        <p className="text-sm text-gray-600">
          Наведите камеру на QR код зарядной станции или нажмите кнопку ниже
        </p>
      </div>

      {scanError && (
        <div className="w-full max-w-sm p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{scanError}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {!isScanning ? (
          <>
            <button
              onClick={handleStartScan}
              className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2m-2 0a1 1 0 00-1 1v6a1 1 0 001 1h2m14-8h2a1 1 0 011 1v6a1 1 0 01-1 1h-2m-2-4H9m4-4V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v4"
                />
              </svg>
              Сканировать QR код
            </button>

            {onCancel && (
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            <span className="text-gray-600">Подготовка камеры...</span>
          </div>
        )}
      </div>

      {/* Информация о ручном вводе */}
      <div className="mt-6 pt-6 border-t border-gray-200 w-full max-w-sm">
        <p className="text-sm text-gray-500 text-center">
          Не получается отсканировать? Вы можете выбрать станцию из списка или на карте
        </p>
      </div>
    </div>
  )
}