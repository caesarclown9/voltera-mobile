// Типы для системы динамического ценообразования

export interface PricingResult {
  rate_per_kwh: number;
  rate_per_minute: number;
  session_fee: number;
  parking_fee_per_minute: number;
  currency: string;
  active_rule: string;
  rule_details: any;
  time_based: boolean;
  next_rate_change: Date | null;
  tariff_plan_id?: string;
  is_client_tariff?: boolean;
}

export interface TariffPlan {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TariffRule {
  id: string;
  tariff_plan_id: string;
  name: string;
  description?: string;
  connector_type: string;
  power_min?: number;
  power_max?: number;
  time_start?: string; // HH:MM:SS format
  time_end?: string;
  days_of_week?: number[]; // 1=Monday, 7=Sunday
  is_weekend?: boolean;
  price: number;
  price_per_minute?: number;
  session_fee?: number;
  parking_fee_per_minute?: number;
  currency: string;
  priority: number;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
  min_duration_minutes?: number;
  max_duration_minutes?: number;
}

export interface ClientTariff {
  id: string;
  client_id: string;
  tariff_plan_id?: string;
  discount_percent?: number;
  fixed_rate_per_kwh?: number;
  fixed_rate_per_minute?: number;
  session_fee?: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  description?: string;
}

export interface PricingHistory {
  id: string;
  session_id: string;
  station_id: string;
  tariff_plan_id?: string;
  rule_id?: string;
  calculation_time: string;
  rate_per_kwh: number;
  rate_per_minute: number;
  session_fee: number;
  parking_fee_per_minute: number;
  currency: string;
  rule_name?: string;
  rule_details?: any;
}

export interface SessionCostBreakdown {
  energy_cost: number;
  time_cost: number;
  session_fee: number;
  parking_fee: number;
  base_amount: number;
  discount_amount: number;
  final_amount: number;
  currency: string;
}

export interface CachedPricing {
  stationId: string;
  data: PricingResult;
  timestamp: number;
}

// Константы
export const DEFAULT_CURRENCY = "KGS";
export const DEFAULT_RATE_PER_KWH = 13.5; // Фиксированная цена сом/кВт
export const CACHE_TTL = 5 * 60 * 1000; // 5 минут
export const OFFLINE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа
