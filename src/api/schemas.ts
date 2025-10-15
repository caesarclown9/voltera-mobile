import { z } from "@/api/unifiedClient";

// ====== Charging ======
export const zStartChargingResponse = z.object({
  success: z.literal(true),
  message: z.string().optional(),
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
export type StartChargingResponseZ = z.infer<typeof zStartChargingResponse>;

export const zChargingStatus = z.object({
  success: z.literal(true),
  session: z
    .object({
      id: z.string(),
      status: z.enum(["started", "stopped", "error"]),
      station_id: z.string(),
      connector_id: z.number(),
      start_time: z.string(),
      stop_time: z.string().optional(),
      energy_consumed: z.number(),
      current_cost: z.number(),
      reserved_amount: z.number().optional(),
      limit_type: z.enum(["energy", "amount", "none"]),
      limit_value: z.number().optional(),
      limit_reached: z.boolean().optional(),
      limit_percentage: z.number().optional(),
      rate_per_kwh: z.number().optional(),
      session_fee: z.number().optional(),
      ocpp_transaction_id: z.number().optional(),
      meter_start: z.number().optional(),
      meter_current: z.number().optional(),
      charging_duration_minutes: z.number().optional(),
    })
    .optional(),
});
export type ChargingStatusZ = z.infer<typeof zChargingStatus>;

export const zStopChargingResponse = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  final_cost: z.number().optional(),
  energy_consumed: z.number().optional(),
  duration_minutes: z.number().optional(),
  refunded_amount: z.number().optional(),
  additional_charge: z.number().optional(),
});
export type StopChargingResponseZ = z.infer<typeof zStopChargingResponse>;

// ====== Locations & Stations ======
export const zConnectorStatus = z.object({
  connector_id: z.number(),
  status: z.enum([
    "Available",
    "Preparing",
    "Charging",
    "SuspendedEVSE",
    "SuspendedEV",
    "Finishing",
    "Reserved",
    "Unavailable",
    "Faulted",
  ]),
  error_code: z.string().optional(),
  info: z.string().optional(),
});

export const zStation = z.object({
  id: z.string(),
  serial_number: z.string(),
  model: z.string(),
  manufacturer: z.string(),
  location_id: z.string().optional(), // Backend может не возвращать
  power_capacity: z.number(),
  connector_types: z.array(z.string()).optional(), // Backend может не возвращать
  status: z.enum(["active", "inactive", "maintenance", "offline"]), // Добавили offline
  connectors_count: z.number().optional(),
  // Старые поля - опциональны для обратной совместимости
  price_per_kwh: z.number().optional(),
  session_fee: z.number().optional(),
  currency: z.literal("KGS").optional(),
  // Новая структура с tariff объектом
  tariff: z
    .object({
      price_per_kwh: z.number(),
      session_fee: z.number(),
      currency: z.literal("KGS"),
    })
    .optional(),
  // Новая структура с connectors_summary
  connectors_summary: z
    .object({
      total: z.number(),
      available: z.number(),
      occupied: z.number(),
      faulted: z.number().optional(),
    })
    .optional(),
  firmware_version: z.string().optional(),
  ocpp_status: z
    .object({
      is_online: z.boolean(),
      last_heartbeat: z.string(),
      connector_status: z.array(zConnectorStatus),
    })
    .optional(),
});

export const zLocation = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  status: z.enum([
    "available",
    "occupied",
    "offline",
    "maintenance",
    "partial",
  ]),
  // Старые поля - опциональны для обратной совместимости
  stations_count: z.number().optional(),
  connectors_count: z.number().optional(),
  available_connectors: z.number().optional(),
  // Новая структура с stations_summary
  stations_summary: z
    .object({
      total: z.number(),
      available: z.number(),
      occupied: z.number().optional(),
      offline: z.number().optional(),
      maintenance: z.number().optional(),
    })
    .optional(),
  // Новая структура с connectors_summary
  connectors_summary: z
    .object({
      total: z.number(),
      available: z.number(),
      occupied: z.number(),
      faulted: z.number().optional(),
    })
    .optional(),
  stations: z.array(zStation).optional(),
});
export type LocationZ = z.infer<typeof zLocation>;

export const zLocationsEnvelope = z.object({
  locations: z.array(zLocation),
});

// ====== Station Status ======
export const zStationConnector = z.object({
  id: z.number(),
  type: z.string(),
  power_kw: z.number().optional(),
  available: z.boolean(),
  status: z.string(),
  error_code: z.string().optional(),
});

export const zStationStatusResponse = z.object({
  success: z.literal(true),
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
  tariff_rub_kwh: z.number().optional(),
  session_fee: z.number().optional(),
  currency: z.string(),
  working_hours: z.string().optional(),
});

// ====== Payments ======
export const zTopupQRResponse = z.object({
  success: z.literal(true).optional().default(true),
  invoice_id: z.string().optional(),
  order_id: z.string().optional(),
  // Backend может возвращать как qr_code, так и qr
  qr_code: z.string().optional(),
  qr: z.string().optional(),
  // Backend может возвращать как qr_code_url, так и qr_url
  qr_code_url: z.string().optional(),
  qr_url: z.string().optional(),
  // Backend может возвращать как app_link, так и link_app
  app_link: z.string().optional(),
  link_app: z.string().optional(),
  amount: z.number().optional(),
  client_id: z.string().optional(),
  current_balance: z.number().optional(),
  qr_expires_at: z.string().optional(),
  invoice_expires_at: z.string().optional(),
  qr_lifetime_seconds: z.number().optional(),
  invoice_lifetime_seconds: z.number().optional(),
  // Дополнительные поля которые может вернуть backend
  emv_qr: z.string().optional(),
  site_pay: z.string().optional(),
});

export const zTopupCardResponse = z.object({
  success: z.literal(true),
  auth_key: z.string().optional(),
  acs_url: z.string().optional(),
  md: z.string().optional(),
  pa_req: z.string().optional(),
  term_url: z.string().optional(),
  client_id: z.string().optional(),
  current_balance: z.number().optional(),
});

export const zPaymentStatus = z.object({
  success: z.literal(true).optional().default(true),
  status: z
    .union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
    ])
    .optional(),
  // Backend может возвращать русский или английский текст статуса
  status_text: z.string().optional(),
  amount: z.number().optional(),
  // paid_amount может быть null когда платеж еще не оплачен
  paid_amount: z.number().nullable().optional(),
  invoice_id: z.string().optional(),
  qr_expired: z.boolean().optional(),
  invoice_expired: z.boolean().optional(),
  qr_expires_at: z.string().optional(),
  invoice_expires_at: z.string().optional(),
  can_proceed: z.boolean().optional(),
  can_start_charging: z.boolean().optional(),
  // Дополнительные поля от backend
  last_status_check_at: z.string().nullable().optional(),
  needs_callback_check: z.boolean().optional(),
  error: z.string().nullable().optional(),
});

// ====== Generic success ======
export const zSuccessResponse = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});
