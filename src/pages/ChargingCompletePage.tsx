import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  Battery,
  Zap,
  Clock,
  DollarSign,
  ChevronLeft,
  Home,
  Receipt,
} from "lucide-react";
import { motion } from "framer-motion";
import { evpowerApi } from "../services/evpowerApi";
import { useAuthStatus } from "@/features/auth/hooks/useAuth";

interface ChargingCompleteData {
  sessionId: string;
  evBatterySoc?: number;
  energyDelivered: number;
  duration: number;
  totalCost: number;
  stationId: string;
  startTime?: string;
  endTime?: string;
}

export const ChargingCompletePage = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { isAuthenticated } = useAuthStatus();
  const [sessionData, setSessionData] = useState<ChargingCompleteData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      navigate("/stations");
      return;
    }

    const fetchSessionData = async () => {
      try {
        // Сначала проверяем сохраненные данные из sessionStorage
        const savedData = sessionStorage.getItem("lastChargingData");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          setSessionData({
            sessionId: sessionId,
            evBatterySoc: parsed.evBatterySoc,
            energyDelivered: parsed.energyConsumedKwh || 0,
            duration: parsed.duration || 0,
            totalCost: parsed.currentAmount || 0,
            stationId: parsed.stationId || "",
            startTime: parsed.startTime,
            endTime: parsed.endTime,
          });
          sessionStorage.removeItem("lastChargingData");
        } else {
          // Если нет сохраненных данных, получаем с сервера
          const response = await evpowerApi.getChargingStatus(sessionId);

          if (response.success && response.session) {
            setSessionData({
              sessionId: sessionId,
              evBatterySoc: undefined, // Not available in API response
              energyDelivered: response.session.energy_consumed || 0,
              duration: (response.session.charging_duration_minutes ?? 0) * 60,
              totalCost: response.session.current_cost || 0,
              stationId: response.session.station_id || "",
              startTime: response.session.start_time,
              endTime: response.session.stop_time,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
        // Используем mock данные если не удалось получить с сервера
        setSessionData({
          sessionId: sessionId,
          energyDelivered: 0,
          duration: 0,
          totalCost: 0,
          stationId: "Неизвестно",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();

    // Очищаем активную сессию из localStorage
    localStorage.removeItem("activeChargingSession");
  }, [sessionId, navigate]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} ч ${minutes} мин`;
    }
    return `${minutes} мин`;
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Данные сессии не найдены</p>
          <button
            onClick={() => navigate("/stations")}
            className="mt-4 px-6 py-2 bg-primary-500 text-white rounded-lg"
          >
            К станциям
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-success-50 to-white pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky-header-safe z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(`/station/${sessionData?.stationId || ""}`)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Зарядка завершена</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Animated Success Icon */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.1,
          }}
        >
          <motion.div
            className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center"
            animate={{
              boxShadow: [
                "0 0 0 0 rgba(34, 197, 94, 0)",
                "0 0 0 20px rgba(34, 197, 94, 0.2)",
                "0 0 0 0 rgba(34, 197, 94, 0)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: 2,
              ease: "easeOut",
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 12,
                delay: 0.3,
              }}
            >
              <CheckCircle className="w-16 h-16 text-green-600" />
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.h2
          className="text-2xl font-bold text-center mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Зарядка успешно завершена!
        </motion.h2>
        <motion.p
          className="text-gray-600 text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          Спасибо за использование Voltera
        </motion.p>

        {/* Session Details Card */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 200, damping: 20 }}
        >
          <h3 className="font-semibold text-lg mb-4">Детали сессии</h3>

          {/* Battery Level - if available */}
          {sessionData.evBatterySoc !== undefined && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Battery className="w-5 h-5 text-green-500" />
                <span className="text-gray-600">Заряд электромобиля</span>
              </div>
              <span className="font-semibold text-lg">
                {Math.round(sessionData.evBatterySoc)}%
              </span>
            </div>
          )}

          {/* Energy Delivered */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-gray-600">Отдано энергии</span>
            </div>
            <span className="font-semibold text-lg">
              {sessionData.energyDelivered.toFixed(2)} кВт·ч
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-gray-600">Время зарядки</span>
            </div>
            <span className="font-semibold text-lg">
              {formatTime(sessionData.duration)}
            </span>
          </div>

          {/* Total Cost - highlighted */}
          <div className="flex items-center justify-between py-3 bg-primary-50 -mx-6 px-6 mt-3 rounded-xl">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-primary-600" />
              <span className="text-gray-700 font-medium">Итоговая сумма</span>
            </div>
            <span className="font-bold text-2xl text-primary-600">
              {sessionData.totalCost.toFixed(2)} KGS
            </span>
          </div>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          className="bg-gray-50 rounded-xl p-4 mb-6 text-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
        >
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Станция:</span>
            <span className="font-medium">{sessionData.stationId}</span>
          </div>
          {sessionData.startTime && (
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Начало:</span>
              <span className="font-medium">
                {formatDateTime(sessionData.startTime)}
              </span>
            </div>
          )}
          {sessionData.endTime && (
            <div className="flex justify-between">
              <span className="text-gray-600">Окончание:</span>
              <span className="font-medium">
                {formatDateTime(sessionData.endTime)}
              </span>
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <motion.button
            onClick={() =>
              navigate("/history" + (!isAuthenticated ? "?auth=required" : ""))
            }
            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold
                     hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            whileTap={{ scale: 0.95 }}
          >
            <Receipt className="w-5 h-5" />
            История
          </motion.button>

          <motion.button
            onClick={() => navigate("/stations")}
            className="flex-1 bg-primary-500 text-white py-3 rounded-xl font-semibold
                     hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
            whileTap={{ scale: 0.95 }}
          >
            <Home className="w-5 h-5" />К станциям
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};
