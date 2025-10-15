import type { Station, Location } from "../../../api/types";

/**
 * Тип для UI компонентов - объединяет Station с данными Location
 * Используется в компонентах StationCard, StationList, StationMap
 */
export interface StationWithLocation extends Station {
  // Данные из Location
  locationName?: string;
  locationAddress?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

/**
 * Утилита для преобразования Station из Location в StationWithLocation
 */
export function enrichStationWithLocation(
  station: Station,
  location: Location,
  userLocation?: { lat: number; lng: number },
): StationWithLocation {
  const enriched: StationWithLocation = {
    ...station,
    locationName: location.name,
    locationAddress: location.address,
    city: location.city,
    latitude: location.latitude,
    longitude: location.longitude,
  };

  // Добавляем расстояние если есть координаты пользователя
  if (userLocation && location.latitude && location.longitude) {
    enriched.distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      location.latitude,
      location.longitude,
    );
  }

  return enriched;
}

/**
 * Утилита для извлечения всех станций из локаций с обогащением
 */
export function extractStationsFromLocations(
  locations: Location[],
  userLocation?: { lat: number; lng: number },
): StationWithLocation[] {
  return locations.flatMap((location) =>
    (location.stations || []).map((station) =>
      enrichStationWithLocation(station, location, userLocation),
    ),
  );
}

/**
 * Haversine formula для расчета расстояния
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Радиус Земли в км
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
