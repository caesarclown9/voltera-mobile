/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Утилиты для обработки ошибок
 * Note: `any` types used for generic error handling from various sources
 */

import { logger } from "./logger";

/**
 * Типы ошибок приложения
 */
export const ErrorType = {
  NETWORK: "NETWORK",
  AUTHENTICATION: "AUTHENTICATION",
  VALIDATION: "VALIDATION",
  BUSINESS: "BUSINESS",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

/**
 * Класс ошибки приложения
 */
export class AppError extends Error {
  type: ErrorType;
  code?: string;
  details?: any;
  originalError?: Error;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    code?: string,
    details?: any,
    originalError?: Error,
  ) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.code = code;
    this.details = details;
    this.originalError = originalError;
  }
}

/**
 * Обрабатывает ошибку и возвращает пользовательское сообщение
 */
export const handleError = (
  error: any,
): { message: string; type: ErrorType } => {
  // Ошибки сети
  if (error.code === "ECONNABORTED" || error.message?.includes("Network")) {
    return {
      message: "Ошибка соединения. Проверьте интернет-подключение.",
      type: ErrorType.NETWORK,
    };
  }

  // Ошибки аутентификации
  if (error.status === 401 || error.code === "UNAUTHORIZED") {
    return {
      message: "Необходима авторизация.",
      type: ErrorType.AUTHENTICATION,
    };
  }

  // Ошибки валидации
  if (error.status === 400 || error.code === "VALIDATION_ERROR") {
    return {
      message: error.message || "Некорректные данные.",
      type: ErrorType.VALIDATION,
    };
  }

  // Бизнес-ошибки
  if (error.status === 402 || error.code === "INSUFFICIENT_BALANCE") {
    return {
      message: "Недостаточно средств на балансе.",
      type: ErrorType.BUSINESS,
    };
  }

  if (error.code === "STATION_OCCUPIED") {
    return {
      message: "Станция занята.",
      type: ErrorType.BUSINESS,
    };
  }

  if (error.code === "STATION_OFFLINE") {
    return {
      message: "Станция недоступна.",
      type: ErrorType.BUSINESS,
    };
  }

  // Обработка AppError
  if (error instanceof AppError) {
    return {
      message: error.message,
      type: error.type,
    };
  }

  // Ошибка по умолчанию
  return {
    message: error.message || "Произошла ошибка. Попробуйте позже.",
    type: ErrorType.UNKNOWN,
  };
};

/**
 * Логирует ошибку и возвращает обработанную версию
 */
export const logAndHandleError = (
  error: any,
  context: string,
  showToUser: boolean = true,
): { message: string; type: ErrorType; showToUser: boolean } => {
  // Логируем ошибку
  logger.error(`[${context}]`, error);

  // Обрабатываем ошибку
  const handled = handleError(error);

  return {
    ...handled,
    showToUser,
  };
};

/**
 * Безопасное выполнение асинхронной функции
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>,
  context: string,
  defaultValue?: T,
): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (error) {
    logAndHandleError(error, context);
    return defaultValue;
  }
};

/**
 * Безопасное выполнение синхронной функции
 */
export const safe = <T>(
  fn: () => T,
  context: string,
  defaultValue?: T,
): T | undefined => {
  try {
    return fn();
  } catch (error) {
    logAndHandleError(error, context);
    return defaultValue;
  }
};

/**
 * Повторная попытка выполнения функции
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
  backoff: number = 2,
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
};

/**
 * Проверяет, является ли ошибка критической
 */
export const isCriticalError = (error: any): boolean => {
  if (error instanceof AppError) {
    return error.type === ErrorType.AUTHENTICATION;
  }

  return error.status === 401 || error.status === 403;
};

/**
 * Создает стандартную ошибку API
 */
export const createApiError = (response: any, endpoint: string): AppError => {
  const message =
    response?.data?.message || response?.data?.error || "Ошибка API";
  const code = response?.data?.code || response?.status?.toString();

  let type: ErrorType = ErrorType.UNKNOWN;

  if (response?.status === 401) {
    type = ErrorType.AUTHENTICATION;
  } else if (response?.status === 400) {
    type = ErrorType.VALIDATION;
  } else if (response?.status >= 500) {
    type = ErrorType.NETWORK;
  }

  return new AppError(
    message,
    type,
    code,
    { endpoint, status: response?.status },
    response,
  );
};
