/**
 * API Zod Schemas - Runtime 20;840F8O >B25B>2 >B Backend API
 *
 * : -B8 AE5<K 8A?>;L7CNBAO 4;O 20;840F88 >B25B>2 >B OCPP Backend API.
 * =8  8A?>;L7CNBAO 4;O 20;840F88 Supabase fallback 70?@>A>2 (A<. evpowerApi.ts:386-510).
 *
 * @8=F8?K:
 * - 57>?0A=>ABL: AB@>30O 20;840F8O 2A5E ?>;59
 * - @>872>48B5;L=>ABL: <8=8<0;L=K5 B@0=AD>@<0F88
 * - "8?>157>?0A=>ABL: A8=E@>=870F8O A types.ts
 *
 * @see src/api/types.ts - TypeScript 8=B5@D59AK
 * @see src/services/evpowerApi.ts - 8A?>;L7>20=85 AE5<
 */

import { z } from "zod";

// ============== LOCATIONS & STATIONS ==============

/**
 * !E5<0 4;O :>>@48=0B ;>:0F88
 */
const zCoordinates = z.object({
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

/**
 * !E5<0 4;O B0@8D0 AB0=F88
 *
 * : Backend 2>72@0I05B "tariff" A ?>;5< "price_per_kwh" ( "rate_per_kwh")
 */
const zTariff = z.object({
  price_per_kwh: z.number(), // &5=0 2 A><0E 70 :B�G
  session_fee: z.number(), // $8:A8@>20==0O ?;0B0 70 A5AA8N
  currency: z.string(), // "KGS"
});

/**
 * !E5<0 4;O summary :>==5:B>@>2
 */
const zConnectorsSummary = z.object({
  total: z.number().optional(), // Backend может не возвращать total, вычисляем из available+occupied+faulted
  available: z.number(),
  occupied: z.number(),
  faulted: z.number(),
});

/**
 * !E5<0 4;O summary AB0=F89
 */
const zStationsSummary = z.object({
  total: z.number(),
  available: z.number(),
  occupied: z.number(),
  offline: z.number(),
  maintenance: z.number(),
});

/**
 * !E5<0 4;O >B45;L=>9 AB0=F88 2=CB@8 ;>:0F88
 */
const zStation = z.object({
  id: z.string(),
  serial_number: z.string(),
  model: z.string(),
  manufacturer: z.string(),
  location_id: z.string().optional(), // Может отсутствовать во вложенных станциях - добавляется из родительской локации
  status: z.enum(["available", "occupied", "offline", "maintenance"]),
  power_capacity: z.number(),
  connectors_count: z.number(),
  tariff: zTariff,
  connectors_summary: zConnectorsSummary,
});

/**
 * !E5<0 4;O >4=>9 ;>:0F88
 */
const zLocation = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  coordinates: zCoordinates,
  status: z.enum([
    "available",
    "partial",
    "occupied",
    "maintenance",
    "offline",
  ]),
  stations_summary: zStationsSummary,
  connectors_summary: zConnectorsSummary,
  // Flat fields for compatibility with Location interface
  stations_count: z.number().optional(),
  connectors_count: z.number().optional(),
  available_connectors: z.number().optional(),
  stations: z.array(zStation).optional(),
});

/**
 * !E5<0 4;O >B25B0 GET /api/v1/locations
 *
 * Backend 2>72@0I05B >15@B:C A success, total, 8 <0AA82>< locations
 */
export const zLocationsEnvelopeBackend = z.object({
  success: z.boolean(),
  total: z.number(),
  locations: z.array(zLocation),
});

// ============== STATION STATUS ==============

/**
 * !E5<0 4;O >4=>3> :>==5:B>@0 2 >B25B5 station status
 */
const zStationConnector = z.object({
  id: z.number(),
  type: z.string(),
  status: z.string(),
  available: z.boolean(),
  power_kw: z.number().optional(),
  error: z.string().nullish(),
});

/**
 * !E5<0 4;O >B25B0 GET /api/v1/station/status/{station_id}
 */
export const zStationStatusResponse = z.object({
  success: z.boolean(),
  station_id: z.string(),
  serial_number: z.string(),
  model: z.string(),
  manufacturer: z.string(),
  online: z.boolean(),
  station_status: z.string(),
  location_status: z.string(),
  available_for_charging: z.boolean(),
  location_id: z.string(),
  location_name: z.string(),
  location_address: z.string(),
  connectors: z.array(zStationConnector),
  total_connectors: z.number(),
  available_connectors: z.number(),
  occupied_connectors: z.number(),
  faulted_connectors: z.number(),
  tariff_rub_kwh: z.number(),
  session_fee: z.number(),
  currency: z.string(),
  working_hours: z.string(),
  message: z.string().nullish(),
});

// ============== CHARGING ==============

/**
 * !E5<0 4;O >B25B0 POST /api/v1/charging/start
 */
