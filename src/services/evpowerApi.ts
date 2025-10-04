/**
 * EvPower API v1 Service - ЕДИНСТВЕННЫЙ API клиент для всего приложения
 * Интеграция с бэкендом OCPP сервера
 *
 * ВАЖНО:
 * - НЕ использует JWT токены
 * - Передает client_id в каждом запросе
 * - client_id = Supabase User ID
 * - Это ЕДИНСТВЕННЫЙ файл для всех API вызовов
 */

import { supabase } from '../shared/config/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ocpp.evpower.kg';
const API_VERSION = '/api/v1';

export interface StartChargingRequest {
  client_id: string;      // ОБЯЗАТЕЛЬНО
  station_id: string;     // ОБЯЗАТЕЛЬНО
  connector_id: number;   // ОБЯЗАТЕЛЬНО (1, 2, 3...)
  energy_kwh?: number;    // Лимит по энергии в кВт·ч
  amount_som?: number;    // Лимит по сумме в сомах
}

export interface StartChargingResponse {
  success: boolean;
  message?: string;
  error?: string;
  session_id?: string;
  connector_id?: number;
  reserved_amount?: number;  // Зарезервировано на балансе
  limit_type?: 'energy' | 'amount' | 'none';
  limit_value?: number;
  rate_per_kwh?: number;     // Актуальный тариф
  session_fee?: number;
  required_amount?: number;   // При недостатке средств
  current_balance?: number;
}

export interface ChargingStatus {
  success: boolean;
  session?: {
    id: string;
    status: 'started' | 'stopped' | 'error';
    station_id: string;
    connector_id: number;
    start_time: string;      // ISO datetime
    stop_time?: string;
    energy_consumed: number;  // кВт·ч
    current_cost: number;     // Текущая стоимость в сомах
    reserved_amount: number;  // Зарезервировано
    limit_type: 'energy' | 'amount' | 'none';
    limit_value?: number;
    limit_reached: boolean;
    limit_percentage: number; // 0-100%
    rate_per_kwh: number;
    session_fee: number;
    ocpp_transaction_id?: number;
    meter_start?: number;
    meter_current?: number;
    charging_duration_minutes: number;
  };
}

export interface StopChargingResponse {
  success: boolean;
  message?: string;
  error?: string;
  final_cost?: number;        // Финальная стоимость
  energy_consumed?: number;    // Потреблено кВт·ч
  duration_minutes?: number;
  refunded_amount?: number;    // Возвращено на баланс
  additional_charge?: number;  // Дополнительно списано
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  status: 'available' | 'occupied' | 'offline' | 'maintenance' | 'partial';
  stations_count: number;
  connectors_count: number;
  available_connectors: number;
  stations?: Station[];
}

export interface Station {
  id: string;
  serial_number: string;
  model: string;
  manufacturer: string;
  location_id: string;
  power_capacity: number; // кВт
  connector_types: string[]; // ["Type2", "CCS"]
  status: 'active' | 'inactive' | 'maintenance';
  connectors_count: number;
  price_per_kwh: number; // Базовая цена в сомах
  session_fee: number;   // Фиксированная плата за сессию
  currency: 'KGS';
  firmware_version?: string;
  ocpp_status?: {
    is_online: boolean;
    last_heartbeat: string;
    connector_status: ConnectorStatus[];
  };
}

export interface ConnectorStatus {
  connector_id: number; // 1, 2, 3...
  status: 'Available' | 'Preparing' | 'Charging' | 'SuspendedEVSE' |
          'SuspendedEV' | 'Finishing' | 'Reserved' | 'Unavailable' | 'Faulted';
  error_code?: string;
  info?: string;
}

export interface TopupQRRequest {
  client_id: string;
  amount: number;        // В сомах (10-100000)
  description?: string;
}

