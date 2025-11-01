import { useEffect, useState, useRef, useCallback } from "react";
import { evpowerApi } from "@/services/evpowerApi";
import { logger } from "@/shared/utils/logger";

// Состояния процесса зарядки (соответствуют статусам БД)
export const ChargingStates = {
  STARTED: "started", // Зарядка активна
  STOPPED: "stopped", // Зарядка остановлена
  ERROR: "error", // Ошибка зарядки
  // Дополнительные статусы для UI (не из БД)
  PREPARING: "preparing", // Подготовка (после RemoteStart)
  CHARGING: "charging", // Идет зарядка (алиас для started)
  SUSPENDED: "suspended", // Приостановлена
  FINISHING: "finishing", // Завершение
  COMPLETED: "completed", // Завершена (алиас для stopped)
} as const;

export type ChargingStatus =
  (typeof ChargingStates)[keyof typeof ChargingStates];

export interface ChargingData {
  sessionId: string;
  status: ChargingStatus;
  stationId: string;
  ocppTransactionId?: number;

  // Данные из MeterValues
  meterCurrent: number; // Wh - текущее значение счетчика
  meterStart: number; // Wh - начальное значение
  energyConsumedKwh: number; // кВт·ч - потребленная энергия

  // Расчетные данные
  currentAmount: number; // сом - текущая стоимость
  chargingPower?: number; // кВт - мощность зарядки
  duration: number; // секунды - длительность

  // Прогресс (если есть лимит)
  progressPercent?: number; // % - для лимитированной зарядки
  limitValue?: number; // кВт·ч или сом - установленный лимит
  limitType?: "energy" | "amount" | "none";

  // Данные электромобиля
  evBatterySoc?: number; // % - уровень заряда батареи EV (если доступно)

  // Статус станции
  stationOnline: boolean;
}

interface UseChargingStatusPollingOptions {
  pollInterval?: number;
  onStatusChange?: (status: ChargingStatus) => void;
  onError?: (error: Error) => void;
  onComplete?: (data: ChargingData) => void;
  initialStationId?: string; // Добавляем для передачи stationId из ChargingPage
}

const POLL_INTERVAL = 15000; // 15 секунд - для предотвращения rate limiting

