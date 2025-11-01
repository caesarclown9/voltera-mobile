/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Безопасные парсеры для чисел
 * Note: `any` types used for universal parsing of data of arbitrary types from external sources
 */

/**
 * Безопасно парсит строку в число с плавающей точкой
 */
export const safeParseFloat = (
  value: any,
  defaultValue: number = 0,
  min?: number,
  max?: number,
): number => {
  // Обработка null, undefined
  if (value === null || value === undefined) {
    return defaultValue;
  }

  // Если уже число
  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) {
      return defaultValue;
    }

    // Проверка границ
    if (min !== undefined && value < min) return min;
    if (max !== undefined && value > max) return max;

    return value;
  }

  // Конвертация в строку и очистка
  const stringValue = String(value).trim();

  // Пустая строка
  if (stringValue === "") {
    return defaultValue;
  }

  // Замена запятой на точку для локализации
  const normalized = stringValue.replace(",", ".");

  // Парсинг
  const parsed = parseFloat(normalized);

  // Проверка результата
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }

  // Проверка границ
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;

  return parsed;
};

/**
 * Безопасно парсит строку в целое число
 */
export const safeParseInt = (
  value: any,
  defaultValue: number = 0,
  min?: number,
  max?: number,
): number => {
  // Обработка null, undefined
  if (value === null || value === undefined) {
    return defaultValue;
  }

  // Если уже число
  if (typeof value === "number") {
    if (isNaN(value) || !isFinite(value)) {
      return defaultValue;
    }

    const intValue = Math.floor(value);

    // Проверка границ
    if (min !== undefined && intValue < min) return min;
    if (max !== undefined && intValue > max) return max;

    return intValue;
  }

  // Конвертация в строку и очистка
  const stringValue = String(value).trim();

  // Пустая строка
  if (stringValue === "") {
    return defaultValue;
  }

  // Парсинг
  const parsed = parseInt(stringValue, 10);

  // Проверка результата
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }

  // Проверка границ
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;

  return parsed;
};

/**
 * Парсит цену с валидацией
 */
export const parsePrice = (value: any, defaultValue: number = 0): number => {
  return safeParseFloat(value, defaultValue, 0, 999999);
};

/**
 * Парсит процент с валидацией
 */
export const parsePercent = (value: any, defaultValue: number = 0): number => {
  return safeParseFloat(value, defaultValue, 0, 100);
};

/**
 * Парсит энергию в кВт·ч с валидацией
 */
export const parseEnergy = (value: any, defaultValue: number = 0): number => {
  return safeParseFloat(value, defaultValue, 0, 10000);
};

/**
 * Парсит мощность в кВт с валидацией
 */
export const parsePower = (value: any, defaultValue: number = 0): number => {
  return safeParseFloat(value, defaultValue, 0, 500);
};

/**
 * Парсит продолжительность в секундах
 */
export const parseDuration = (value: any, defaultValue: number = 0): number => {
  return safeParseInt(value, defaultValue, 0, 86400 * 7); // Максимум неделя
};

/**
 * Парсит ID коннектора
 */
export const parseConnectorId = (
  value: any,
  defaultValue: number = 1,
): number => {
  return safeParseInt(value, defaultValue, 1, 100);
};

/**
 * Проверяет, является ли значение числом
 */
export const isNumeric = (value: any): boolean => {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  const num = Number(value);
  return !isNaN(num) && isFinite(num);
};

/**
 * Парсит булево значение
 */
export const parseBoolean = (
  value: any,
  defaultValue: boolean = false,
): boolean => {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") {
      return true;
    }
    if (lower === "false" || lower === "0" || lower === "no") {
      return false;
    }
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return defaultValue;
};
