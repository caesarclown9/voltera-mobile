/**
 * Географические утилиты
 */

/**
 * Рассчитывает расстояние между двумя точками на Земле
 * используя формулу Haversine
 *
 * @param lat1 Широта первой точки
 * @param lng1 Долгота первой точки
 * @param lat2 Широта второй точки
 * @param lng2 Долгота второй точки
 * @returns Расстояние в километрах
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  // Валидация входных данных
  if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) {
    return 0;
  }

  const R = 6371; // Радиус Земли в километрах
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Округляем до 2 знаков после запятой
  return Math.round(distance * 100) / 100;
};

/**
 * Конвертирует градусы в радианы
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Проверяет валидность координат
 */
export const isValidCoordinate = (lat: number, lng: number): boolean => {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

/**
 * Форматирует расстояние в читаемый формат
 */
export const formatDistance = (km: number): string => {
  if (km < 0) return "—";

  if (km < 1) {
    return `${Math.round(km * 1000)} м`;
  }

  if (km < 10) {
    return `${km.toFixed(1)} км`;
  }

  return `${Math.round(km)} км`;
};

/**
 * Сортирует массив по расстоянию от точки
 */
export const sortByDistance = <T extends { lat: number; lng: number }>(
  items: T[],
  userLat: number,
  userLng: number,
): (T & { distance: number })[] => {
  if (!isValidCoordinate(userLat, userLng)) {
    return items.map((item) => ({ ...item, distance: 0 }));
  }

  return items
    .map((item) => ({
      ...item,
      distance: calculateDistance(userLat, userLng, item.lat, item.lng),
    }))
    .sort((a, b) => a.distance - b.distance);
};

/**
 * Фильтрует элементы в радиусе от точки
 */
export const filterByRadius = <T extends { lat: number; lng: number }>(
  items: T[],
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): T[] => {
  if (!isValidCoordinate(centerLat, centerLng) || radiusKm <= 0) {
    return items;
  }

  return items.filter((item) => {
    const distance = calculateDistance(
      centerLat,
      centerLng,
      item.lat,
      item.lng,
    );
    return distance <= radiusKm;
  });
};

/**
 * Константы для Бишкека (центр города)
 */
export const BISHKEK_CENTER = {
  lat: 42.8746,
  lng: 74.5698,
};

/**
 * Получает границы для карты на основе точек
 */
export const getBounds = (points: Array<{ lat: number; lng: number }>) => {
  if (!points || points.length === 0) return null;

  const first = points[0];
  if (!first) return null;

  let minLat = first.lat;
  let maxLat = first.lat;
  let minLng = first.lng;
  let maxLng = first.lng;

  points.forEach((point) => {
    if (!point) return;
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });

  // Добавляем отступ 10%
  const latPadding = (maxLat - minLat) * 0.1;
  const lngPadding = (maxLng - minLng) * 0.1;

  return {
    north: maxLat + latPadding,
    south: minLat - latPadding,
    east: maxLng + lngPadding,
    west: minLng - lngPadding,
  };
};
