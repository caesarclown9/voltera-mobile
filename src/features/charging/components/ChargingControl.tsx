import { useState } from 'react'
import { useCharging } from '../hooks/useCharging'
import { QRScanner } from './QRScanner'

interface ChargingControlProps {
  onChargingStart?: (sessionId: string) => void
}

export function ChargingControl({ onChargingStart }: ChargingControlProps) {
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  
  const { startCharging, isStarting } = useCharging()

  const handleQRScan = async (result: { stationId: string; connectorId: string }) => {
    try {
      setScanError(null)
      const response = await startCharging({
        stationId: result.stationId,
        connectorId: result.connectorId,
      })
      
      if (response.success) {
        onChargingStart?.(response.sessionId)
        setShowQRScanner(false)
      } else {
        setScanError(response.message || 'Ошибка запуска зарядки')
      }
    } catch (_error) {
      setScanError('Произошла ошибка при запуске зарядки')
    }
  }

  const handleScanError = (error: string) => {
    setScanError(error)
  }

  if (showQRScanner) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <QRScanner 
          onScan={handleQRScan}
          onError={handleScanError}
        />
        
        {scanError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{scanError}</p>
          </div>
        )}
        
        <button
          onClick={() => {
            setShowQRScanner(false)
            setScanError(null)
          }}
          className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Отмена
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Управление зарядкой
        </h2>
        
        <div className="space-y-4">
          <button
            onClick={() => setShowQRScanner(true)}
            disabled={isStarting}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {isStarting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Запуск...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h4.01M12 12v4.01" />
                </svg>
                Сканировать QR код
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-600">
            Отсканируйте QR код на зарядной станции для начала зарядки
          </p>
        </div>
      </div>
    </div>
  )
}