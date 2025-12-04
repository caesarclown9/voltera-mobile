/**
 * Admin API Service - API для операторов и администраторов
 *
 * Все endpoints требуют авторизации и проверки роли на бэкенде.
 * Используется для админ-панели мобильного приложения.
 */

import { supabase } from "@/shared/config/supabase";
import { logger } from "@/shared/utils/logger";
import { fetchJson } from "@/api/unifiedClient";
import { generateIdempotencyKey } from "@/shared/utils/idempotency";
import { z } from "zod";

// ============= API Configuration =============

const API_VERSION = "/api/v1";
const API_ORIGIN: string = import.meta.env.PROD
  ? String(import.meta.env.VITE_API_URL || "https://ocpp.voltera.kg")
  : "";

// ============= Types =============

export interface AdminDashboardStats {
  stations: {
    total: number;
    online: number;
    offline: number;
    error: number;
  };
  sessions: {
    active: number;
    today: number;
  };
  today: {
    energy_kwh: number;
    revenue_som: number;
  };
  period: {
    from: string;
    to: string;
  };
}

export interface AdminConnector {
  id: string;
  connector_number: number;
  connector_type: string | null;
  power_kw: number | null;
  status: string;
  error_code: string | null;
}

export interface AdminStation {
  id: string;
  serial_number: string | null;
  model: string | null;
  manufacturer: string | null;
  location_id: string | null;
  location_name: string | null;
  location_address: string | null;
  status: string;
  is_available: boolean;
  power_capacity: number | null;
  price_per_kwh: number | null;
  session_fee: number | null;
  currency: string;
  connectors_count: number;
  connectors: AdminConnector[];
  last_heartbeat_at: string | null;
  firmware_version?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminSession {
  id: string;
  station_id: string;
  station_name: string | null;
  location_name: string | null;
  location_address: string | null;
  client_id: string;
  client_email: string | null;
  client_phone: string | null;
  status: "started" | "stopped" | "error";
  energy_kwh: number;
  amount_som: number;
  duration_minutes: number | null;
  limit_type: string | null;
  limit_value: number | null;
  start_time: string | null;
  stop_time: string | null;
  created_at: string | null;
}

export interface StationUpdateRequest {
  status?: "active" | "inactive" | "maintenance";
  is_available?: boolean;
  price_per_kwh?: number;
  session_fee?: number;
}

export interface AdminClient {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  balance: number;
  status: "active" | "blocked";
  sessions_count: number;
  total_energy_kwh: number;
  total_spent_som: number;
  created_at: string | null;
  updated_at: string | null;
  anonymized: boolean;
  recent_sessions?: Array<{
    id: string;
    station_id: string;
    status: string;
    energy_kwh: number;
    amount_som: number;
    start_time: string | null;
    stop_time: string | null;
  }>;
}

export interface BalanceAdjustmentRequest {
  amount: number;
  reason: string;
}

export interface BalanceAdjustmentResponse {
  client_id: string;
  old_balance: number;
  new_balance: number;
  adjustment: number;
  reason: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ============= Zod Schemas =============

const zAdminConnector = z.object({
  id: z.string(),
  connector_number: z.number(),
  connector_type: z.string().nullable(),
  power_kw: z.number().nullable(),
  status: z.string(),
  error_code: z.string().nullable(),
});

const zAdminStation = z.object({
  id: z.string(),
  serial_number: z.string().nullable(),
  model: z.string().nullable(),
  manufacturer: z.string().nullable(),
  location_id: z.string().nullable(),
  location_name: z.string().nullable(),
  location_address: z.string().nullable(),
  status: z.string(),
  is_available: z.boolean(),
  power_capacity: z.number().nullable(),
  price_per_kwh: z.number().nullable(),
  session_fee: z.number().nullable(),
  currency: z.string(),
  connectors_count: z.number(),
  connectors: z.array(zAdminConnector),
  last_heartbeat_at: z.string().nullable(),
  firmware_version: z.string().nullable().optional(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

const zAdminSession = z.object({
  id: z.string(),
  station_id: z.string(),
  station_name: z.string().nullable(),
  location_name: z.string().nullable(),
  location_address: z.string().nullable(),
  client_id: z.string(),
  client_email: z.string().nullable(),
  client_phone: z.string().nullable(),
  status: z.enum(["started", "stopped", "error"]),
  energy_kwh: z.number(),
  amount_som: z.number(),
  duration_minutes: z.number().nullable(),
  limit_type: z.string().nullable(),
  limit_value: z.number().nullable(),
  start_time: z.string().nullable(),
  stop_time: z.string().nullable(),
  created_at: z.string().nullable(),
});

const zDashboardStats = z.object({
  stations: z.object({
    total: z.number(),
    online: z.number(),
    offline: z.number(),
    error: z.number(),
  }),
  sessions: z.object({
    active: z.number(),
    today: z.number(),
  }),
  today: z.object({
    energy_kwh: z.number(),
    revenue_som: z.number(),
  }),
  period: z.object({
    from: z.string(),
    to: z.string(),
  }),
});

const zStatsResponse = z.object({
  success: z.boolean(),
  data: zDashboardStats.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

const zStationsResponse = z.object({
  success: z.boolean(),
  data: z
    .object({
      stations: z.array(zAdminStation),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    })
    .optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

const zStationResponse = z.object({
  success: z.boolean(),
  data: zAdminStation.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

const zStationUpdateResponse = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z
    .object({
      id: z.string(),
      status: z.string(),
      is_available: z.boolean(),
      price_per_kwh: z.number().nullable(),
      session_fee: z.number().nullable(),
    })
    .optional(),
  error: z.string().optional(),
});

const zSessionsResponse = z.object({
  success: z.boolean(),
  data: z
    .object({
      sessions: z.array(zAdminSession),
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    })
    .optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

const zSessionResponse = z.object({
  success: z.boolean(),
  data: zAdminSession.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

const zAdminClient = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  balance: z.number(),
  status: z.enum(["active", "blocked"]),
  sessions_count: z.number(),
  total_energy_kwh: z.number(),
  total_spent_som: z.number(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  anonymized: z.boolean(),
  recent_sessions: z.array(z.object({
    id: z.string(),
    station_id: z.string(),
    status: z.string(),
    energy_kwh: z.number(),
    amount_som: z.number(),
    start_time: z.string().nullable(),
    stop_time: z.string().nullable(),
  })).optional(),
});

const zClientsResponse = z.object({
  success: z.boolean(),
  data: z.object({
    clients: z.array(zAdminClient),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  }).optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

const zClientResponse = z.object({
  success: z.boolean(),
  data: zAdminClient.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

const zBalanceAdjustmentResponse = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    client_id: z.string(),
    old_balance: z.number(),
    new_balance: z.number(),
    adjustment: z.number(),
    reason: z.string(),
  }).optional(),
  error: z.string().optional(),
});

const zStatusUpdateResponse = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    client_id: z.string(),
    old_status: z.string(),
    new_status: z.string(),
  }).optional(),
  error: z.string().optional(),
});

// ============= Service Class =============

class AdminApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_ORIGIN
      ? `${API_ORIGIN}${API_VERSION}`
      : `${API_VERSION}`;
  }

  /**
   * Базовый метод для API запросов с авторизацией
   */
  private async apiRequest<T>(
    endpoint: string,
    options: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown },
    schema: z.ZodType<T>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || "GET";

    logger.debug(`[AdminAPI] ${method} ${url}`);

    // Получаем JWT токен
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {};

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    } else {
      logger.error("[AdminAPI] No access token - user not authenticated");
      throw new Error("Authentication required");
    }

    // Idempotency для мутирующих запросов
    if (method === "POST" || method === "PUT" || method === "DELETE") {
      headers["Idempotency-Key"] = generateIdempotencyKey();
    }

    return await fetchJson<T>(
      url,
      { method, body: options.body, timeoutMs: 15000, retries: 1, headers },
      schema
    );
  }

  // ============= Dashboard Stats =============

  /**
   * Получить статистику для дашборда
   */
  async getStats(periodDays: number = 1): Promise<AdminDashboardStats> {
    const response = await this.apiRequest(
      `/admin/stats?period_days=${periodDays}`,
      { method: "GET" },
      zStatsResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get stats");
    }

    return response.data;
  }

  // ============= Stations Management =============

  /**
   * Получить список станций оператора
   */
  async getStations(params?: {
    status?: string;
    location_id?: string;
    is_online?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<AdminStation>> {
    const searchParams = new URLSearchParams();

    if (params?.status) searchParams.set("status", params.status);
    if (params?.location_id) searchParams.set("location_id", params.location_id);
    if (params?.is_online !== undefined)
      searchParams.set("is_online", String(params.is_online));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    const query = searchParams.toString();
    const endpoint = `/admin/stations${query ? `?${query}` : ""}`;

    const response = await this.apiRequest(
      endpoint,
      { method: "GET" },
      zStationsResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get stations");
    }

    return {
      data: response.data.stations,
      total: response.data.total,
      limit: response.data.limit,
      offset: response.data.offset,
    };
  }

  /**
   * Получить детали станции
   */
  async getStation(stationId: string): Promise<AdminStation> {
    const response = await this.apiRequest(
      `/admin/stations/${stationId}`,
      { method: "GET" },
      zStationResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Station not found");
    }

    return response.data;
  }

  /**
   * Обновить станцию
   */
  async updateStation(
    stationId: string,
    data: StationUpdateRequest
  ): Promise<{ id: string; status: string; is_available: boolean }> {
    const response = await this.apiRequest(
      `/admin/stations/${stationId}`,
      { method: "PUT", body: data },
      zStationUpdateResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to update station");
    }

    return response.data;
  }

  // ============= Sessions =============

  /**
   * Получить активные сессии
   */
  async getActiveSessions(params?: {
    station_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<AdminSession>> {
    const searchParams = new URLSearchParams();

    if (params?.station_id) searchParams.set("station_id", params.station_id);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    const query = searchParams.toString();
    const endpoint = `/admin/sessions${query ? `?${query}` : ""}`;

    const response = await this.apiRequest(
      endpoint,
      { method: "GET" },
      zSessionsResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get sessions");
    }

    return {
      data: response.data.sessions,
      total: response.data.total,
      limit: response.data.limit,
      offset: response.data.offset,
    };
  }

  /**
   * Получить историю сессий
   */
  async getSessionsHistory(params?: {
    station_id?: string;
    status?: "started" | "stopped" | "error";
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<AdminSession>> {
    const searchParams = new URLSearchParams();

    if (params?.station_id) searchParams.set("station_id", params.station_id);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.date_from) searchParams.set("date_from", params.date_from);
    if (params?.date_to) searchParams.set("date_to", params.date_to);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    const query = searchParams.toString();
    const endpoint = `/admin/sessions/history${query ? `?${query}` : ""}`;

    const response = await this.apiRequest(
      endpoint,
      { method: "GET" },
      zSessionsResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get sessions history");
    }

    return {
      data: response.data.sessions,
      total: response.data.total,
      limit: response.data.limit,
      offset: response.data.offset,
    };
  }

  /**
   * Получить детали сессии
   */
  async getSession(sessionId: string): Promise<AdminSession> {
    const response = await this.apiRequest(
      `/admin/sessions/${sessionId}`,
      { method: "GET" },
      zSessionResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Session not found");
    }

    return response.data;
  }

  // ============= Clients (Admin only) =============

  /**
   * Получить список клиентов
   */
  async getClients(params?: {
    search?: string;
    status?: "active" | "blocked";
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<AdminClient>> {
    const searchParams = new URLSearchParams();

    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    const query = searchParams.toString();
    const endpoint = `/admin/clients${query ? `?${query}` : ""}`;

    const response = await this.apiRequest(
      endpoint,
      { method: "GET" },
      zClientsResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to get clients");
    }

    return {
      data: response.data.clients,
      total: response.data.total,
      limit: response.data.limit,
      offset: response.data.offset,
    };
  }

  /**
   * Получить детали клиента
   */
  async getClient(clientId: string): Promise<AdminClient> {
    const response = await this.apiRequest(
      `/admin/clients/${clientId}`,
      { method: "GET" },
      zClientResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Client not found");
    }

    return response.data;
  }

  /**
   * Корректировать баланс клиента
   */
  async adjustClientBalance(
    clientId: string,
    data: BalanceAdjustmentRequest
  ): Promise<BalanceAdjustmentResponse> {
    const response = await this.apiRequest(
      `/admin/clients/${clientId}/balance`,
      { method: "PUT", body: data },
      zBalanceAdjustmentResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to adjust balance");
    }

    return response.data;
  }

  /**
   * Изменить статус клиента
   */
  async updateClientStatus(
    clientId: string,
    status: "active" | "blocked"
  ): Promise<{ old_status: string; new_status: string }> {
    const response = await this.apiRequest(
      `/admin/clients/${clientId}/status?status=${status}`,
      { method: "PUT" },
      zStatusUpdateResponse
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to update status");
    }

    return response.data;
  }
}

// Singleton instance
export const adminApi = new AdminApiService();
