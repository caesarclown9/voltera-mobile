import { evpowerApi } from "@/services/evpowerApi";

export const chargingService = {
  async startCharging(params: {
    stationId: string;
    connectorId: number;
    amount_som?: number;
    energy_kwh?: number;
  }) {
    return evpowerApi.startCharging(params.stationId, params.connectorId, {
      amount_som: params.amount_som ?? undefined,
      energy_kwh: params.energy_kwh ?? undefined,
    });
  },
  async stopCharging(sessionId: string) {
    return evpowerApi.stopCharging(sessionId);
  },
  async getActiveSession(sessionId: string) {
    const status = await evpowerApi.getChargingStatus(sessionId);
    if (!status.success || !status.session) return null;
    const s = status.session;
    return {
      id: s.id,
      stationId: s.station_id,
      status: s.status,
      currentPower:
        s.meter_current && s.meter_start
          ? Math.max(0, s.meter_current - s.meter_start)
          : 0,
      energyDelivered: s.energy_consumed,
      duration: (s.charging_duration_minutes ?? 0) * 60,
      cost: s.current_cost,
    };
  },
};
