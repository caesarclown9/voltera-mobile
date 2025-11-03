/**
 * Voltera API v1 Service - ЕДИНСТВЕННЫЙ API клиент для всего приложения
 * Интеграция с бэкендом OCPP сервера
 *
 * ВАЖНО:
 * - НЕ использует JWT токены
 * - Передает client_id в каждом запросе
 * - client_id = Supabase User ID
 * - Это ЕДИНСТВЕННЫЙ файл для всех API вызовов
 */

import { supabase } from "../shared/config/supabase";
import { logger } from "@/shared/utils/logger";
import { fetchJson } from "@/api/unifiedClient";
import { generateIdempotencyKey } from "@/shared/utils/idempotency";
import { ApiError, handleApiError } from "@/shared/errors/apiErrors";
import {
  zLocationsEnvelopeBackend,
  zStartChargingResponse,
  zChargingStatus,
  zStopChargingResponse,
  zTopupQRResponse,
  zTopupCardResponse,
  zPaymentStatus,
  zStationStatusResponse,
} from "@/api/schemas";
import { z } from "zod";

// ============= Supabase Fallback Types =============

/**
 * Supabase connector row type (для fallback запросов)
 */
interface SupabaseConnectorRow {
  id?: string;
  connector_number?: number;
  connector_type?: string;
  power_kw?: number;
  status?: string;
  error_code?: string;
  [key: string]: unknown;
}

/**
 * Mapped connector type (промежуточный формат)
 */
interface MappedConnector {
  id: number | undefined;
  type: string | undefined;
  power_kw: number | undefined;
  available: boolean;
  status: string | undefined;
  error_code: string;
}

/**
 * Supabase station row type (для fallback запросов)
 */
interface SupabaseStationRow {
  id: string;
  serial_number: string;
  model?: string;
  manufacturer?: string;
  location_id: string;
  power_capacity?: number;
  connector_types?: string[];
  status: string;
  connectors_count?: number;
  price_per_kwh?: string | number;
  session_fee?: string | number;
  currency?: string;
  firmware_version?: string;
  is_available?: boolean;
  last_heartbeat_at?: string;
  connectors?: SupabaseConnectorRow[];
  [key: string]: unknown;
}

/**
 * Supabase location row type (для fallback запросов)
 */
interface SupabaseLocationRow {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  status: string;
  stations_count?: number;
  connectors_count?: number;
  stations?: SupabaseStationRow[];
  [key: string]: unknown;
}

const API_VERSION = "/api/v1";
// В dev принудительно используем относительный путь через proxy; в prod — берем из VITE_API_URL
// КРИТИЧНО: import.meta.env.VITE_API_URL напрямую (не через .env) для правильной работы в Capacitor
const API_ORIGIN: string = import.meta.env.PROD
  ? String(import.meta.env.VITE_API_URL || "https://ocpp.voltera.kg")
  : "";

export interface StartChargingRequest {
  client_id: string; // ОБЯЗАТЕЛЬНО
  station_id: string; // ОБЯЗАТЕЛЬНО
  connector_id: number; // ОБЯЗАТЕЛЬНО (1, 2, 3...)
  energy_kwh?: number; // Лимит по энергии в кВт·ч
  amount_som?: number; // Лимит по сумме в сомах
}

export interface StartChargingResponse {
  success: boolean;
  message?: string | null;
  error?: string | null;
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
    reserved_amount: number; // Зарезервировано
    limit_type: "energy" | "amount" | "none";
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
  message?: string | null;
  error?: string | null;
  final_cost?: number; // Финальная стоимость
  energy_consumed?: number; // Потреблено кВт·ч
  duration_minutes?: number;
  refunded_amount?: number; // Возвращено на баланс
  additional_charge?: number; // Дополнительно списано
}

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
  error?: string | null;
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

class EvPowerApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_ORIGIN
      ? `${API_ORIGIN}${API_VERSION}`
      : `${API_VERSION}`;
  }

  /**
   * Получить текущий client_id из Supabase Auth
   */
  private async getClientId(): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    return user.id;
  }

  /**
   * Базовый метод для API запросов
   */
  private async apiRequest<T>(
    endpoint: string,
    options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown },
    schema: import("zod").ZodType<T>,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    logger.debug(`[VolteraAPI] ${options.method || "GET"} ${url}`);
    // Добавляем Authorization: Bearer <Supabase JWT> если доступен
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const method = options.method || "GET";
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
      // Debug: логируем первые и последние символы токена
      const token = session.access_token;
      logger.debug(
        `[VolteraAPI] Auth token: ${token.substring(0, 20)}...${token.substring(token.length - 20)}`,
      );
    } else {
      logger.warn("[VolteraAPI] No access token found in session!");
    }
    // Добавляем Idempotency-Key для критичных операций (предотвращает дубликаты)
    if (method === "POST" || method === "PUT" || method === "DELETE") {
      headers["Idempotency-Key"] = generateIdempotencyKey();
    }
    return await fetchJson<T>(
      url,
      { method, body: options.body, timeoutMs: 10000, retries: 2, headers },
      schema,
    );
  }

  // ============== CHARGING ==============

  /**
   * Начать зарядку
   */
  async startCharging(
    stationId: string,
    connectorId: number,
    limits?: { energy_kwh?: number; amount_som?: number },
  ): Promise<StartChargingResponse> {
    return this.apiRequest(
      "/charging/start",
      {
        method: "POST",
        body: {
          station_id: stationId,
          connector_id: connectorId,
          ...limits,
        },
      },
      zStartChargingResponse,
    );
  }

  /**
   * Получить статус зарядки
   */
  async getChargingStatus(
    sessionId: string,
  ): Promise<import("../api/types").ChargingStatus> {
    const parsed = await this.apiRequest(
      `/charging/status/${sessionId}`,
      { method: "GET" },
      zChargingStatus,
    );
    const session = parsed.session
      ? {
          id: parsed.session.id,
          status: parsed.session.status,
          station_id: parsed.session.station_id,
          connector_id: parsed.session.connector_id,
          start_time: parsed.session.start_time,
          stop_time: parsed.session.stop_time,
          energy_consumed: parsed.session.energy_consumed ?? 0,
          current_cost: parsed.session.current_cost ?? 0,
          reserved_amount: parsed.session.reserved_amount ?? 0,
          limit_type: parsed.session.limit_type,
          limit_value: parsed.session.limit_value,
          limit_reached: parsed.session.limit_reached ?? false,
          limit_percentage: parsed.session.limit_percentage ?? 0,
          rate_per_kwh: parsed.session.rate_per_kwh ?? 0,
          session_fee: parsed.session.session_fee ?? 0,
          ocpp_transaction_id: parsed.session.ocpp_transaction_id,
          meter_start: parsed.session.meter_start,
          meter_current: parsed.session.meter_current,
          charging_duration_minutes:
            parsed.session.charging_duration_minutes ?? 0,
        }
      : undefined;
    return { success: true, session };
  }

  /**
   * Остановить зарядку
   */
  async stopCharging(sessionId: string): Promise<StopChargingResponse> {
    return this.apiRequest(
      "/charging/stop",
      { method: "POST", body: { session_id: sessionId } },
      zStopChargingResponse,
    );
  }

  // ============== LOCATIONS & STATIONS ==============

  /**
   * Получить список локаций со станциями
   */
  async getLocations(includeStations = true): Promise<Location[]> {
    try {
      const response = await this.apiRequest<
        import("zod").infer<typeof zLocationsEnvelopeBackend>
      >(
        `/locations?include_stations=${includeStations}`,
        { method: "GET" },
        zLocationsEnvelopeBackend,
      );

      // DEBUG в dev: логирование ответа от API
      logger.debug("[VolteraAPI] API response for /locations:");
      logger.debug(
        `[VolteraAPI] Backend API success: ${response.success}, total: ${response.total}`,
      );
      logger.debug(
        `[VolteraAPI] Locations count from API: ${response.locations?.length || 0}`,
      );

      return response.locations as Location[];
    } catch (error) {
      if (
        import.meta.env.PROD &&
        import.meta.env["VITE_ENABLE_SUPABASE_FALLBACK"] !== "true"
      ) {
        throw error;
      }
      logger.warn(
        "[VolteraAPI] API unavailable, using Supabase fallback",
        error,
      );

      // Fallback: прямой запрос к Supabase
      logger.debug(`[VolteraAPI] includeStations: ${includeStations}`);

      if (includeStations) {
        logger.debug("[VolteraAPI] Starting Supabase query via REST...");

        // Use direct REST API instead of Supabase client to avoid auth issues
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        let locations;
        try {
          const response = await fetch(
            `${supabaseUrl}/rest/v1/locations?status=eq.active&select=id,name,address,city,country,latitude,longitude,status,stations_count,connectors_count,stations(id,serial_number,model,manufacturer,location_id,power_capacity,connector_types,status,connectors_count,price_per_kwh,session_fee,currency,firmware_version,is_available,last_heartbeat_at,connectors(status,connector_number))`,
            {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=representation",
              },
            },
          );

          logger.debug(
            `[VolteraAPI] Supabase REST response status: ${response.status}`,
          );

          if (!response.ok) {
            const errorText = await response.text();
            logger.error(
              "[VolteraAPI] Supabase REST error",
              new Error(errorText),
            );
            throw new Error(
              `Supabase REST error: ${response.status} ${errorText}`,
            );
          }

          locations = await response.json();
          logger.debug(
            `[VolteraAPI] Supabase REST returned locations: ${locations?.length || 0}`,
          );
        } catch (err) {
          logger.error(
            "[VolteraAPI] Supabase REST THREW exception",
            err as Error,
          );
          throw err;
        }

        logger.debug(
          `[VolteraAPI] Supabase fallback returned locations: ${locations?.length || 0}`,
        );

        // Преобразуем к формату API
        const mappedLocations = (locations || []).map(
          (loc: SupabaseLocationRow) => {
            const mappedStatus = this.mapLocationStatus(loc.stations || []);
            logger.debug(
              `[VolteraAPI] Location ${loc.id}: DB status="${loc.status}" -> mapped status="${mappedStatus}"`,
            );

            return {
              id: loc.id,
              name: loc.name,
              address: loc.address,
              city: loc.city,
              country: loc.country,
              latitude: loc.latitude,
              longitude: loc.longitude,
              status: mappedStatus,
              stations_count: loc.stations_count || 0,
              connectors_count: loc.connectors_count || 0,
              available_connectors: this.countAvailableConnectors(
                loc.stations || [],
              ),
              stations: (loc.stations || []).map((s: SupabaseStationRow) => ({
                id: s.id,
                serial_number: s.serial_number,
                model: s.model,
                manufacturer: s.manufacturer,
                location_id: s.location_id,
                power_capacity: s.power_capacity,
                connector_types: s.connector_types || [],
                status: s.status,
                connectors_count: s.connectors_count || 1,
                price_per_kwh:
                  typeof s.price_per_kwh === "number"
                    ? s.price_per_kwh
                    : parseFloat(String(s.price_per_kwh || 0)),
                session_fee:
                  typeof s.session_fee === "number"
                    ? s.session_fee
                    : parseFloat(String(s.session_fee || 0)),
                currency: s.currency || "KGS",
                firmware_version: s.firmware_version,
                is_available: s.is_available ?? true, // Добавляем is_available
                last_heartbeat_at: s.last_heartbeat_at,
                connectors: Array.isArray(s.connectors)
                  ? s.connectors
                  : undefined,
                // Добавляем координаты из parent location
                latitude: loc.latitude,
                longitude: loc.longitude,
                locationName: loc.name,
                locationAddress: loc.address,
              })),
            };
          },
        );

        logger.debug(
          `[VolteraAPI] Returning ${mappedLocations.length} mapped locations`,
        );
        return mappedLocations;
      } else {
        const { data: locations, error: locError } = await supabase
          .from("locations")
          .select(
            "id, name, address, city, country, latitude, longitude, status, stations_count, connectors_count",
          )
          .eq("status", "active");

        if (locError) throw locError;

        return (locations || []).map((loc) => ({
          ...loc,
          status: "available" as const,
          available_connectors: 0,
        }));
      }
    }
  }

  private mapLocationStatus(
    stations: SupabaseStationRow[],
  ): "available" | "occupied" | "offline" | "maintenance" | "partial" {
    if (!stations || stations.length === 0) return "offline";

    // 1) Серый: если ВСЕ станции локации недоступны (is_available=false)
    const activeStations = stations.filter((s) => s.status === "active");
    if (activeStations.length === 0) return "maintenance";

    const availableStations = activeStations.filter(
      (s) => s.is_available === true,
    );
    if (availableStations.length === 0) return "offline";

    // 2) Желтый: станции доступны, но ВСЕ коннекторы заняты
    const allConnectors = availableStations.flatMap((s) =>
      Array.isArray(s.connectors) ? s.connectors : [],
    );
    const hasAnyFreeConnector =
      allConnectors.length === 0
        ? true // нет телеметрии по коннекторам => по умолчанию свободны
        : allConnectors.some(
            (c: SupabaseConnectorRow) =>
              (c?.status ?? "available") === "available",
          );

    if (!hasAnyFreeConnector) return "occupied";

    // 3) Зеленый: есть хотя бы 1 свободный коннектор
    return availableStations.length < activeStations.length
      ? "partial"
      : "available";
  }

  private countAvailableConnectors(stations: SupabaseStationRow[]): number {
    // Учитываем только активные и доступные станции; коннекторы по умолчанию свободны
    return stations
      .filter((s) => s.status === "active" && s.is_available === true)
      .reduce((sum, s) => {
        const connectors: SupabaseConnectorRow[] = Array.isArray(s.connectors)
          ? s.connectors
          : [];
        if (connectors.length === 0) {
          // Нет телеметрии — считаем что все коннекторы свободны
          return sum + (s.connectors_count || 1);
        }
        const free = connectors.filter(
          (c) => (c?.status ?? "available") === "available",
        ).length;
        return sum + free;
      }, 0);
  }

  /**
   * Получить статус станции
   */
  async getStationStatus(
    stationId: string,
  ): Promise<import("../api/types").StationStatusResponse> {
    try {
      // В контракте tariff_rub_kwh может быть опциональным, но наш тип требует число.
      // Доверяем бэкенду: если поле отсутствует, считаем 13.5.
      const resp = await this.apiRequest(
        `/station/status/${stationId}`,
        { method: "GET" },
        zStationStatusResponse,
      );
      const respData = resp as Record<string, unknown>;
      if (respData["tariff_rub_kwh"] == null) {
        respData["tariff_rub_kwh"] = 13.5;
      }
      return resp as unknown as import("../api/types").StationStatusResponse;
    } catch (error) {
      if (
        import.meta.env.PROD &&
        import.meta.env["VITE_ENABLE_SUPABASE_FALLBACK"] !== "true"
      ) {
        throw error;
      }
      // DEV fallback (или явно разрешённый флагом) через Supabase REST
      const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
      const supabaseKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];
      const stationResponse = await fetch(
        `${supabaseUrl}/rest/v1/stations?id=eq.${stationId}&select=id,serial_number,model,manufacturer,status,is_available,location_id,locations(id,name,address),connectors(id,connector_number,connector_type,power_kw,status,error_code)`,
        {
          headers: {
            apikey: String(supabaseKey),
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!stationResponse.ok)
        throw new Error(
          `Supabase station query failed: ${stationResponse.status}`,
        );
      const stations = await stationResponse.json();
      const station = stations[0];
      if (!station) throw new Error(`Station ${stationId} not found`);
      const connectors = (station.connectors || []).map(
        (c: SupabaseConnectorRow) => ({
          id: c.connector_number,
          type: c.connector_type,
          power_kw: c.power_kw,
          available: c.status === "available",
          status: c.status,
          error_code: c.error_code || "NoError",
        }),
      );
      const location = station.locations;
      const result: import("../api/types").StationStatusResponse = {
        success: true,
        station_id: station.id,
        serial_number: station.serial_number,
        model: station.model || "Unknown",
        manufacturer: station.manufacturer || "Unknown",
        online: station.is_available,
        station_status: station.status,
        location_status: station.status,
        available_for_charging: station.is_available,
        location_id: station.location_id,
        location_name: location?.name || "",
        location_address: location?.address || "",
        connectors: connectors.map((c: MappedConnector) => ({
          id: c.id,
          type: c.type,
          power_kw: c.power_kw ?? 0,
          available: c.available,
          status: c.status,
          error: c.error_code,
        })),
        total_connectors: connectors.length,
        available_connectors: connectors.filter(
          (c: MappedConnector) => c.available,
        ).length,
        occupied_connectors: connectors.filter(
          (c: MappedConnector) => !c.available,
        ).length,
        faulted_connectors: connectors.filter(
          (c: MappedConnector) => c.status === "faulted",
        ).length,
        tariff_rub_kwh: 13.5,
        session_fee: 0,
        currency: "KGS",
        working_hours: "24/7",
      };
      return result;
    }
  }

  // ============== BALANCE & PAYMENTS ==============

  /**
   * Получить текущий баланс
   */
  async getBalance(): Promise<number> {
    const client_id = await this.getClientId();

    // Источник истины — Supabase. Берем баланс напрямую из БД.
    const { data, error } = await supabase
      .from("clients")
      .select("balance")
      .eq("id", client_id)
      .single();

    if (error) {
      throw error;
    }

    return typeof data?.["balance"] === "number" ? data["balance"] : 0;
  }

  /**
   * Пополнить баланс через QR (O!Dengi)
   */
  async topupWithQR(
    amount: number,
    description?: string,
  ): Promise<TopupQRResponse> {
    const client_id = await this.getClientId();
    const requestBody = { client_id, amount, description };
    logger.debug("[volteraApi] topupWithQR request:", requestBody);
    return this.apiRequest(
      "/balance/topup-qr",
      { method: "POST", body: requestBody },
      zTopupQRResponse,
    ) as Promise<TopupQRResponse>;
  }

  /**
   * @deprecated НЕ ИСПОЛЬЗУЕТСЯ. Приложение использует только QR топ-ап (topupWithQR).
   * Card data НЕ должны обрабатываться на клиенте (PCI DSS compliance).
   * Метод сохранен для обратной совместимости, но не вызывается нигде в коде.
   *
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
    description?: string,
  ): Promise<TopupCardResponse> {
    const client_id = await this.getClientId();
    return this.apiRequest(
      "/balance/topup-card",
      {
        method: "POST",
        body: {
          client_id,
          amount,
          card_pan: cardDetails.pan,
          card_name: cardDetails.name,
          card_cvv: cardDetails.cvv,
          card_year: cardDetails.year,
          card_month: cardDetails.month,
          email: cardDetails.email,
          phone_number: cardDetails.phone,
          description,
        },
      },
      zTopupCardResponse,
    );
  }

  /**
   * Проверить статус платежа
   */
  async getPaymentStatus(invoiceId: string): Promise<PaymentStatus> {
    return this.apiRequest(
      `/payment/status/${invoiceId}`,
      { method: "GET" },
      zPaymentStatus,
    ) as Promise<PaymentStatus>;
  }

  // ============== HISTORY (через Supabase) ==============

  /**
   * Получить историю зарядок
   */
  async getChargingHistory(limit = 20) {
    const client_id = await this.getClientId();

    const { data, error } = await supabase
      .from("charging_sessions")
      .select(
        `
        *,
        stations (
          model,
          locations (
            name,
            address
          )
        )
      `,
      )
      .eq("user_id", client_id) // user_id это client_id
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Получить историю транзакций (платежей)
   * Объединяет данные из balance_topups и payment_transactions_odengi через JOIN
   * Возвращает все транзакции (успешные и отмененные) с полной информацией
   */
  async getTransactionHistory(limit = 20) {
    const client_id = await this.getClientId();

    // JOIN balance_topups с payment_transactions_odengi для получения balance_before/after
    const { data, error } = await supabase
      .from("balance_topups")
      .select(
        `
        *,
        payment_transactions_odengi!payment_transactions_odengi_balance_topup_id_fkey(
          balance_before,
          balance_after,
          amount,
          transaction_type
        )
      `,
      )
      .eq("client_id", client_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Преобразуем данные для удобства использования
    return (data || []).map((tx) => ({
      ...tx,
      // Для успешных транзакций используем данные из payment_transactions_odengi
      balance_before:
        tx.payment_transactions_odengi?.[0]?.balance_before || null,
      balance_after: tx.payment_transactions_odengi?.[0]?.balance_after || null,
      amount:
        tx.payment_transactions_odengi?.[0]?.amount || tx.requested_amount,
      transaction_type:
        tx.payment_transactions_odengi?.[0]?.transaction_type ||
        (tx.status === "canceled" ? "balance_topup_canceled" : "balance_topup"),
    }));
  }

  // ============== REALTIME ==============

  /**
   * Подписаться на изменения баланса
   */
  subscribeToBalance(callback: (balance: number) => void) {
    const subscription = supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return null;

      return supabase
        .channel("balance-changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "clients",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            callback(payload.new["balance"]);
          },
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

    // В dev — всегда через proxy от текущего origin; в prod — VITE_WS_URL или VITE_API_URL (http->ws)
    const wsOriginEnv: string | undefined = import.meta.env["VITE_WS_URL"];
    const wsBase = import.meta.env.PROD
      ? wsOriginEnv ||
        (API_ORIGIN
          ? API_ORIGIN.replace(/^http/i, "ws")
          : location.origin.replace(/^http/i, "ws"))
      : location.origin.replace(/^http/i, "ws");

    const ws = new WebSocket(
      `${wsBase}${API_VERSION}/ws/locations?client_id=${client_id}`,
    );

    return ws;
  }

  /**
   * Получить текущего пользователя
   */
  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", user.id)
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
   * Инициировать удаление аккаунта и связанных пользовательских данных
   * (операция необратима; платежные записи могут храниться по закону)
   */
  async requestAccountDeletion(): Promise<{ success: true; message?: string }> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Вызываем RPC (предпочтительный способ)
    const { error } = await supabase.rpc("request_account_deletion");
    if (error) {
      const errorObj = error as unknown as Record<string, unknown>;
      const msg = String(errorObj?.["message"] || "");
      const code = String(errorObj?.["code"] || "");
      const isMissingFn =
        code === "PGRST202" || /Could not find the function/i.test(msg);
      if (!isMissingFn) {
        throw error;
      }

      // Fallback: если RPC нет в схеме, отметим удаление напрямую в таблице
      const nowIso = new Date().toISOString();
      const { error: updError } = await supabase
        .from("clients")
        .update({ delete_requested_at: nowIso, status: "inactive" })
        .eq("id", user.id)
        .select("id")
        .single();

      if (updError) {
        const updErrorObj = updError as unknown as Record<string, unknown>;
        const msg2 = String(updErrorObj?.["message"] || "");
        const code2 = String(updErrorObj?.["code"] || "");
        const missingCol =
          code2 === "PGRST204" || /delete_requested_at/i.test(msg2);
        if (!missingCol) throw updError;

        // Колонки нет — минимальный фоллбек: меняем только статус
        const { error: updStatusOnly } = await supabase
          .from("clients")
          .update({ status: "inactive" })
          .eq("id", user.id)
          .select("id")
          .single();
        if (updStatusOnly) throw updStatusOnly;
        return {
          success: true,
          message: "Удаление аккаунта запрошено (status-only fallback)",
        };
      }
      return {
        success: true,
        message: "Удаление аккаунта запрошено (fallback)",
      };
    }
    return { success: true, message: "Удаление аккаунта запрошено" };
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
      currency: "KGS",
    };
  }

  async startChargingCompat(
    params: StartChargingRequest,
  ): Promise<ChargingSession> {
    const response = await this.startCharging(
      params.station_id,
      params.connector_id,
      {
        energy_kwh: params.energy_kwh,
        amount_som: params.amount_som,
      },
    );
    return {
      ...response,
      transaction_id: response.session_id,
      ocpp_transaction_id: response.session_id,
    } as ChargingSession;
  }

  async stopChargingCompat(
    params: StopChargingParams,
  ): Promise<StopChargingResponse> {
    return this.stopCharging(params.session_id);
  }

  // ============== DEVICES (FCM PUSH NOTIFICATIONS) ==============

  /**
   * Регистрация FCM токена устройства для push уведомлений
   *
   * @param fcmToken - FCM токен от Firebase
   * @param platform - Платформа устройства
   * @param appVersion - Версия приложения
   * @returns Успешность регистрации
   */
  async registerDevice(
    fcmToken: string,
    platform: "android" | "ios" | "web",
    appVersion: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.apiRequest<{
        success: boolean;
        message?: string;
      }>(
        "/devices/register",
        {
          method: "POST",
          body: {
            fcm_token: fcmToken,
            platform,
            app_version: appVersion,
          },
        },
        z.object({
          success: z.boolean(),
          message: z.string().optional(),
        }),
      );

      logger.info("[VolteraAPI] FCM token registered successfully");
      return response;
    } catch (error) {
      // Проверяем если это 404 (endpoint не реализован на бэкенде)
      const is404 = error instanceof Error && error.message.includes("404");
      if (is404) {
        logger.warn(
          "[VolteraAPI] FCM endpoints not implemented yet (404) - feature planned for v1.2.0",
        );
      } else {
        logger.error(
          "[VolteraAPI] Failed to register FCM token:",
          error as Error,
        );
      }
      // Не бросаем ошибку, чтобы не блокировать работу приложения
      return { success: false, message: "Failed to register device" };
    }
  }

  /**
   * Удаление FCM токена устройства (при выходе из аккаунта)
   *
   * @param fcmToken - FCM токен для удаления
   * @returns Успешность удаления
   */
  async unregisterDevice(fcmToken: string): Promise<{ success: boolean }> {
    try {
      const response = await this.apiRequest<{ success: boolean }>(
        "/devices/unregister",
        {
          method: "POST",
          body: { fcm_token: fcmToken },
        },
        z.object({ success: z.boolean() }),
      );

      logger.info("[VolteraAPI] FCM token unregistered successfully");
      return response;
    } catch (error) {
      // Проверяем если это 404 (endpoint не реализован на бэкенде)
      const is404 = error instanceof Error && error.message.includes("404");
      if (is404) {
        logger.warn(
          "[VolteraAPI] FCM endpoints not implemented yet (404) - feature planned for v1.2.0",
        );
      } else {
        logger.error(
          "[VolteraAPI] Failed to unregister FCM token:",
          error as Error,
        );
      }
      return { success: false };
    }
  }
}

// Экспортируем singleton
export const volteraApi = new EvPowerApiService();
// Backward compatibility alias
export const evpowerApi = volteraApi;

// ============== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ СОВМЕСТИМОСТИ ==============

// NOTE: ApiError and handleApiError now imported from @/shared/errors/apiErrors
// Re-export for backward compatibility
export { ApiError, handleApiError };

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
