import { YMaps, Map, Placemark, Clusterer, ZoomControl, GeolocationControl } from '@pbe/react-yandex-maps'
import { useState, useRef, useEffect } from 'react'
import type { Station } from '../../../api/types'
import type { StationWithLocation } from '../types'

interface StationMapProps {
  stations: StationWithLocation[]
  userLocation?: [number, number] // [lat, lng]
  onStationSelect?: (station: Station) => void
  focusLocation?: { lat: number; lng: number; zoom?: number }
  selectedStationId?: string
}

export function StationMap({ stations = [], userLocation, onStationSelect, focusLocation, selectedStationId }: StationMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<Station | null>(null)
  
  // Автоматически выбираем станцию если передан selectedStationId
  useEffect(() => {
    if (selectedStationId && stations) {
      const station = stations.find(s => s.id === selectedStationId)
      if (station) {
        setSelectedLocation(station)
      }
    }
  }, [selectedStationId, stations])
  const mapRef = useRef<any>(null)
  const clustererRef = useRef<any>(null)

  // Центр карты - используем focusLocation если есть, иначе текущую локацию или Бишкек
  const mapCenter: [number, number] = focusLocation 
    ? [focusLocation.lat, focusLocation.lng]
    : userLocation || [42.8746, 74.5698]
  
  // Зум карты - используем focusLocation.zoom если есть, иначе стандартный
  const mapZoom = focusLocation?.zoom || 13

  const getStationIcon = (station: StationWithLocation) => {
    // Цвета согласно статусам backend API
    let fillColor = '#6b7280'; // серый по умолчанию (недоступна)

    // Определяем цвет на основе статуса от backend
    switch (station.status) {
      case 'active':
        fillColor = '#22c55e'; // зеленый - станция активна
        break;
      case 'maintenance':
        fillColor = '#8b5cf6'; // фиолетовый - обслуживание
        break;
      case 'inactive':
      default:
        fillColor = '#6b7280'; // серый - недоступна
        break;
    }
    
    return {
      iconLayout: 'default#image',
      iconImageHref: `data:image/svg+xml;base64,${btoa(`
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="${fillColor}" stroke="#fff" stroke-width="2"/>
          <text x="20" y="20" text-anchor="middle" dominant-baseline="central" fill="white" font-family="Arial" font-size="16" font-weight="bold">1</text>
        </svg>
      `)}`,
      iconImageSize: [40, 40],
      iconImageOffset: [-20, -20],
    }
  }

  const getUserLocationIcon = () => ({
    iconLayout: 'default#image',
    iconImageHref: `data:image/svg+xml;base64,${btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="#fff" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" fill="#fff"/>
      </svg>
    `)}`,
    iconImageSize: [24, 24],
    iconImageOffset: [-12, -12],
  })

  const handleLocationClick = (location: StationWithLocation) => {
    setSelectedLocation(location)
  }
  
  const handleStationSelect = (stationId: string) => {
    // Навигация к странице зарядки с ID конкретной станции
    onStationSelect?.({ id: stationId } as Station)
    setSelectedLocation(null)
  }


  // Создаем кастомный макет для кластеров
  const createClusterLayout = (ymaps: any) => {
    if (!ymaps) return null
    
    const ClusterIconLayout = ymaps.templateLayoutFactory.createClass(
      '<div style="position: absolute; width: 40px; height: 40px; left: -20px; top: -20px; font-family: Arial, sans-serif;">' +
      '<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="20" cy="20" r="18" fill="#10B981" stroke="#fff" stroke-width="2"/>' +
      '</svg>' +
      '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold; font-size: 14px;">{{ properties.geoObjects.length }}</div>' +
      '</div>'
    )
    
    return ClusterIconLayout
  }

  return (
    <div className="relative h-full w-full">
      <YMaps 
        query={{ 
          // Если ключ не задан, не передаем параметр apikey вовсе, чтобы избежать ошибки Invalid API key
          ...(import.meta.env.VITE_YANDEX_MAPS_API_KEY
            ? { apikey: import.meta.env.VITE_YANDEX_MAPS_API_KEY as string }
            : {}),
          load: 'package.full'
        }}
      >
        <Map
          instanceRef={mapRef}
          defaultState={{
            center: mapCenter,
            zoom: mapZoom,
          }}
          width="100%"
          height="100%"
          options={{
            suppressMapOpenBlock: true,
            yandexMapDisablePoiInteractivity: true,
          }}
          modules={['geoObject.addon.balloon', 'geoObject.addon.hint', 'templateLayoutFactory']}
          onLoad={(ymaps: any) => {
            // Создаем кастомный макет для кластеров после загрузки карты
            const clusterLayout = createClusterLayout(ymaps)
            if (clustererRef.current && clusterLayout) {
              clustererRef.current.options.set({
                clusterIconContentLayout: clusterLayout
              })
            }
          }}
        >
          <ZoomControl />
          <GeolocationControl />
          
          <Clusterer
            instanceRef={(ref: any) => {
              clustererRef.current = ref
              // Настраиваем обработчик клика после инициализации
              if (ref && ref.events) {
                ref.events.add('click', (e: any) => {
                  const cluster = e.get('target')
                  const geoObjects = cluster.getGeoObjects ? cluster.getGeoObjects() : []
                  
                  if (geoObjects && geoObjects.length > 1) {
                    // Получаем bounds всех объектов в кластере
                    const bounds = cluster.getBounds()
                    
                    // Зумируем с отступом, чтобы все маркеры были видны
                    mapRef.current?.setBounds(bounds, {
                      checkZoomRange: true,
                      duration: 300,
                      // Добавляем отступ для лучшей видимости
                      margin: [50, 50, 50, 50]
                    })
                  }
                })
              }
            }}
            options={{
              preset: 'islands#invertedGreenClusterIcons',
              clusterNumbers: [2, 3, 5, 10], // Кластеризация начинается с 2 станций
              groupByCoordinates: false,
              clusterDisableClickZoom: true, // Отключаем стандартный зум, используем свой
              clusterHideIconOnBalloonOpen: false,
              geoObjectHideIconOnBalloonOpen: false,
              hasBalloon: false,
              hasHint: false,
              gridSize: 60, // Размер сетки для группировки
              minClusterSize: 2, // Минимум 2 станции для кластера
            }}
            modules={['clusterer.addon.balloon', 'clusterer.addon.hint']}
          >
            {stations?.map((station) => (
              <Placemark
                key={station.id}
                geometry={[station.latitude, station.longitude]}
                options={getStationIcon(station)}
                properties={{
                  balloonContentHeader: `<strong>${station.locationName || station.model}</strong>`,
                  balloonContentBody: `
                    <div>
                      <p><strong>Адрес:</strong> ${station.locationAddress || 'N/A'}</p>
                      <p><strong>Статус:</strong> ${
                        station.status === 'active' ? 'Доступна' :
                        station.status === 'maintenance' ? 'На обслуживании' :
                        'Недоступна'
                      }</p>
                      <p><strong>Мощность:</strong> ${station.power_capacity} кВт</p>
                      <p><strong>Разъемы:</strong> ${station.connector_types.join(', ')}</p>
                      <p><strong>Тариф:</strong> ${station.price_per_kwh.toFixed(2)} сом/кВт⋅ч</p>
                    </div>
                  `,
                }}
                onClick={() => handleLocationClick(station)}
              />
            ))}
          </Clusterer>

          {userLocation && (
            <Placemark
              geometry={userLocation}
              options={getUserLocationIcon()}
              properties={{
                balloonContent: 'Вы здесь',
              }}
            />
          )}
        </Map>
      </YMaps>
    </div>
  )
}