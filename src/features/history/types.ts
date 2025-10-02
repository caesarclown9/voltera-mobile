export interface ChargingHistoryItem {
  id: string;
  sessionId: string;
  stationId: string;
  stationName: string;
  stationAddress: string;
  connectorId: number;
  connectorType: string;
  startTime: string;
  endTime: string;
  duration: number; // в секундах
  energyConsumed: number; // кВт·ч
  totalCost: number; // сом
  averagePower: number; // кВт
  maxPower: number; // кВт
  status: 'completed' | 'stopped' | 'failed';
  limitType?: 'energy' | 'amount' | 'none';
  limitValue?: number;
  meterStart?: number;
  meterStop?: number;
  stopReason?: string;
  errorCode?: string;
}

export interface TransactionHistoryItem {
  id: string;
  type: 'topup' | 'charge' | 'refund';
  amount: number;
  balance_before: number;
  balance_after: number;
  timestamp: string;
  description: string;
  status: 'success' | 'pending' | 'failed';
  paymentMethod?: 'qr_odengi' | 'card_obank' | 'token' | 'admin';
  sessionId?: string; // для связи с зарядной сессией
}

export interface UsageStatistics {
  totalSessions: number;
  totalEnergy: number; // кВт·ч
  totalCost: number; // сом
  totalDuration: number; // минуты
  averageSessionEnergy: number;
  averageSessionCost: number;
  averageSessionDuration: number;
  favoriteStation?: {
    id: string;
    name: string;
    visitsCount: number;
  };
  monthlyData: Array<{
    month: string;
    sessions: number;
    energy: number;
    cost: number;
  }>;
}