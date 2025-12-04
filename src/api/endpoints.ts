/**
 * API Endpoints - Unified endpoint definitions
 * All paths are relative to the API base URL
 * They include /api prefix as part of the path
 */
export const API_ENDPOINTS = {
  // Charging endpoints
  charging: {
    start: "/api/v1/charging/start",
    stop: "/api/v1/charging/stop",
    status: (sessionId: string) => `/api/v1/charging/status/${sessionId}`,
  },

  // Station endpoints
  station: {
    status: (stationId: string) => `/api/v1/station/status/${stationId}`,
    list: "/api/v1/stations", // If this doesn't exist, will use Supabase
  },

  // Location endpoints
  locations: {
    all: "/api/v1/locations",
    detail: (id: string) => `/api/v1/locations/${id}`,
    ws: "wss://ocpp.voltera.kg/api/v1/locations/ws/locations",
  },

  // Balance endpoints
  balance: {
    get: (clientId: string) => `/api/v1/balance/${clientId}`,
    topupQR: "/api/v1/balance/topup-qr",
    topupCard: "/api/v1/balance/topup-card",
  },

  // Payment endpoints
  payment: {
    h2hPayment: "/api/v1/payment/h2h-payment",
    tokenPayment: "/api/v1/payment/token-payment",
    createToken: "/api/v1/payment/create-token",
    status: (invoiceId: string) => `/api/v1/payment/status/${invoiceId}`,
    statusCheck: (invoiceId: string) =>
      `/api/v1/payment/status-check/${invoiceId}`,
    cancel: (invoiceId: string) => `/api/v1/payment/cancel/${invoiceId}`,
    webhook: "/api/v1/payment/webhook",
  },

  // Profile endpoint (auth is handled by Supabase directly)
  profile: {
    get: "/api/v1/profile",
  },

  // Device registration for push notifications
  devices: {
    register: "/api/v1/devices/register",
    unregister: "/api/v1/devices/unregister",
  },
} as const;
