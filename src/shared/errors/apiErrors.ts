/**
 * API Error Handling - ЕДИНСТВЕННЫЙ модуль для обработки API ошибок
 *
 * ВАЖНО: Это единственный источник истины для ApiError и ERROR_MESSAGES
 * НЕ создавайте дубликаты в других файлах!
 *
 * @module shared/errors/apiErrors
 */

/**
 * Класс ошибки API с кодом и статусом
 */
export class ApiError extends Error {
  public code: string;
  public status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Маппинг кодов ошибок на user-friendly сообщения на русском
 *
 * ВАЖНО: При добавлении новых ошибок обновляйте только этот файл!
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Client errors
  client_not_found: "Клиент не найден",
  client_blocked: "Аккаунт заблокирован",
  client_deleted: "Аккаунт удален",

  // Station errors
  station_unavailable: "Станция недоступна",
  station_offline: "Станция не в сети",
  station_maintenance: "Станция на техническом обслуживании",
  station_not_found: "Станция не найдена",

  // Connector errors
  connector_occupied: "Коннектор уже используется",
  connector_unavailable: "Коннектор недоступен",
  connector_not_found: "Коннектор не найден",
  connector_faulted: "Коннектор неисправен",

  // Charging session errors
  session_not_found: "Сессия зарядки не найдена",
  session_already_active: "У вас уже есть активная сессия зарядки",
  session_expired: "Сессия зарядки истекла",
  session_failed: "Не удалось запустить зарядку",
  charging_limit_exceeded: "Превышен лимит зарядки",

  // Balance and payment errors
  insufficient_balance: "Недостаточно средств на балансе",
  payment_not_found: "Платеж не найден",
  payment_expired: "Время оплаты истекло",
  payment_failed: "Платеж не прошел",
  payment_pending: "Платеж обрабатывается",
  invalid_amount: "Некорректная сумма",
  minimum_amount_required: "Сумма меньше минимальной",
  maximum_amount_exceeded: "Сумма превышает максимальную",

  // Provider errors
  provider_error: "Ошибка платежной системы",
  provider_unavailable: "Платежная система недоступна",
  provider_timeout: "Превышено время ожидания платежной системы",

  // Device registration errors
  device_already_registered: "Устройство уже зарегистрировано",
  device_not_found: "Устройство не найдено",
  fcm_token_invalid: "Некорректный FCM токен",

  // General errors
  internal_error: "Внутренняя ошибка сервера",
  invalid_request: "Некорректный запрос",
  validation_error: "Ошибка валидации данных",
  timeout: "Превышено время ожидания",
  network_error: "Ошибка сети",
  unauthorized: "Требуется авторизация",
  forbidden: "Доступ запрещен",
  not_found: "Не найдено",
  rate_limit_exceeded: "Превышено количество запросов",
  service_unavailable: "Сервис временно недоступен",
};

/**
 * Проверяет является ли значение объектом
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Обработчик API ошибок - преобразует любую ошибку в понятное сообщение
 *
 * @param error - Любая ошибка (ApiError, TransportError, axios error, etc.)
 * @returns User-friendly сообщение на русском
 *
 * @example
 * ```typescript
 * try {
 *   await api.startCharging(stationId);
 * } catch (error) {
 *   const message = handleApiError(error);
 *   toast.error(message);
 * }
 * ```
 */
export function handleApiError(error: unknown): string {
  // 1. Проверяем ApiError
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] ?? error.message ?? "Неизвестная ошибка";
  }

  // 2. Проверяем TransportError с кодом
  if (
    isObject(error) &&
    error["name"] === "TransportError" &&
    typeof error["code"] === "string"
  ) {
    const code = error["code"] as string;
    const message =
      typeof error["message"] === "string"
        ? (error["message"] as string)
        : undefined;
    return ERROR_MESSAGES[code] ?? message ?? "Неизвестная ошибка";
  }

  // 3. Проверяем axios-like error shape
  if (isObject(error)) {
    const resp = error["response"];
    if (isObject(resp)) {
      const data = resp["data"];
      if (isObject(data)) {
        const errorCode =
          typeof data["error_code"] === "string"
            ? (data["error_code"] as string)
            : undefined;
        const code =
          typeof data["error"] === "string"
            ? (data["error"] as string)
            : undefined;
        const message =
          typeof data["message"] === "string"
            ? (data["message"] as string)
            : undefined;

        // Priority: error_code > error > message
        if (errorCode)
          return ERROR_MESSAGES[errorCode] ?? message ?? "Ошибка сервера";
        if (code) return ERROR_MESSAGES[code] ?? message ?? "Ошибка сервера";
        if (message) return message;
      }
    }

    // 4. Проверяем generic { error_code, error, message }
    const errorCode =
      typeof error["error_code"] === "string"
        ? (error["error_code"] as string)
        : undefined;
    const code =
      typeof error["error"] === "string"
        ? (error["error"] as string)
        : undefined;
    const message =
      typeof error["message"] === "string"
        ? (error["message"] as string)
        : undefined;

    // Priority: error_code > error > message
    if (errorCode)
      return ERROR_MESSAGES[errorCode] ?? message ?? "Неизвестная ошибка";
    if (code) return ERROR_MESSAGES[code] ?? message ?? "Неизвестная ошибка";
    if (message) return message;
  }

  // 5. Fallback
  return "Неизвестная ошибка";
}
