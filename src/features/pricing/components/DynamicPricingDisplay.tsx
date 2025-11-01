import { useEffect, useState, useCallback } from "react";
import { Clock, TrendingUp, TrendingDown, Info, Zap } from "lucide-react";
import { pricingService } from "../pricingService";
import { supabase } from "../../../shared/config/supabase";
import type { PricingResult } from "../types";
import { useAuthStore } from "../../auth/store";
import { safeParseInt } from "../../../shared/utils/parsers";
import { logger } from "../../../shared/utils/logger";

interface DynamicPricingDisplayProps {
  stationId: string;
  connectorType?: string;
  compact?: boolean;
}

export function DynamicPricingDisplay({
  stationId,
  connectorType,
  compact = false,
}: DynamicPricingDisplayProps) {
  const [currentPricing, setCurrentPricing] = useState<PricingResult | null>(
    null,
  );
  const [daySchedule, setDaySchedule] = useState<
    Array<{ time: string; label: string; rate: number }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextChangeIn, setNextChangeIn] = useState<string>("");
  const { user } = useAuthStore();

  const loadCurrentPricing = useCallback(async () => {
    try {
      setIsLoading(true);
      const pricing = await pricingService.calculatePricing(
        stationId,
        connectorType,
        user?.id,
      );
      setCurrentPricing(pricing);
    } catch (error) {
      logger.error("Error loading pricing:", error);
    } finally {
      setIsLoading(false);
    }
  }, [stationId, connectorType, user?.id]);

  const loadDaySchedule = useCallback(async () => {
    try {
      const schedule = await pricingService.getDayPricingSchedule(
        stationId,
        connectorType,
        user?.id,
      );
      setDaySchedule(schedule);
    } catch (error) {
      logger.error("Error loading day schedule:", error);
    }
  }, [stationId, connectorType, user?.id]);

  const updateNextChangeTimer = useCallback(() => {
    if (!currentPricing?.next_rate_change) {
      setNextChangeIn("");
      return;
    }

    const now = new Date();
    const next = new Date(currentPricing.next_rate_change);
    const diff = next.getTime() - now.getTime();

    if (diff <= 0) {
      loadCurrentPricing();
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      setNextChangeIn(`${hours}ч ${minutes}м`);
    } else if (minutes > 0) {
      setNextChangeIn(`${minutes}м ${seconds}с`);
    } else {
      setNextChangeIn(`${seconds}с`);
    }
  }, [currentPricing, loadCurrentPricing]);

  useEffect(() => {
    if (!stationId) return;

    // Загружаем текущий тариф
    loadCurrentPricing();

    // Загружаем расписание на день (только в полном режиме)
    if (!compact) {
      loadDaySchedule();
    }

    // Подписываемся на изменения тарифов в реальном времени
    const channel = supabase
      .channel(`pricing-${stationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tariff_rules",
        },
        () => {
          loadCurrentPricing();
          if (!compact) loadDaySchedule();
        },
      )
      .subscribe();

    // Обновляем каждую минуту
    const interval = setInterval(() => {
      loadCurrentPricing();
      updateNextChangeTimer();
    }, 60000);

    // Обновляем таймер каждую секунду
    const timerInterval = setInterval(updateNextChangeTimer, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timerInterval);
      channel.unsubscribe();
    };
  }, [
    stationId,
    connectorType,
    user?.id,
    compact,
    loadCurrentPricing,
    loadDaySchedule,
    updateNextChangeTimer,
  ]);

  // Определяем тренд цены
  const getPriceTrend = () => {
    if (!daySchedule.length || !currentPricing) return null;

    const currentHour = new Date().getHours();
    const nextSlot = daySchedule.find((s) => {
      const slotHour = safeParseInt(s.time.split(":")[0], 0);
      return slotHour > currentHour;
    });

    if (!nextSlot) return null;

    if (nextSlot.rate > currentPricing.rate_per_kwh) {
      return { type: "up", rate: nextSlot.rate, time: nextSlot.time };
    } else if (nextSlot.rate < currentPricing.rate_per_kwh) {
      return { type: "down", rate: nextSlot.rate, time: nextSlot.time };
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!currentPricing) {
    return null;
  }

  const trend = getPriceTrend();

  // Компактный режим для карточек станций
  if (compact) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-lg font-bold text-cyan-600">
            {currentPricing.rate_per_kwh} {currentPricing.currency}/кВт·ч
          </span>
        </div>
        {currentPricing.is_client_tariff && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            VIP
          </span>
        )}
      </div>
    );
  }

  // Полный режим для страницы зарядки
  return (
    <div className="space-y-4">
      {/* Текущий тариф */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              Текущий тариф
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-cyan-600">
                {currentPricing.rate_per_kwh}
              </span>
              <span className="text-lg text-gray-600">
                {currentPricing.currency}/кВт·ч
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {currentPricing.active_rule}
            </p>
          </div>

          {currentPricing.is_client_tariff && (
            <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
              ✨ Ваш специальный тариф
            </div>
          )}
        </div>

        {/* Дополнительные сборы */}
        {(currentPricing.session_fee > 0 ||
          currentPricing.rate_per_minute > 0) && (
          <div className="border-t border-cyan-100 pt-3 mt-3 space-y-1">
            {currentPricing.session_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Плата за сессию:</span>
                <span className="font-medium">
                  {currentPricing.session_fee} {currentPricing.currency}
                </span>
              </div>
            )}
            {currentPricing.rate_per_minute > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Поминутная тарификация:</span>
                <span className="font-medium">
                  {currentPricing.rate_per_minute} {currentPricing.currency}/мин
                </span>
              </div>
            )}
          </div>
        )}

        {/* Время до изменения тарифа */}
        {currentPricing.time_based && nextChangeIn && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-white/50 rounded-lg">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              Тариф изменится через: <strong>{nextChangeIn}</strong>
            </span>
          </div>
        )}

        {/* Тренд цены */}
        {trend && (
          <div
            className={`flex items-center gap-2 mt-3 p-2 rounded-lg ${
              trend.type === "up" ? "bg-orange-50" : "bg-green-50"
            }`}
          >
            {trend.type === "up" ? (
              <>
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-700">
                  Цена повысится до {trend.rate} {currentPricing.currency} в{" "}
                  {trend.time}
                </span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-700">
                  Цена снизится до {trend.rate} {currentPricing.currency} в{" "}
                  {trend.time}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Информация о динамических тарифах */}
      <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5" />
        <p className="text-sm text-blue-700">
          Тарифы могут изменяться в зависимости от времени суток и дня недели.
          Заряжайте в периоды низких цен для экономии!
        </p>
      </div>
    </div>
  );
}
