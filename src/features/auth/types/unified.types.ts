/**
 * Унифицированные типы для всего приложения
 * Обеспечивают целостность и единообразие
 */

/**
 * Основной тип пользователя
 * ID всегда UUID из Supabase Auth
 */
export interface UnifiedUser {
  // Основные данные (из Supabase Auth)
  id: string; // UUID - единственный идентификатор везде
  email: string | null;
  phone: string | null;

  // Профиль (из таблицы clients)
  name: string;
  balance: number;
  status: "active" | "blocked" | "pending";
  favoriteStations: string[];

  // Метаданные
  createdAt: string;
  updatedAt: string;
}

/**
 * Сессия авторизации
 */
export interface UnifiedSession {
  user: UnifiedUser;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Результат API запросов
 */
export interface UnifiedApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

/**
 * История зарядки
 */
export interface UnifiedChargingSession {
  id: string; // session_id
  clientId: string; // Всегда UUID из Supabase
  stationId: string;
  connectorId: number;

  startTime: string;
  endTime?: string;
  duration: number; // секунды

  energyConsumed: number; // кВт·ч
  totalCost: number; // сом

  limitType: "energy" | "amount" | "none";
  limitValue?: number;

  status: "active" | "completed" | "stopped" | "failed";

  // Дополнительные данные
  stationName?: string;
  stationAddress?: string;
  averagePower?: number;
  maxPower?: number;
}

/**
 * Транзакция
 */
export interface UnifiedTransaction {
  id: string;
  clientId: string; // Всегда UUID из Supabase
  type: "topup" | "charge" | "refund";

  amount: number; // Положительное для пополнений, отрицательное для трат
  balanceBefore: number;
  balanceAfter: number;

  description: string;
  status: "success" | "pending" | "failed";

  createdAt: string;

  // Связанные данные
  sessionId?: string; // Для транзакций зарядки
  paymentMethod?: "qr_odengi" | "card_obank" | "token" | "admin";
  invoiceId?: string;
}

/**
 * Хелперы для работы с ID
 */
export class UnifiedIdHelper {
  /**
   * Проверяет что ID является валидным UUID
   */
  static isValidUUID(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Получает client_id для API вызовов
   * Всегда возвращает UUID из Supabase
   */
  static getClientId(user: UnifiedUser | null): string | null {
    if (!user || !user.id) return null;
    if (!this.isValidUUID(user.id)) {
      console.error("Invalid user ID format:", user.id);
      return null;
    }
    return user.id;
  }

  /**
   * Форматирует телефон для API
   */
  static formatPhone(phone: string | null): string | null {
    if (!phone) return null;

    // Убираем все кроме цифр
    const digits = phone.replace(/\D/g, "");

    // Добавляем код страны если нет
    if (digits.length === 9 && !digits.startsWith("996")) {
      return `+996${digits}`;
    }
    if (digits.startsWith("996")) {
      return `+${digits}`;
    }
    if (digits.startsWith("0") && digits.length === 10) {
      return `+996${digits.substring(1)}`;
    }

    return phone;
  }
}