export const useChargingStatusPolling = (
  sessionId: string | null,
  options: UseChargingStatusPollingOptions = {},
) => {
  const {
    pollInterval = POLL_INTERVAL,
    onStatusChange,
    onError,
    onComplete,
    initialStationId = "EVI-0011",
  } = options;

  const [chargingData, setChargingData] = useState<ChargingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<ChargingStatus | null>(null);
  const lastValidDataRef = useRef<ChargingData | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Сохраняем callbacks в ref чтобы избежать пересоздания эффекта
  const callbacksRef = useRef({ onStatusChange, onError, onComplete });
  useEffect(() => {
    callbacksRef.current = { onStatusChange, onError, onComplete };
  }, [onStatusChange, onError, onComplete]);

  // Основной эффект для polling
  useEffect(() => {
    if (!sessionId) return;

    // Сохраняем sessionId в localStorage для восстановления
    localStorage.setItem("activeChargingSession", sessionId);

    // Сбрасываем время старта для новой сессии
    sessionStartTimeRef.current = Date.now();

    // Создаем стабильную функцию для интервала
    const pollFunction = async () => {
      try {
        const response = await evpowerApi.getChargingStatus(sessionId);

        if (response.success && response.session) {
          const newData: ChargingData = {
            sessionId: response.session.id || sessionId,
            status: response.session.status || "preparing",
            stationId: response.session.station_id || "",
            ocppTransactionId: response.session.ocpp_transaction_id,

            // Данные из последнего MeterValues с защитой от null
            meterCurrent: response.session.meter_current || 0,
            meterStart: response.session.meter_start || 0,
            energyConsumedKwh: response.session.energy_consumed || 0,

            // Расчетные данные
            currentAmount: response.session.current_cost || 0,
            chargingPower: undefined, // API не возвращает charging_power, можно рассчитать из energy/time
            duration: (response.session.charging_duration_minutes || 0) * 60, // Конвертируем в секунды

            // Прогресс
            progressPercent: response.session.limit_percentage,
            limitValue: response.session.limit_value,
            limitType: response.session.limit_type,

            // Данные электромобиля
            evBatterySoc: undefined, // API не возвращает SOC батареи EV

            // Статус станции
            stationOnline: true, // Предполагаем что онлайн если получили ответ
          };

          // Сохраняем как последние валидные данные
          lastValidDataRef.current = newData;
          setChargingData(newData);
          setError(null);

          // Проверяем изменение статуса
          if (lastStatusRef.current !== newData.status) {
            lastStatusRef.current = newData.status;
            callbacksRef.current.onStatusChange?.(newData.status);

            // Если зарядка завершена
            if (
              newData.status === ChargingStates.COMPLETED ||
              newData.status === ChargingStates.STOPPED
            ) {
              callbacksRef.current.onComplete?.(newData);
              // Останавливаем polling
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }
          }
        } else {
          // Backend вернул success: false
          throw new Error("Failed to get charging status");
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        const timeSinceStart = Date.now() - sessionStartTimeRef.current;
        const isInitialPeriod = timeSinceStart < 10000; // Первые 10 секунд

        // Если это 500 ошибка в первые 10 секунд - это нормально (OCPP еще не связан)
        const isAxiosError =
          err && typeof err === "object" && "response" in err;
        const responseStatus = isAxiosError
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
        if (responseStatus === 500 && isInitialPeriod) {
          logger.debug("Ожидание связывания OCPP транзакции с сессией...");

          // Показываем состояние "Подготовка" без ошибки
          if (!lastValidDataRef.current) {
            setChargingData({
              sessionId: sessionId,
              status: ChargingStates.PREPARING,
              stationId: initialStationId,
              ocppTransactionId: undefined,
              meterCurrent: 0,
              meterStart: 0,
              energyConsumedKwh: 0,
              currentAmount: 0,
              chargingPower: 0,
              duration: 0,
              stationOnline: true,
            });
          }
          setError(null); // Не показываем ошибку пользователю
        } else {
          // Для других ошибок или после 10 секунд - обычная обработка
          logger.error("Charging status fetch error:", error);
          setError(error);
          // Не вызываем onError callback для предотвращения лишних логов
          // callbacksRef.current.onError?.(error);

          // При ошибке используем последние валидные данные
          if (lastValidDataRef.current) {
            setChargingData({
              ...lastValidDataRef.current,
              stationOnline: false,
            });
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Показываем начальное состояние "Подготовка" сразу
    setChargingData({
      sessionId: sessionId,
      status: ChargingStates.PREPARING,
      stationId: initialStationId,
      ocppTransactionId: undefined,
      meterCurrent: 0,
      meterStart: 0,
      energyConsumedKwh: 0,
      currentAmount: 0,
      chargingPower: 0,
      duration: 0,
      stationOnline: true,
    });
    setIsLoading(false);

    // Первый запрос с задержкой 2 секунды (даем время backend связать OCPP)
    const timeoutId = setTimeout(() => {
      pollFunction();

      // Запускаем polling после первого запроса
      intervalRef.current = setInterval(pollFunction, pollInterval);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionId, pollInterval, initialStationId]);

  // Очистка localStorage при завершении
  useEffect(() => {
    if (
      chargingData?.status === ChargingStates.COMPLETED ||
      chargingData?.status === ChargingStates.STOPPED
    ) {
      localStorage.removeItem("activeChargingSession");
    }
  }, [chargingData?.status]);

  // Ручная остановка polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Ручной запрос статуса
  const refetch = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await evpowerApi.getChargingStatus(sessionId);

      if (response.success && response.session) {
        const newData: ChargingData = {
          sessionId: response.session.id || sessionId,
          status: response.session.status || "preparing",
          stationId: response.session.station_id || "",
          ocppTransactionId: response.session.ocpp_transaction_id,

          // Данные из последнего MeterValues с защитой от null
          meterCurrent: response.session.meter_current || 0,
          meterStart: response.session.meter_start || 0,
          energyConsumedKwh: response.session.energy_consumed || 0,

          // Расчетные данные
          currentAmount: response.session.current_cost || 0,
          chargingPower: undefined, // API не возвращает charging_power
          duration: (response.session.charging_duration_minutes || 0) * 60, // Конвертируем в секунды

          // Прогресс
          progressPercent: response.session.limit_percentage,
          limitValue: response.session.limit_value,
          limitType: response.session.limit_type,

          // Данные электромобиля
          evBatterySoc: undefined, // API не возвращает SOC батареи EV

          // Статус станции
          stationOnline: true, // Предполагаем что онлайн если получили ответ
        };

        // Сохраняем как последние валидные данные
        lastValidDataRef.current = newData;
        setChargingData(newData);
        setError(null);

        // Проверяем изменение статуса
        if (lastStatusRef.current !== newData.status) {
          lastStatusRef.current = newData.status;
          callbacksRef.current.onStatusChange?.(newData.status);

          // Если зарядка завершена
          if (
            newData.status === ChargingStates.COMPLETED ||
            newData.status === ChargingStates.STOPPED
          ) {
            callbacksRef.current.onComplete?.(newData);
            // Останавливаем polling
            stopPolling();
          }
        }
      } else {
        // Backend вернул success: false
        throw new Error("Failed to get charging status");
      }
    } catch (err) {
      const error = err as Error;
      logger.error("Charging status fetch error:", error);
      setError(error);
      callbacksRef.current.onError?.(error);

      // При ошибке используем последние валидные данные
      if (lastValidDataRef.current) {
        setChargingData({
          ...lastValidDataRef.current,
          stationOnline: false,
        });
      }
    }
  }, [sessionId, stopPolling]);

  return {
    chargingData,
    isLoading,
    error,
    refetch,
    stopPolling,
    isPolling: intervalRef.current !== null,
  };
};

// Хук для восстановления сессии из localStorage
export const useRestoreChargingSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const savedSessionId = localStorage.getItem("activeChargingSession");
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  const clearSession = () => {
    localStorage.removeItem("activeChargingSession");
    setSessionId(null);
  };

  return { sessionId, clearSession };
};