export const zStartChargingResponse = z.object({
  success: z.boolean(),
  message: z.string().nullish(),
  error: z.string().nullish(),
  session_id: z.string().optional(),
  connector_id: z.number().optional(),
  reserved_amount: z.number().optional(),
  limit_type: z.enum(["energy", "amount", "none"]).optional(),
  limit_value: z.number().optional(),
  rate_per_kwh: z.number().optional(),
  session_fee: z.number().optional(),
  required_amount: z.number().optional(),
  current_balance: z.number().optional(),
});

/**
 * Схема для сессии внутри ChargingStatus
 *
 * ВАЖНО: Backend возвращает "cost", mobile использует "current_cost"
 * Трансформация происходит в evpowerApi.ts при обработке ответа
 */
const zChargingSession = z.object({
  id: z.string().optional(), // session_id в backend
  session_id: z.string().optional(), // альтернативное имя
  status: z.enum(["started", "stopped", "error"]),
  station_id: z.string(),
  connector_id: z.number().optional(),
  start_time: z.string(), // ISO datetime
  stop_time: z.string().nullish(),
  energy_consumed: z.number().optional().default(0),
  energy_consumed_kwh: z.number().optional(), // Backend alias
  // Backend возвращает "cost", mobile использует "current_cost"
  cost: z.number().optional(),
  current_cost: z.number().optional().default(0),
  current_amount: z.number().optional(), // Backend alias для cost
  reserved_amount: z.number().optional().default(0),
  limit_type: z.enum(["energy", "amount", "none"]).optional().default("none"),
  limit_value: z.number().optional(),
  limit_reached: z.boolean().optional().default(false),
  limit_percentage: z.number().optional().default(0),
  progress_percent: z.number().optional(), // Backend alias для limit_percentage
  rate_per_kwh: z.number().optional().default(0),
  session_fee: z.number().optional().default(0),
  ocpp_transaction_id: z.union([z.number(), z.string()]).nullish(), // Backend может вернуть null
  transaction_id: z.string().nullish(), // Backend может вернуть null
  meter_start: z.number().optional(),
  meter_current: z.number().optional(),
  charging_duration_minutes: z.number().optional().default(0),
  duration_minutes: z.number().optional(), // Backend alias
  // Дополнительные поля из backend
  charging_power: z.number().optional(),
  station_current: z.number().optional(),
  station_voltage: z.number().optional(),
  ev_battery_soc: z.number().optional(),
  station_online: z.boolean().optional(),
  client_id: z.string().optional(),
  ocpp_status: z.string().nullish(), // Backend может вернуть null
  has_meter_data: z.boolean().optional(),
  message: z.string().optional(),
});

/**
 * Схема для ответа GET /api/v1/charging/status/{session_id}
 *
 * Backend возвращает плоскую структуру (все поля на верхнем уровне),
 * но mobile ожидает вложенную структуру { success, session: {...} }.
 * Трансформация происходит в evpowerApi.ts
 */
export const zChargingStatusRaw = z
  .object({
    success: z.boolean(),
    // Плоские поля от backend (без вложенности)
    session_id: z.string().optional(),
    status: z.string().optional(),
    station_id: z.string().optional(),
    client_id: z.string().optional(),
    connector_id: z.number().optional(),
    start_time: z.string().optional(),
    stop_time: z.string().nullish(),
    duration_minutes: z.number().optional(),
    energy_consumed: z.number().optional(),
    energy_consumed_kwh: z.number().optional(),
    cost: z.number().optional(),
    current_cost: z.number().optional(),
    current_amount: z.number().optional(),
    final_amount_som: z.number().optional(),
    amount_charged_som: z.number().optional(),
    reserved_amount: z.number().optional(),
    limit_value: z.number().optional(),
    limit_type: z.string().optional(),
    progress_percent: z.number().optional(),
    charging_power: z.number().optional(),
    station_current: z.number().optional(),
    station_voltage: z.number().optional(),
    ev_battery_soc: z.number().optional(),
    ev_current: z.number().optional(),
    ev_voltage: z.number().optional(),
    temperatures: z.record(z.number()).optional(),
    meter_start: z.number().optional(),
    meter_current: z.number().optional(),
    station_online: z.boolean().optional(),
    last_update: z.string().nullish(),
    transaction_id: z.string().nullish(), // Backend может вернуть null
    ocpp_transaction_id: z.string().nullish(),
    rate_per_kwh: z.number().optional(),
    ocpp_status: z.string().nullish(), // Backend может вернуть null
    has_meter_data: z.boolean().optional(),
    error: z.string().nullish(),
    message: z.string().nullish(),
    // Вложенная структура (если backend её вернёт)
    session: zChargingSession.optional(),
  })
  .passthrough(); // Разрешить неизвестные поля

// Для совместимости с существующим кодом
export const zChargingStatus = zChargingStatusRaw;

