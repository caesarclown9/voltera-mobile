/**
 * Утилита для генерации Idempotency-Key
 * Используется для предотвращения дублирования критичных операций
 * 
 * @see https://stripe.com/docs/api/idempotent_requests
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Генерирует уникальный Idempotency-Key для запроса
 * @returns UUID v4 строка
 */
export const generateIdempotencyKey = (): string => {
  return uuidv4();
};

/**
 * Проверяет валидность Idempotency-Key
 * @param key - ключ для проверки
 * @returns true если ключ валидный UUID
 */
export const isValidIdempotencyKey = (key: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
};
