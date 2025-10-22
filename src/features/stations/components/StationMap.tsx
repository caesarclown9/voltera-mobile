import {
  YMaps,
  Map,
  Placemark,
  Clusterer,
  ZoomControl,
} from "@pbe/react-yandex-maps";
import { useState, useRef } from "react";
import { StationSelectionModal } from "@/shared/components/StationSelectionModal";
import type { Location } from "@/api/types";

interface StationMapProps {
  locations: Location[];
  userLocation?: [number, number]; // [lat, lng]
  focusLocation?: { lat: number; lng: number; zoom?: number };
}

/**
 * Компонент карты с маркерами локаций (не отдельных станций!)
 *
 * Логика цветов маркеров:
 * - ЗЕЛЁНЫЙ: location.status === 'available' или 'partial' (есть хотя бы 1 свободный коннектор)
 * - ЖЁЛТЫЙ: location.status === 'occupied' (все коннекторы всех станций заняты)
 * - СЕРЫЙ: location.status === 'offline' или 'maintenance' (станции недоступны)
 */
export function StationMap({
  locations = [],
  userLocation,
  focusLocation,
}: StationMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);

  // Центр карты - используем focusLocation если есть, иначе текущую локацию или Бишкек
  const mapCenter: [number, number] = focusLocation
    ? [focusLocation.lat, focusLocation.lng]
    : userLocation || [42.8746, 74.5698];

  // Зум карты - используем focusLocation.zoom если есть, иначе стандартный
  const mapZoom = focusLocation?.zoom || 13;

  /**
   * Определяет цвет маркера локации на основе её статуса
   * Использует данные из API (location.status уже рассчитан на backend)
   */
  const getLocationMarkerColor = (location: Location): string => {
    switch (location.status) {
      case "available":
      case "partial":
        // Есть хотя бы 1 свободный коннектор
        return "#22c55e"; // green-500

      case "occupied":
        // Все коннекторы заняты, но станции работают
        return "#eab308"; // yellow-500

      case "offline":
      case "maintenance":
      default:
        // Станции недоступны
        return "#9CA3AF"; // gray-400
    }
  };

  /**
   * Генерирует SVG иконку для маркера локации
   */
  const getLocationIcon = (location: Location) => {
    const fillColor = getLocationMarkerColor(location);
    const stationsCount =
      location.stations?.length || location.stations_count || 1;

    return {
      iconLayout: "default#image",
      iconImageHref: `data:image/svg+xml;base64,${btoa(`
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="${fillColor}" stroke="#fff" stroke-width="2"/>
          <text x="20" y="20" text-anchor="middle" dominant-baseline="central" fill="white" font-family="Arial" font-size="14" font-weight="bold">${stationsCount}</text>
        </svg>
      `)}`,
      iconImageSize: [40, 40],
      iconImageOffset: [-20, -20],
    };
  };

  /**
   * Иконка для маркера местоположения пользователя
   */
  const getUserLocationIcon = () => ({
    iconLayout: "default#image",
    iconImageHref: `data:image/svg+xml;base64,${btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="#fff" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" fill="#fff"/>
      </svg>
    `)}`,
    iconImageSize: [24, 24],
    iconImageOffset: [-12, -12],
  });

  /**
   * Обработчик клика по маркеру локации
   * Открывает модальное окно со списком станций
   */
  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location);
  };

  /**
   * Закрытие модального окна
   */
  const handleCloseModal = () => {
    setSelectedLocation(null);
  };

  /**
   * Создаем кастомный макет для кластеров
   */
  const createClusterLayout = (ymaps: any) => {
    if (!ymaps) return null;

    const ClusterIconLayout = ymaps.templateLayoutFactory.createClass(
      '<div style="position: absolute; width: 40px; height: 40px; left: -20px; top: -20px; font-family: Arial, sans-serif;">' +
        '<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="20" cy="20" r="18" fill="#10B981" stroke="#fff" stroke-width="2"/>' +
        "</svg>" +
        '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold; font-size: 14px;">{{ properties.geoObjects.length }}</div>' +
        "</div>",
    );

    return ClusterIconLayout;
  };

  // Фильтруем локации с валидными координатами
  const validLocations = locations.filter(
    (loc) => loc.latitude != null && loc.longitude != null,
  );

  // DEBUG: временное логирование для отладки
  console.log("[StationMap] Received locations:", locations.length);
  console.log("[StationMap] Valid locations:", validLocations.length);
  if (validLocations.length > 0) {
    console.log("[StationMap] First location:", validLocations[0]);
  }

  return (
    <div className="relative h-full w-full">
      <YMaps
        query={{
          // Если ключ не задан, не передаем параметр apikey вовсе
          ...(import.meta.env.VITE_YANDEX_MAPS_API_KEY
            ? { apikey: import.meta.env.VITE_YANDEX_MAPS_API_KEY as string }
            : {}),
          load: "package.full",
        }}
      >
        <Map
          instanceRef={mapRef}
          defaultState={{
            center: mapCenter,
            zoom: mapZoom,
            controls: [], // Правильный способ убрать стандартные контролы
          }}
          width="100%"
          height="100%"
          options={{
            suppressMapOpenBlock: true,
            yandexMapDisablePoiInteractivity: true,
          }}
          modules={["templateLayoutFactory"]}
          onLoad={(ymaps: any) => {
            // Создаем кастомный макет для кластеров после загрузки карты
            const clusterLayout = createClusterLayout(ymaps);
            if (clustererRef.current && clusterLayout) {
              clustererRef.current.options.set({
                clusterIconContentLayout: clusterLayout,
              });
            }
          }}
        >
          <ZoomControl />

          <Clusterer
            instanceRef={(ref: any) => {
              clustererRef.current = ref;
              // Настраиваем обработчик клика кластера
              if (ref && ref.events) {
                ref.events.add("click", (e: any) => {
                  const cluster = e.get("target");
                  const geoObjects = cluster.getGeoObjects
                    ? cluster.getGeoObjects()
                    : [];

                  if (geoObjects && geoObjects.length > 1) {
                    // Получаем bounds всех объектов в кластере
                    const bounds = cluster.getBounds();

                    // Зумируем с отступом, чтобы все маркеры были видны
                    mapRef.current?.setBounds(bounds, {
                      checkZoomRange: true,
                      duration: 300,
                      margin: [50, 50, 50, 50],
                    });
                  }
                });
              }
            }}
            options={{
              preset: "islands#invertedGreenClusterIcons",
              clusterNumbers: [2, 3, 5, 10],
              groupByCoordinates: false,
              clusterDisableClickZoom: true,
              clusterHideIconOnBalloonOpen: false,
              geoObjectHideIconOnBalloonOpen: false,
              hasBalloon: false,
              hasHint: false,
              gridSize: 60,
              minClusterSize: 2,
            }}
          >
            {validLocations.map((location) => (
              <Placemark
                key={location.id}
                geometry={[location.latitude!, location.longitude!]}
                options={{
                  ...getLocationIcon(location),
                  hideIconOnBalloonOpen: false,
                  openBalloonOnClick: false,
                  openHintOnHover: false,
                  hasBalloon: false,
                  hasHint: false,
                }}
                properties={{
                  balloonContent: "",
                  hintContent: "",
                }}
                onClick={() => handleLocationClick(location)}
              />
            ))}
          </Clusterer>

          {/* Маркер местоположения пользователя */}
          {userLocation && (
            <Placemark
              geometry={userLocation}
              options={{
                ...getUserLocationIcon(),
                openBalloonOnClick: false,
                openHintOnHover: false,
              }}
            />
          )}
        </Map>
      </YMaps>

      {/* Модальное окно выбора станции */}
      {selectedLocation && selectedLocation.stations && (
        <StationSelectionModal
          stations={selectedLocation.stations}
          locationName={selectedLocation.name}
          isOpen={!!selectedLocation}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