/**
 * !E5<0 4;O >B25B0 POST /api/v1/charging/stop
 */
export const zStopChargingResponse = z.object({
  success: z.boolean(),
  message: z.string().nullish(),
  error: z.string().nullish(),
  final_cost: z.number().optional(),
  energy_consumed: z.number().optional(),
  duration_minutes: z.number().optional(),
  refunded_amount: z.number().optional(),
  additional_charge: z.number().optional(),
});

// ============== BALANCE & PAYMENTS ==============

/**
 * !E5<0 4;O >B25B0 POST /api/v1/balance/topup-qr
 *
 * !!",: QR B>?-0? - 548=AB25==K9 157>?0A=K9 A?>A>1 ?>?>;=5=8O =0 :;85=B5
 * (=5 B@51C5B ?5@540G8 40==KE :0@BK)
 */
export const zTopupQRResponse = z.object({
  success: z.boolean(),
  invoice_id: z.string().optional(),
  order_id: z.string().optional(),
  qr_code: z.string().optional(), // 0==K5 4;O 35=5@0F88 QR
  qr_code_url: z.string().optional(), // URL :0@B8=:8 QR-:>40
  app_link: z.string().optional(), // Deeplink 4;O O!Dengi
  amount: z.number().optional(),
  client_id: z.string().optional(),
  current_balance: z.number().optional(),
  qr_expires_at: z.string().optional(), // ISO datetime
  invoice_expires_at: z.string().optional(), // ISO datetime
  qr_lifetime_seconds: z.number().optional(),
  invoice_lifetime_seconds: z.number().optional(),
  error: z.string().nullish(),
});

/**
 * !E5<0 4;O >B25B0 POST /api/v1/balance/topup-card
 *
 * @deprecated -B>B <5B>4  !,#"!/ 2 ?@8;>65=88 (PCI DSS compliance).
 * !E5<0 A>E@0=5=0 4;O >1@0B=>9 A>2<5AB8<>AB8 API.
 */
export const zTopupCardResponse = z.object({
  success: z.boolean(),
  auth_key: z.string().optional(),
  acs_url: z.string().optional(),
  md: z.string().optional(),
  pa_req: z.string().optional(),
  term_url: z.string().optional(),
  client_id: z.string().optional(),
  current_balance: z.number().optional(),
  error: z.string().nullish(),
});

/**
 * !E5<0 4;O >B25B0 GET /api/v1/payment/status/{invoice_id}
 *
 * \u0012\u0010\u0016\u001d\u001e: status_text 2>72@0I05BAO =0 @CAA:>< O7K:5 4;O UI (\u001d\u0015 enum)
 * \u00140;O ;>38:8 8A?>;L7C9B5 status (number)
 */
export const zPaymentStatus = z.object({
  success: z.boolean(),
  status: z
    .union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ])
    .optional(), // O!Dengi :>4K: 0-processing, 1-approved, 2-canceled, 3-refunded, 4-partial_refund
  status_text: z.string().optional(), // #CAA:89 B5:AB 4;O UI, =5 enum
  amount: z.number().optional(),
  paid_amount: z.number().nullish(), // <>65B 1KBL null
  invoice_id: z.string().optional(),
  can_proceed: z.boolean().optional().default(false),
  can_start_charging: z.boolean().optional().default(false),
  qr_expired: z.boolean().optional().default(false),
  invoice_expired: z.boolean().optional().default(false),
  qr_expires_at: z.string().datetime().nullable().optional(),
  invoice_expires_at: z.string().datetime().nullable().optional(),
  last_status_check_at: z.string().datetime().nullable().optional(), // \u00122@5<O ?>A;54=59 ?@>25@:8
  needs_callback_check: z.boolean().optional().default(false), // "@51C5BAO ?@>25@:0 G5@57 callback
  error: z.string().nullable().optional(),
});

// ============== TYPE EXPORTS ==============

/**
 * -:A?>@B8@C5< B8?K 4;O 8A?>;L7>20=8O 2 TypeScript
 * (02B><0B8G5A:8 2K2>4OBAO 87 Zod AE5<)
 */
export type LocationsEnvelopeBackend = z.infer<
  typeof zLocationsEnvelopeBackend
>;
export type Location = z.infer<typeof zLocation>;
export type Station = z.infer<typeof zStation>;
export type StationStatusResponse = z.infer<typeof zStationStatusResponse>;
export type StartChargingResponse = z.infer<typeof zStartChargingResponse>;
export type ChargingStatus = z.infer<typeof zChargingStatus>;
export type StopChargingResponse = z.infer<typeof zStopChargingResponse>;
export type TopupQRResponse = z.infer<typeof zTopupQRResponse>;
export type TopupCardResponse = z.infer<typeof zTopupCardResponse>;
export type PaymentStatus = z.infer<typeof zPaymentStatus>;