export interface TopupQRResponse {
  success: boolean;
  invoice_id?: string;
  order_id?: string;
  qr_code?: string;        // Данные для генерации QR (не картинка!)
  qr_code_url?: string;    // URL картинки QR-кода
  app_link?: string;       // Deeplink для O!Dengi приложения
  amount?: number;
  client_id?: string;
  current_balance?: number;
  qr_expires_at?: string;       // ISO datetime (через 5 минут)
  invoice_expires_at?: string;  // ISO datetime (через 10 минут)
  qr_lifetime_seconds?: number;
  invoice_lifetime_seconds?: number;
  error?: string;
}

export interface TopupCardRequest {
  client_id: string;
  amount: number;
  card_pan: string;        // "4169585512341234"
  card_name: string;       // "IVAN IVANOV"
  card_cvv: string;        // "123"
  card_year: string;       // "25" (YY)
  card_month: string;      // "12" (MM)
  email: string;           // Для чека
  phone_number?: string;
  description?: string;
}

export interface TopupCardResponse {
  success: boolean;
  auth_key?: string;        // Ключ для 3DS
  acs_url?: string;         // URL для 3DS аутентификации
  md?: string;              // Merchant data
  pa_req?: string;          // 3DS request
  term_url?: string;        // Return URL после 3DS
  client_id?: string;
  current_balance?: number;
  error?: string;
}

export interface PaymentStatus {
  success: boolean;
  status?: 0 | 1 | 2 | 3 | 4;  // O!Dengi коды
  status_text?: 'processing' | 'approved' | 'canceled' | 'refunded' | 'partial_refund';
  amount?: number;
  paid_amount?: number;
  invoice_id?: string;
  qr_expired?: boolean;
  invoice_expired?: boolean;
  qr_expires_at?: string;
  invoice_expires_at?: string;
  can_proceed?: boolean;        // Можно ли использовать для зарядки
  can_start_charging?: boolean; // Платеж успешен
  error?: string;
}

class EvPowerApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}${API_VERSION}`;
  }

  /**
   * Получить текущий client_id из Supabase Auth
   */
  private async getClientId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  /**
   * Базовый метод для API запросов
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`[EvPowerAPI] ${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          // НЕ добавляем Authorization header!
        }
      });

      console.log(`[EvPowerAPI] Response status: ${response.status}`);

      // Проверяем на сетевые ошибки
      if (response.status === 503) {
        throw new Error('Сервер недоступен. Проверьте подключение к интернету или попробуйте позже.');
      }

      if (response.status === 404) {
        throw new Error('API endpoint не найден');
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.message || `HTTP ${response.status}`;
        console.error(`[EvPowerAPI] Error:`, errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`[EvPowerAPI] Success`);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[EvPowerAPI] Request failed:`, error.message);
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  // ============== CHARGING ==============

  /**
   * Начать зарядку
   */
  async startCharging(
    stationId: string,
    connectorId: number,
    limits?: { energy_kwh?: number; amount_som?: number }
  ): Promise<StartChargingResponse> {
    const client_id = await this.getClientId();

    return this.apiRequest<StartChargingResponse>('/charging/start', {
      method: 'POST',
      body: JSON.stringify({
        client_id,
        station_id: stationId,
        connector_id: connectorId,
        ...limits
      })
    });
  }

  /**
   * Получить статус зарядки
   */
  async getChargingStatus(sessionId: string): Promise<ChargingStatus> {
    return this.apiRequest<ChargingStatus>(`/charging/status/${sessionId}`);
  }

  /**
   * Остановить зарядку
   */
  async stopCharging(sessionId: string): Promise<StopChargingResponse> {
    return this.apiRequest<StopChargingResponse>('/charging/stop', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId
      })
    });
  }

  // ============== LOCATIONS & STATIONS ==============

  /**
   * Получить список локаций со станциями
   */
  async getLocations(includeStations = true): Promise<Location[]> {
    try {
      const response = await this.apiRequest<{ locations: Location[] }>(
        `/locations?include_stations=${includeStations}`
      );

      // DEBUG: логирование ответа от API
      console.log('[EvPowerAPI] API response for /locations:', response)
      console.log('[EvPowerAPI] Locations count from API:', response.locations?.length || 0)
      if (response.locations && response.locations.length > 0) {
        console.log('[EvPowerAPI] First location from API:', response.locations[0])
      }

      return response.locations;
    } catch (error) {
      console.warn('[EvPowerAPI] API unavailable, using Supabase fallback', error);

      // Fallback: прямой запрос к Supabase
      if (includeStations) {
        const { data: locations, error: locError } = await supabase
          .from('locations')
          .select(`
            id,
            name,
            address,
            city,
            country,
            latitude,
            longitude,
            status,
            stations_count,
            connectors_count,
            stations (
              id,
              serial_number,
              model,
              manufacturer,
              location_id,
              power_capacity,
              connector_types,
              status,
              connectors_count,
              price_per_kwh,
              session_fee,
              currency,
              firmware_version,
              is_available,
              last_heartbeat_at
            )
          `)
          .eq('status', 'active');

        if (locError) throw locError;

        // DEBUG: временное логирование
        console.log('[EvPowerAPI] Supabase fallback returned locations:', locations?.length || 0)
        if (locations && locations.length > 0) {
          console.log('[EvPowerAPI] First location from Supabase:', locations[0])
        }

        // Преобразуем к формату API
        return (locations || []).map(loc => ({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          city: loc.city,
          country: loc.country,
          latitude: loc.latitude,
          longitude: loc.longitude,
          status: this.mapLocationStatus(loc.stations || []),
          stations_count: loc.stations_count || 0,
          connectors_count: loc.connectors_count || 0,
          available_connectors: this.countAvailableConnectors(loc.stations || []),
          stations: (loc.stations || []).map((s: any) => ({
            id: s.id,
            serial_number: s.serial_number,
            model: s.model,
            manufacturer: s.manufacturer,
            location_id: s.location_id,
            power_capacity: s.power_capacity,
            connector_types: s.connector_types || [],
            status: s.status,
            connectors_count: s.connectors_count || 1,
            price_per_kwh: parseFloat(s.price_per_kwh) || 0,
            session_fee: parseFloat(s.session_fee) || 0,
            currency: s.currency || 'KGS',
            firmware_version: s.firmware_version,
            is_available: s.is_available ?? true, // Добавляем is_available
            last_heartbeat_at: s.last_heartbeat_at,
            // Добавляем координаты из parent location
            latitude: loc.latitude,
            longitude: loc.longitude,
            locationName: loc.name,
            locationAddress: loc.address
          }))
        }));
      } else {
        const { data: locations, error: locError } = await supabase
          .from('locations')
          .select('id, name, address, city, country, latitude, longitude, status, stations_count, connectors_count')
          .eq('status', 'active');

        if (locError) throw locError;

        return (locations || []).map(loc => ({
          ...loc,
          status: 'available' as const,
          available_connectors: 0
        }));
      }
    }
  }

  private mapLocationStatus(stations: any[]): 'available' | 'occupied' | 'offline' | 'maintenance' | 'partial' {
    if (!stations || stations.length === 0) return 'offline';

    // Фильтруем станции по статусу и heartbeat
    const now = new Date();
    const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000; // 5 минут

    const onlineStations = stations.filter(s => {
      // Станция должна быть active
      if (s.status !== 'active') return false;

      // Проверяем heartbeat
      if (!s.last_heartbeat_at) return false;
      const lastHeartbeat = new Date(s.last_heartbeat_at);
      const timeSinceHeartbeat = now.getTime() - lastHeartbeat.getTime();

      // Heartbeat должен быть свежим (не старше 5 минут)
      return timeSinceHeartbeat <= HEARTBEAT_TIMEOUT_MS;
    });

    // Если нет онлайн станций - offline
    if (onlineStations.length === 0) return 'offline';

    // Проверяем доступность среди онлайн станций
    const availableStations = onlineStations.filter(s => s.is_available);
    if (availableStations.length === 0) return 'occupied';
    if (availableStations.length < onlineStations.length) return 'partial';

    return 'available';
  }

  private countAvailableConnectors(stations: any[]): number {
    // Учитываем только онлайн станции с актуальным heartbeat
    const now = new Date();
    const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000; // 5 минут

    return stations
      .filter(s => {
        if (s.status !== 'active' || !s.is_available) return false;

        // Проверяем heartbeat
        if (!s.last_heartbeat_at) return false;
        const lastHeartbeat = new Date(s.last_heartbeat_at);
        const timeSinceHeartbeat = now.getTime() - lastHeartbeat.getTime();
        return timeSinceHeartbeat <= HEARTBEAT_TIMEOUT_MS;
      })
      .reduce((sum, s) => sum + (s.connectors_count || 1), 0);
  }

  /**
   * Получить статус станции
   */
  async getStationStatus(stationId: string): Promise<import('../api/types').StationStatusResponse> {
    return this.apiRequest<import('../api/types').StationStatusResponse>(`/station/status/${stationId}`);
  }

  // ============== BALANCE & PAYMENTS ==============

  /**
   * Получить текущий баланс
   */
  async getBalance(): Promise<number> {
    const client_id = await this.getClientId();

    // Вариант 1: через API
    const response = await this.apiRequest<{ balance: number }>(
      `/balance/${client_id}`
    );
    return response.balance;

    // Вариант 2: напрямую из Supabase (альтернатива)
    // const { data } = await supabase
    //   .from('clients')
    //   .select('balance')
    //   .eq('id', client_id)
    //   .single();
    // return data?.balance || 0;
  }

  /**
   * Пополнить баланс через QR (O!Dengi)
   */
  async topupWithQR(amount: number, description?: string): Promise<TopupQRResponse> {
    const client_id = await this.getClientId();

    return this.apiRequest<TopupQRResponse>('/balance/topup-qr', {
      method: 'POST',
      body: JSON.stringify({
        client_id,
        amount,
        description
      })
    });
  }

  /**
   * Пополнить баланс картой (OBank)
   */
  async topupWithCard(
    amount: number,
    cardDetails: {
      pan: string;
      name: string;
      cvv: string;
      year: string;
      month: string;
      email: string;
      phone?: string;
    },
    description?: string
  ): Promise<TopupCardResponse> {
    const client_id = await this.getClientId();

    return this.apiRequest<TopupCardResponse>('/balance/topup-card', {
      method: 'POST',
      body: JSON.stringify({
        client_id,
        amount,
        card_pan: cardDetails.pan,
        card_name: cardDetails.name,
        card_cvv: cardDetails.cvv,
        card_year: cardDetails.year,
        card_month: cardDetails.month,
        email: cardDetails.email,
        phone_number: cardDetails.phone,
        description
      })
    });
  }

  /**
   * Проверить статус платежа
   */
  async getPaymentStatus(invoiceId: string): Promise<PaymentStatus> {
    return this.apiRequest<PaymentStatus>(`/payment/status/${invoiceId}`);
  }

  // ============== HISTORY (через Supabase) ==============

  /**
   * Получить историю зарядок
   */
  async getChargingHistory(limit = 20) {
    const client_id = await this.getClientId();

    const { data, error } = await supabase
      .from('charging_sessions')
      .select(`
        *,
        stations (
          model,
          locations (
            name,
            address
          )
        )
      `)
      .eq('user_id', client_id) // user_id это client_id
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Получить историю транзакций
   */
  async getTransactionHistory(limit = 20) {
    const client_id = await this.getClientId();

    const { data, error } = await supabase
      .from('payment_transactions_odengi')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  // ============== REALTIME ==============

  /**
   * Подписаться на изменения баланса
   */
  subscribeToBalance(callback: (balance: number) => void) {
    const subscription = supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return null;

      return supabase
        .channel('balance-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'clients',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            callback(payload.new.balance);
          }
        )
        .subscribe();
    });

    return subscription;
  }

  /**
   * WebSocket для статусов локаций
   */
  async connectToLocationsWebSocket(): Promise<WebSocket> {
    const client_id = await this.getClientId();

    const ws = new WebSocket(
      `wss://${API_BASE_URL.replace('https://', '')}${API_VERSION}/ws/locations?client_id=${client_id}`
    );

    return ws;
  }

  /**
   * Получить текущего пользователя
   */
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', user.id)
      .single();

    return client;
  }

  /**
   * Обновить данные пользователя
   */
  async refreshUserData() {
    const user = await this.getCurrentUser();
    if (user) {
      // Trigger balance update или другая логика
      return user;
    }
    return null;
  }

  /**
   * Alias методы для совместимости
   */
  async createQRTopup(amount: number, description?: string) {
    return this.topupWithQR(amount, description);
  }

  async getPaymentStatusCheck(invoiceId: string) {
    return this.getPaymentStatus(invoiceId);
  }

  async getBalanceForClient(clientId: string): Promise<Balance> {
    const balance = await this.getBalance();
    return {
      client_id: clientId,
      balance,
      currency: 'KGS'
    };
  }

  async startChargingCompat(params: StartChargingRequest): Promise<ChargingSession> {
    const response = await this.startCharging(
      params.station_id,
      params.connector_id,
      {
        energy_kwh: params.energy_kwh,
        amount_som: params.amount_som
      }
    );
    return {
      ...response,
      transaction_id: response.session_id,
      ocpp_transaction_id: response.session_id
    } as ChargingSession;
  }

  async stopChargingCompat(params: StopChargingParams): Promise<StopChargingResponse> {
    return this.stopCharging(params.session_id);
  }
}

