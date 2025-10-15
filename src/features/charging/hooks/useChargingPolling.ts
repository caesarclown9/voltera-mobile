import { useEffect, useCallback, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationService } from "@/shared/utils/notifications";
import { logger } from "@/shared/utils/logger";
import { apiClient } from "@/services/evpowerApi";
import type { ChargingStatus } from "@/api/types";

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

export const useChargingPolling = (sessionId: string) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<ChargingSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Функция для получения статуса зарядки через HTTP API
  const fetchChargingStatus = useCallback(
    async (retryCount = 0): Promise<ChargingStatus | null> => {
      try {
        logger.info("Polling charging status for session:", sessionId);

        // Используем evpowerApi для получения статуса зарядки
        const status = await apiClient.getChargingStatus(sessionId);

        logger.info("Charging status received:", status);
        return status;
      } catch (error) {
        logger.error("Ошибка получения статуса зарядки:", error);

        // Retry логика
        if (retryCount < maxRetries) {
          logger.info(`Повтор запроса ${retryCount + 1}/${maxRetries}`);
          setTimeout(() => {
            fetchChargingStatus(retryCount + 1);
          }, 2000);
        } else {
          setConnectionStatus("error");
        }
        return null;
      }
    },
    [sessionId],
  );

  // Остановка polling
  const stopPolling = useCallback(() => {
    logger.info("Stopping charging status polling");
    isPollingRef.current = false;
    setConnectionStatus("disconnected");
    retryCountRef.current = 0;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Функция для обновления UI
  const updateChargingStatus = useCallback(
    (status: ChargingStatus | null) => {
      if (!status || !status.session) return;

      const apiSession = status.session;

      // Преобразуем данные из API в формат ChargingSession
      const sessionData: ChargingSession = {
        sessionId: apiSession.id || sessionId,
        stationId: apiSession.station_id || "",
        connectorId: String(apiSession.connector_id) || "",
        status:
          apiSession.status === "started"
            ? "charging"
            : apiSession.status === "stopped"
              ? "finished"
              : "faulted",
        energy: apiSession.energy_consumed || 0,
        duration: (apiSession.charging_duration_minutes || 0) * 60,
        cost: apiSession.current_cost || 0,
        power: 0, // Power не возвращается напрямую из API
        startTime: apiSession.start_time || new Date().toISOString(),
        endTime: apiSession.stop_time,
      };

      setSession(sessionData);

      // Обновляем cache для других компонентов
      queryClient.setQueryData(["charging-status", sessionId], status);

      // Отправляем уведомления при изменении статуса
      if (apiSession.status) {
        const currentStatus = sessionData.status;
        if (currentStatus === "charging" && session?.status !== "charging") {
          NotificationService.notifyChargingStarted(sessionData.stationId);
        } else if (currentStatus === "finished") {
          NotificationService.notifyChargingComplete(
            sessionData.stationId,
            sessionData.energy,
            sessionData.cost,
          );
        } else if (currentStatus === "faulted") {
          NotificationService.notifyChargingError(
            sessionData.stationId,
            "Ошибка зарядки",
          );
        }
      }

      logger.info("Статус зарядки обновлен:", sessionData);
    },
    [sessionId, session, queryClient],
  );

  // Функция polling
  const poll = useCallback(async () => {
    if (!isPollingRef.current) return;

    const status = await fetchChargingStatus();
    if (status && status.session) {
      updateChargingStatus(status);
      retryCountRef.current = 0; // Сбрасываем счетчик ошибок при успехе

      // Остановить polling если зарядка завершена
      if (
        status.session.status === "stopped" ||
        status.session.status === "error"
      ) {
        logger.info("Зарядка завершена, остановка мониторинга");
        stopPolling();
      }
    }
  }, [fetchChargingStatus, updateChargingStatus, stopPolling]);

  // Запуск polling
  const startPolling = useCallback(() => {
    if (isPollingRef.current || !sessionId) return;

    logger.info("Starting charging status polling for session:", sessionId);
    isPollingRef.current = true;
    setConnectionStatus("connecting");

    // Первый запрос сразу
    poll().then(() => {
      setConnectionStatus("connected");
    });

    // Затем каждые 5 секунд
    pollingIntervalRef.current = setInterval(poll, 5000);
  }, [sessionId, poll]);

  // Обновление статуса (для совместимости с предыдущим API)
  const updateChargingSession = useCallback(
    (newStatus: Partial<ChargingSession>) => {
      setSession((prevSession) => ({
        ...prevSession!,
        ...newStatus,
      }));
    },
    [],
  );

  // Заглушка для отправки сообщений (для совместимости)
  const sendMessage = useCallback((_message: unknown) => {
    logger.warn(
      "sendMessage called but HTTP polling does not support sending messages",
    );
  }, []);

  // Автоматический запуск polling при монтировании
  useEffect(() => {
    if (sessionId) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [sessionId, startPolling, stopPolling]);

  return {
    session,
    connectionStatus,
    updateChargingStatus: updateChargingSession,
    sendMessage,
    reconnect: startPolling,
    disconnect: stopPolling,
    isConnected: connectionStatus === "connected",
    reconnectAttempts: retryCountRef.current,
  };
};
