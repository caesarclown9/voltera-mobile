import { useChargingPolling } from "../hooks/useChargingPolling";
import { useCharging } from "../hooks/useCharging";

interface ChargingSession {
  sessionId: string;
  stationId: string;
  connectorId: string;
  status:
    | "preparing"
    | "charging"
    | "suspended"
    | "finishing"
    | "finished"
    | "faulted";
  energy: number; // kWh
  duration: number; // seconds
  cost: number; // som
  power: number; // kW
  startTime: string;
  endTime?: string;
}

interface ChargingStatusProps {
  sessionId: string;
  onSessionEnd?: () => void;
}

export function ChargingStatus({
  sessionId,
  onSessionEnd,
}: ChargingStatusProps) {
  const { session } = useChargingPolling(sessionId);
  const { stopCharging, isStoppingCharging } = useCharging();

  const handleStopCharging = async () => {
    try {
      const result = await stopCharging(sessionId);
      if (result.success) {
        onSessionEnd?.();
      }
    } catch (error) {
      console.error("Error stopping charging:", error);
    }
  };

  const getStatusText = (status: ChargingSession["status"]) => {
    switch (status) {
      case "preparing":
        return "Подготовка к зарядке";
      case "charging":
        return "Идет зарядка";
      case "suspended":
        return "Зарядка приостановлена";
      case "finishing":
        return "Завершение зарядки";
      case "finished":
        return "Зарядка завершена";
      case "faulted":
        return "Ошибка зарядки";
      default:
        return "Неизвестный статус";
    }
  };

  const getStatusColor = (status: ChargingSession["status"]) => {
    switch (status) {
      case "preparing":
        return "text-yellow-600 bg-yellow-50";
      case "charging":
        return "text-green-600 bg-green-50";
      case "suspended":
        return "text-orange-600 bg-orange-50";
      case "finishing":
        return "text-blue-600 bg-blue-50";
      case "finished":
        return "text-gray-600 bg-gray-50";
      case "faulted":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}ч ${minutes}м ${secs}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${secs}с`;
    } else {
      return `${secs}с`;
    }
  };

  if (!session) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Статус зарядки</h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}
        >
          {getStatusText(session.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Энергия</div>
          <div className="text-2xl font-bold text-gray-900">
            {session.energy.toFixed(2)}{" "}
            <span className="text-lg font-normal">кВт⋅ч</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Мощность</div>
          <div className="text-2xl font-bold text-gray-900">
            {session.power.toFixed(1)}{" "}
            <span className="text-lg font-normal">кВт</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Время</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatDuration(session.duration)}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Стоимость</div>
          <div className="text-2xl font-bold text-green-600">
            {session.cost.toFixed(2)}{" "}
            <span className="text-lg font-normal">сом</span>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Станция: {session.stationId}</span>
          <span>Разъем: {session.connectorId}</span>
        </div>
        <div className="text-sm text-gray-600">
          Начало: {new Date(session.startTime).toLocaleString("ru-RU")}
        </div>
      </div>

      {(session.status === "charging" || session.status === "suspended") && (
        <button
          onClick={handleStopCharging}
          disabled={isStoppingCharging}
          className="w-full mt-6 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center"
        >
          {isStoppingCharging ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Останавливаем...
            </>
          ) : (
            "Остановить зарядку"
          )}
        </button>
      )}
    </div>
  );
}
