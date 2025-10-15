/**
 * API Types - соответствуют документации API_INTEGRATION_ANSWERS.md
 *
 * ВАЖНО:
 * - Авторизация только через Supabase Auth
 * - Endpoints /auth/* НЕ СУЩЕСТВУЮТ на OCPP бэкенде
 * - client_id = Supabase User UUID
 */

// ============== CLIENT (из Supabase) ==============

export interface Client {
  id: string; // UUID из Supabase Auth
  name?: string; // Nullable
  phone?: string; // Nullable
  balance: number; // В СОМАХ (не копейках!)
  status: "active" | "inactive" | "blocked";
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

// ============== LOCATIONS & STATIONS ==============

export interface Location {
  id: string;
  name: string;
  address: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  status: "available" | "occupied" | "offline" | "maintenance" | "partial";
  stations_count: number;
  connectors_count: number;
  available_connectors: number;
  stations?: Station[];
  distance?: number; // Вычисляется на клиенте
}

export interface Station {
  id: string;
  serial_number: string;
  model: string;
  manufacturer: string;
  location_id: string;
  power_capacity: number; // кВт
  connector_types: string[]; // ["Type2", "CCS"]
  status: "active" | "inactive" | "maintenance";
  connectors_count: number;
  price_per_kwh: number; // Базовая цена в сомах
  session_fee: number; // Фиксированная плата за сессию
  currency: "KGS";
  firmware_version?: string;
  is_available?: boolean; // Доступность станции (из Supabase)
  last_heartbeat_at?: string; // Последний heartbeat
  latitude?: number; // Координаты из joined location
  longitude?: number;
  locationName?: string; // Название локации
  locationAddress?: string; // Адрес локации
  ocpp_status?: {
    is_online: boolean;
    last_heartbeat: string;
    connector_status: ConnectorStatus[];
  };
}

export interface ConnectorStatus {
  connector_id: number; // 1, 2, 3...
  status:
    | "Available"
    | "Preparing"
    | "Charging"
    | "SuspendedEVSE"
    | "SuspendedEV"
    | "Finishing"
    | "Reserved"
    | "Unavailable"
    | "Faulted";
  error_code?: string;
  info?: string;
}

// Response от /station/status/{station_id}
export interface StationStatusResponse {
  success: boolean;
  station_id: string;
  serial_number: string;
  model: string;
  manufacturer: string;
  online: boolean;
  station_status: string;
  location_status: string;
  available_for_charging: boolean;
  location_id: string;
  location_name: string;
  location_address: string;
  connectors: {
    id: number;
    type: string;
    status: string;
    available: boolean;
    power_kw?: number;
    error?: string;
  }[];
  total_connectors: number;
  available_connectors: number;
  occupied_connectors: number;
  faulted_connectors: number;
  tariff_rub_kwh: number;
  session_fee: number;
  currency: string;
  working_hours: string;
  message?: string;
}

// ============== CHARGING ==============

export interface StartChargingRequest {
  client_id: string; // ОБЯЗАТЕЛЬНО
  station_id: string; // ОБЯЗАТЕЛЬНО
  connector_id: number; // ОБЯЗАТЕЛЬНО (1, 2, 3...)
  energy_kwh?: number; // Лимит по энергии в кВт·ч
  amount_som?: number; // Лимит по сумме в сомах
}

export interface StartChargingResponse {
  success: boolean;
  message?: string;
  error?: string;
  session_id?: string;
  connector_id?: number;
  reserved_amount?: number; // Зарезервировано на балансе
  limit_type?: "energy" | "amount" | "none";
  limit_value?: number;
  rate_per_kwh?: number; // Актуальный тариф
  session_fee?: number;
  required_amount?: number; // При недостатке средств
  current_balance?: number;
}

export interface ChargingStatus {
  success: boolean;
  session?: {
    id: string;
    status: "started" | "stopped" | "error";
    station_id: string;
    connector_id: number;
    start_time: string; // ISO datetime
    stop_time?: string;
    energy_consumed: number; // кВт·ч
    current_cost: number; // Текущая стоимость в сомах
    reserved_amount?: number; // Зарезервировано
    limit_type: "energy" | "amount" | "none";
    limit_value?: number;
    limit_reached?: boolean;
    limit_percentage?: number; // 0-100%
    rate_per_kwh?: number;
    session_fee?: number;
    ocpp_transaction_id?: number;
    meter_start?: number;
    meter_current?: number;
    charging_duration_minutes?: number;
  };
}

export interface StopChargingResponse {
  success: boolean;
  message?: string;
  error?: string;
  final_cost?: number; // Финальная стоимость
  energy_consumed?: number; // Потреблено кВт·ч
  duration_minutes?: number;
  refunded_amount?: number; // Возвращено на баланс
  additional_charge?: number; // Дополнительно списано
}

// ============== BALANCE & PAYMENTS ==============

export interface BalanceResponse {
  balance: number;
  currency?: string;
}

export interface TopupQRRequest {
  client_id: string;
  amount: number; // В сомах (10-100000)
  description?: string;
}

export interface TopupQRResponse {
  success: boolean;
  invoice_id?: string;
  order_id?: string;
  qr_code?: string; // Данные для генерации QR (не картинка!)
  qr_code_url?: string; // URL картинки QR-кода
  app_link?: string; // Deeplink для O!Dengi приложения
  amount?: number;
  client_id?: string;
  current_balance?: number;
  qr_expires_at?: string; // ISO datetime (через 5 минут)
  invoice_expires_at?: string; // ISO datetime (через 10 минут)
  qr_lifetime_seconds?: number;
  invoice_lifetime_seconds?: number;
  error?: string;
}

export interface TopupCardRequest {
  client_id: string;
  amount: number;
  card_pan: string; // "4169585512341234"
  card_name: string; // "IVAN IVANOV"
  card_cvv: string; // "123"
  card_year: string; // "25" (YY)
  card_month: string; // "12" (MM)
  email: string; // Для чека
  phone_number?: string;
  description?: string;
}

export interface TopupCardResponse {
  success: boolean;
  auth_key?: string; // Ключ для 3DS
  acs_url?: string; // URL для 3DS аутентификации
  md?: string; // Merchant data
  pa_req?: string; // 3DS request
  term_url?: string; // Return URL после 3DS
  client_id?: string;
  current_balance?: number;
  error?: string;
}

export interface PaymentStatus {
  success: boolean;
  status?: 0 | 1 | 2 | 3 | 4; // O!Dengi коды
  status_text?:
    | "processing"
    | "approved"
    | "canceled"
    | "refunded"
    | "partial_refund";
  amount?: number;
  paid_amount?: number;
  invoice_id?: string;
  qr_expired?: boolean;
  invoice_expired?: boolean;
  qr_expires_at?: string;
  invoice_expires_at?: string;
  can_proceed?: boolean; // Можно ли использовать для зарядки
  can_start_charging?: boolean; // Платеж успешен
  error?: string;
}

// ============== WEBSOCKET ==============

export interface WebSocketMessage {
  type: string;
  data: unknown;
}

export interface WebSocketLocationUpdate {
  type: "location_status_update";
  location_id: string;
  status: "available" | "occupied" | "offline" | "maintenance" | "partial";
  stations_summary?: {
    total: number;
    available: number;
    occupied: number;
  };
  timestamp: string;
}

export interface WebSocketStationUpdate {
  type: "station_status_update";
  station_id: string;
  status: string;
  connectors: {
    id: number;
    status: string;
    available: boolean;
  }[];
  timestamp: string;
}

export interface LocationUpdate {
  type: "status_update";
  location_id: string;
  status: "available" | "occupied" | "offline" | "maintenance" | "partial";
  available_connectors: number;
  timestamp: string;
}

// ============== ERRORS ==============

export interface APIError {
  success: false;
  error: string;
  message?: string; // Для совместимости с axios interceptors
  code?: string; // Код ошибки
  status?: number; // HTTP статус
  detail?: unknown;
  required_amount?: number;
  current_balance?: number;
}

// ============== LEGACY (для совместимости, удалить после миграции) ==============

// Connector для старых компонентов
export interface Connector {
  id: string;
  type: string;
  power: number;
  status: "available" | "occupied" | "offline";
  price_per_kwh: number;
}