// Экспортируем singleton
export const evpowerApi = new EvPowerApiService();

// ============== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ СОВМЕСТИМОСТИ ==============

/**
 * API Error class для совместимости
 */
export class ApiError extends Error {
  public code: string;
  public status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Маппинг ошибок для русской локализации
 */
const ERROR_MESSAGES: Record<string, string> = {
  client_not_found: 'Клиент не найден',
  station_unavailable: 'Станция недоступна',
  insufficient_balance: 'Недостаточно средств на балансе',
  connector_occupied: 'Коннектор уже используется',
  session_not_found: 'Сессия зарядки не найдена',
  station_offline: 'Станция не в сети',
  payment_not_found: 'Платеж не найден',
  payment_expired: 'Время оплаты истекло',
  invalid_amount: 'Некорректная сумма',
  provider_error: 'Ошибка платежной системы',
  internal_error: 'Внутренняя ошибка сервера',
  invalid_request: 'Некорректный запрос',
  timeout: 'Превышено время ожидания',
  network_error: 'Ошибка сети',
  unauthorized: 'Требуется авторизация',
  forbidden: 'Доступ запрещен',
  not_found: 'Не найдено'
};

/**
 * Обработка ошибок API для совместимости со старым кодом
 */
export function handleApiError(error: any): string {
  if (error instanceof ApiError) {
    return ERROR_MESSAGES[error.code] || error.message || 'Неизвестная ошибка';
  }

  if (error?.response?.data?.error) {
    return ERROR_MESSAGES[error.response.data.error] || error.response.data.message || 'Ошибка сервера';
  }

  if (error?.error) {
    return ERROR_MESSAGES[error.error] || error.message || 'Неизвестная ошибка';
  }

  return error?.message || 'Неизвестная ошибка';
}

/**
 * Singleton для обратной совместимости
 */
export const apiClient = evpowerApi;
export const unifiedApi = evpowerApi;

// Типы уже экспортированы выше через export interface

// Алиасы для совместимости
export type Balance = {
  client_id: string;
  balance: number;
  currency: string;
  last_topup_at?: string;
  total_spent?: number;
};

export type QRTopupResponse = TopupQRResponse;
export type CreateQRTopupParams = TopupQRRequest;
export type StartChargingParams = StartChargingRequest;
export type StopChargingParams = { session_id: string };
export type ChargingSession = StartChargingResponse & {
  ocpp_transaction_id?: string;
  transaction_id?: string;
};

// Методы getCurrentUser и refreshUserData теперь в классе выше