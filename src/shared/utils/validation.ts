/**
 * Утилиты для валидации входных данных
 */

import { logger } from "./logger";

// Типы для валидации
export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Базовые валидаторы
export const validators = {
  required: (message = "Это поле обязательно"): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !!value && value.length >= min,
    message: message || `Минимальная длина: ${min} символов`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length <= max,
    message: message || `Максимальная длина: ${max} символов`,
  }),

  pattern: (
    regex: RegExp,
    message = "Неверный формат",
  ): ValidationRule<string> => ({
    validate: (value) => !value || regex.test(value),
    message,
  }),

  email: (message = "Неверный формат email"): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  phone: (
    message = "Неверный формат номера телефона",
  ): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      // Кыргызский формат: +996 XXX XXX XXX
      const phoneRegex = /^\+996\s?\d{3}\s?\d{3}\s?\d{3}$/;
      return phoneRegex.test(value.replace(/[-()]/g, ""));
    },
    message,
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value !== undefined && value !== null && value >= min,
    message: message || `Минимальное значение: ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value !== undefined && value !== null && value <= max,
    message: message || `Максимальное значение: ${max}`,
  }),

  range: (
    min: number,
    max: number,
    message?: string,
  ): ValidationRule<number> => ({
    validate: (value) =>
      value !== undefined && value !== null && value >= min && value <= max,
    message: message || `Значение должно быть от ${min} до ${max}`,
  }),

  qrCode: (message = "Неверный формат QR-кода"): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return false;
      // Проверка формата QR кода станции: STATION_ID:CONNECTOR_ID
      const qrRegex = /^[A-Z0-9_-]+:[A-Z0-9_-]+$/i;
      return qrRegex.test(value);
    },
    message,
  }),

  amount: (
    min = 0,
    max = 100000,
    message?: string,
  ): ValidationRule<number> => ({
    validate: (value) => {
      if (value === undefined || value === null) return false;
      if (typeof value !== "number" || isNaN(value)) return false;
      return value >= min && value <= max;
    },
    message: message || `Сумма должна быть от ${min} до ${max} сом`,
  }),
};

// Функция для валидации объекта
export function validate<T extends Record<string, unknown>>(
  data: T,
  rules: Partial<Record<keyof T, ValidationRule[]>>,
): ValidationResult {
  const errors: string[] = [];

  for (const [field, fieldRules] of Object.entries(rules)) {
    if (!fieldRules) continue;

    const value = data[field as keyof T];

    for (const rule of fieldRules as ValidationRule[]) {
      try {
        if (!rule.validate(value)) {
          errors.push(`${field}: ${rule.message}`);
        }
      } catch (error) {
        logger.error(`Validation error for field ${field}:`, error);
        errors.push(`${field}: Ошибка валидации`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Санитизация входных данных
export const sanitize = {
  /**
   * Очистка строки от опасных символов
   */
  string: (value: string): string => {
    if (!value) return "";
    return value
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]+>/g, "") // Удаляем HTML теги
      .replace(/[<>"']/g, ""); // Удаляем потенциально опасные символы
  },

  /**
   * Очистка номера телефона
   */
  phone: (value: string): string => {
    if (!value) return "";
    // Оставляем только цифры и +
    return value.replace(/[^\d+]/g, "");
  },

  /**
   * Очистка суммы
   */
  amount: (value: string | number): number => {
    if (typeof value === "number") return value;
    if (!value) return 0;
    // Удаляем все кроме цифр и точки
    const cleaned = value.toString().replace(/[^\d.]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  },

  /**
   * Очистка QR кода
   */
  qrCode: (value: string): string => {
    if (!value) return "";
    // Оставляем только разрешенные символы
    return value.toUpperCase().replace(/[^A-Z0-9_:-]/g, "");
  },
};

// Хелпер для проверки безопасности URL
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Разрешаем только http(s) протоколы
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    // Проверяем на локальные адреса (опционально)
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) {
      return import.meta.env.DEV; // Разрешаем только в dev режиме
    }
    return true;
  } catch {
    return false;
  }
}

// Хелпер для проверки размера файла
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

// Хелпер для проверки типа файла
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}
