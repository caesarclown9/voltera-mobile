import { useState, useEffect } from 'react'
import { OfflineQueue } from '../utils/offline'
import { useOnlineStatus } from '../hooks/useNetwork'

export function OfflineIndicator() {
  const isOnline = useOnlineStatus()
  const [queueSize, setQueueSize] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    const updateQueueSize = () => {
      setQueueSize(OfflineQueue.getSize())
    }

    updateQueueSize()
    
    // Обновляем размер очереди каждые 5 секунд
    const interval = setInterval(updateQueueSize, 5000)
    
    return () => clearInterval(interval)
  }, [isOnline])

  // Не показываем индикатор если все в порядке
  if (isOnline && queueSize === 0) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Main status bar */}
      <div 
        className={`px-4 py-2 text-sm font-medium text-white cursor-pointer transition-colors ${
          isOnline 
            ? 'bg-amber-500 hover:bg-amber-600' 
            : 'bg-red-500 hover:bg-red-600'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-center space-x-2">
          {isOnline ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <span>
                {queueSize > 0 
                  ? `Синхронизация... (${queueSize} элементов в очереди)`
                  : 'Подключение восстановлено'
                }
              </span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M12 20h.01" />
              </svg>
              <span>Нет подключения к интернету</span>
            </>
          )}
          
          <svg 
            className={`w-4 h-4 transform transition-transform ${
              showDetails ? 'rotate-180' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Detailed view */}
      {showDetails && (
        <div className={`px-4 py-3 text-sm ${
          isOnline ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
        } border-b`}>
          <div className="max-w-7xl mx-auto">
            {isOnline ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-amber-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Подключение к интернету восстановлено</span>
                </div>
                
                {queueSize > 0 && (
                  <div className="text-amber-700">
                    <p>Синхронизируются данные, которые были сохранены offline:</p>
                    <ul className="mt-1 ml-4 space-y-1">
                      <li>• {queueSize} элементов в очереди</li>
                      <li>• Автоматическая отправка в процессе...</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-red-800">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span>Приложение работает в офлайн режиме</span>
                </div>
                
                <div className="text-red-700">
                  <p>Доступны следующие функции:</p>
                  <ul className="mt-1 ml-4 space-y-1">
                    <li>• Просмотр ранее загруженных данных</li>
                    <li>• Сохранение действий для синхронизации</li>
                    <li>• Базовая навигация по приложению</li>
                  </ul>
                  
                  {queueSize > 0 && (
                    <p className="mt-2">
                      {queueSize} действий будут синхронизированы при восстановлении соединения
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => window.location.reload()}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  isOnline 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Обновить приложение
              </button>
              
              <button
                onClick={() => setShowDetails(false)}
                className="px-3 py-1 rounded text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Свернуть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}