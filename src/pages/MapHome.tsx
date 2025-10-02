import { useState, useEffect } from 'react'
import { useStations } from '../features/locations/hooks/useLocations'
import { useLocationUpdates } from '../features/locations/hooks/useLocations'
import { useGeolocation } from '../shared/hooks/useGeolocation'
import { StationMap } from '../features/stations/components/StationMap'
import { motion, AnimatePresence } from 'framer-motion'
import type { Station } from '../api/types'
import type { StationWithLocation } from '../features/stations/types'
import { logger } from '../shared/utils/logger'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useBalance } from '../features/balance/hooks/useBalance'
import { SimpleTopup } from '../features/balance/components/SimpleTopup'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { parsePrice } from '../shared/utils/parsers'

export default function MapHome() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStation, setSelectedStation] = useState<StationWithLocation | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showTopup, setShowTopup] = useState(false)
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number; zoom?: number } | undefined>(undefined)
  const [selectedStationId, setSelectedStationId] = useState<string | undefined>(undefined)
  const { user } = useAuth()
  const { data: balance } = useBalance()

  // Получаем данные станций (показываем все для карты)
  const { stations, isLoading, error } = useStations(true) // true = запрашиваем геолокацию для карты
  
  // Подключаемся к real-time обновлениям для всех локаций
  useLocationUpdates(['all'])
  
  // Геолокация пользователя
  // ВАЖНО: Используем enableHighAccuracy: false для соответствия политикам магазинов
  // Это даст примерную геолокацию (Wi-Fi/сеть) без GPS, что безопаснее для батареи
  const {
    latitude,
    longitude,
    loading: locationLoading,
    getCurrentPosition
  } = useGeolocation({
    enableHighAccuracy: false,  // Примерная геолокация для безопасности
    maximumAge: 30000,          // Кешируем на 30 секунд
    timeout: 10000              // Таймаут 10 секунд
  })

  const userLocation: [number, number] | undefined = 
    latitude && longitude ? [latitude, longitude] : undefined

  // Автоматически запрашиваем геолокацию при загрузке
  useEffect(() => {
    getCurrentPosition()
  }, [])

  // Обрабатываем навигацию со страницы списка станций
  useEffect(() => {
    if (location.state?.focusLocation && stations) {
      const stationId = location.state.selectedStationId
      
      // Устанавливаем фокус на локацию
      setFocusLocation(location.state.focusLocation)
      setSelectedStationId(stationId)
      
      // Находим и выбираем станцию
      const station = stations.find(s => s.id === stationId)
      if (station) {
        setSelectedStation(station)
      }
      
      // Очищаем state после использования
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, stations])

  // Обрабатываем поиск станций
  const filteredStations = stations?.filter(station =>
    station.locationName || station.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    station.locationAddress.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const handleStationSelect = (station: Station) => {
    // Переходим на страницу зарядки станции
    if (station.serial_number) {
      navigate(`/charging/${station.serial_number}`)
    } else {
      setSelectedStation(station)
      logger.debug('Selected station:', station)
    }
  }

  const stationFilters = [
    { id: 'available', label: 'Доступные', icon: '🟢', count: filteredStations.filter(s => s.status === 'active').length },
    { id: 'fast', label: 'Быстрые', icon: '⚡', count: filteredStations.filter(s => s.power_capacity >= 50).length },
    { id: 'nearby', label: 'Рядом', icon: '📍', count: filteredStations.filter(s => (s.distance || 0) < 5).length },
  ]

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-5xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ошибка загрузки</h2>
          <p className="text-gray-600 mb-6">Не удалось загрузить список станций</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-green-500 to-cyan-500 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Попробовать снова
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Fullscreen Map */}
      <div className="absolute inset-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
              <p className="text-gray-600">Загрузка карты...</p>
            </motion.div>
          </div>
        ) : (
          <StationMap
            stations={filteredStations}
            userLocation={userLocation}
            onStationSelect={handleStationSelect}
            focusLocation={focusLocation}
            selectedStationId={selectedStationId}
          />
        )}
      </div>

      {/* Top Controls Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Search Bar */}
          <AnimatePresence>
            {showSearch ? (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-lg p-2 mb-3"
              >
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Найти станцию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setShowSearch(false)
                      setSearchQuery('')
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2"
              >
                <button
                  onClick={() => setShowSearch(true)}
                  className="bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2 flex-1"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-gray-500">Поиск станций...</span>
                </button>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-white rounded-2xl shadow-lg p-3"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filter Chips */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-2 overflow-x-auto pb-2"
              >
                {stationFilters.map((filter) => (
                  <button
                    key={filter.id}
                    className="bg-white rounded-xl px-3 py-2 shadow-md flex items-center gap-1 whitespace-nowrap hover:shadow-lg transition-shadow"
                  >
                    <span>{filter.icon}</span>
                    <span className="text-sm font-medium">{filter.label}</span>
                    <span className="text-xs text-gray-500">({filter.count})</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User Balance Card (Top Right) */}
      {user && balance && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-4 right-4 bg-white rounded-2xl shadow-lg p-3 w-40"
        >
          <p className="text-xs text-gray-500 mb-1">Баланс</p>
          <p className="text-lg font-bold text-gray-900">
            {balance.balance.toFixed(2)} KGS
          </p>
          <button
            onClick={() => setShowTopup(true)}
            className="block w-full mt-2 bg-green-500 text-white text-center py-1.5 rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
          >
            Пополнить
          </button>
        </motion.div>
      )}

      {/* Location Button (Bottom Right) */}
      <button
        onClick={getCurrentPosition}
        disabled={locationLoading}
        className="absolute bottom-24 right-4 bg-white rounded-full shadow-lg p-4 hover:shadow-xl transition-shadow disabled:opacity-50"
      >
        {locationLoading ? (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        ) : userLocation ? (
          <div className="relative">
            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
            </svg>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        ) : (
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>

      {/* Quick Actions (Bottom Left) */}
      <div className="absolute bottom-24 left-4 flex flex-col gap-2">
        <Link
          to="/stations"
          className="bg-white rounded-full shadow-lg p-3 hover:shadow-xl transition-shadow"
          title="Список станций"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </Link>
      </div>

      {/* Selected Location Bottom Sheet */}
      <AnimatePresence>
        {selectedStation && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 500 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 safe-area-bottom max-h-[70vh] overflow-y-auto"
          >
            <div className="p-5">
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{selectedStation.locationName || selectedStation.model}</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedStation.locationAddress}</p>
                </div>
                <button
                  onClick={() => setSelectedStation(null)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                    selectedStation.status === 'active' ? 'bg-green-500' :
                    selectedStation.status === 'maintenance' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`}></div>
                  <p className="text-xs text-gray-500">
                    {selectedStation.status === 'active' ? 'Доступна' :
                     selectedStation.status === 'maintenance' ? 'Обслуживание' :
                     'Недоступна'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{selectedStation.power_capacity}kW</p>
                  <p className="text-xs text-gray-500">Мощность</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{selectedStation.price_per_kwh.toFixed(2)} KGS</p>
                  <p className="text-xs text-gray-500">за кВт/ч</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const url = `https://maps.google.com/?q=${selectedStation.latitude},${selectedStation.longitude}`
                    window.open(url, '_blank')
                  }}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                >
                  <span>🧭</span>
                  <span>Маршрут</span>
                </button>
                {selectedStation.status === 'active' && (
                  <button
                    onClick={() => {
                      navigate(`/charging/${selectedStation.serial_number}`)
                    }}
                    className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
                  >
                    <span>⚡</span>
                    <span>Зарядить</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simple Topup Modal */}
      {showTopup && (
        <SimpleTopup onClose={() => setShowTopup(false)} />
      )}
    </div>
  )
}