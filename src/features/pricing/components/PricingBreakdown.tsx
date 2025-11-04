import { useMemo } from "react";
import { Calculator, Zap, Clock, CreditCard, TrendingDown } from "lucide-react";
import { pricingService } from "../pricingService";
import type { PricingResult } from "../types";

interface PricingBreakdownProps {
  energyKwh: number;
  durationMinutes: number;
  pricing: PricingResult | null;
  compact?: boolean;
}

export function PricingBreakdown({
  energyKwh,
  durationMinutes,
  pricing,
  compact = false,
}: PricingBreakdownProps) {
  const breakdown = useMemo(() => {
    if (!pricing) return null;

    return pricingService.calculateSessionCost(
      energyKwh,
      durationMinutes,
      pricing,
    );
  }, [energyKwh, durationMinutes, pricing]);

  if (!breakdown || !pricing) {
    return null;
  }

  // Компактный режим для процесса зарядки
  if (compact) {
    return (
      <div className="bg-white rounded-lg p-3 space-y-2">
        {breakdown.energy_cost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {energyKwh.toFixed(2)} кВт·ч
            </span>
            <span className="font-medium">
              {breakdown.energy_cost.toFixed(2)} {breakdown.currency}
            </span>
          </div>
        )}

        {breakdown.time_cost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {durationMinutes} мин
            </span>
            <span className="font-medium">
              {breakdown.time_cost.toFixed(2)} {breakdown.currency}
            </span>
          </div>
        )}

        <div className="border-t pt-2">
          <div className="flex justify-between">
            <span className="font-medium">Итого:</span>
            <span className="font-bold text-lg text-primary-600">
              {breakdown.final_amount.toFixed(2)} {breakdown.currency}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Полный режим с детализацией
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Расчет стоимости
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {/* Стоимость энергии */}
        {breakdown.energy_cost > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Электроэнергия
                </p>
                <p className="text-xs text-gray-500">
                  {energyKwh.toFixed(2)} кВт·ч × {pricing.rate_per_kwh}{" "}
                  {pricing.currency}
                </p>
              </div>
            </div>
            <span className="font-semibold text-gray-900">
              {breakdown.energy_cost.toFixed(2)} {breakdown.currency}
            </span>
          </div>
        )}

        {/* Стоимость времени */}
        {breakdown.time_cost > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Время зарядки
                </p>
                <p className="text-xs text-gray-500">
                  {durationMinutes} мин × {pricing.rate_per_minute}{" "}
                  {pricing.currency}
                </p>
              </div>
            </div>
            <span className="font-semibold text-gray-900">
              {breakdown.time_cost.toFixed(2)} {breakdown.currency}
            </span>
          </div>
        )}

        {/* Фиксированная плата */}
        {breakdown.session_fee > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Плата за сессию
                </p>
                <p className="text-xs text-gray-500">Фиксированная плата</p>
              </div>
            </div>
            <span className="font-semibold text-gray-900">
              {breakdown.session_fee.toFixed(2)} {breakdown.currency}
            </span>
          </div>
        )}

        {/* Парковочная плата */}
        {breakdown.parking_fee > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Плата за парковку
                </p>
                <p className="text-xs text-gray-500">
                  {durationMinutes} мин × {pricing.parking_fee_per_minute}{" "}
                  {pricing.currency}
                </p>
              </div>
            </div>
            <span className="font-semibold text-gray-900">
              {breakdown.parking_fee.toFixed(2)} {breakdown.currency}
            </span>
          </div>
        )}

        {/* Скидка (если есть) */}
        {breakdown.discount_amount > 0 && (
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Скидка</p>
                <p className="text-xs text-gray-500">
                  {pricing.is_client_tariff
                    ? "Персональный тариф"
                    : "Промо-код"}
                </p>
              </div>
            </div>
            <span className="font-semibold text-green-600">
              -{breakdown.discount_amount.toFixed(2)} {breakdown.currency}
            </span>
          </div>
        )}

        {/* Итоговая сумма */}
        <div className="border-t pt-3 mt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-gray-700">
                Итого к оплате
              </p>
              {pricing.is_client_tariff && (
                <p className="text-xs text-purple-600 mt-1">
                  ✨ Специальный тариф
                </p>
              )}
            </div>
            <div className="text-right">
              {breakdown.discount_amount > 0 && (
                <p className="text-sm text-gray-500 line-through">
                  {breakdown.base_amount.toFixed(2)} {breakdown.currency}
                </p>
              )}
              <p className="text-2xl font-bold text-primary-600">
                {breakdown.final_amount.toFixed(2)} {breakdown.currency}
              </p>
            </div>
          </div>
        </div>

        {/* Информация о тарифе */}
        {pricing.active_rule && (
          <div className="bg-blue-50 rounded-lg p-3 mt-3">
            <p className="text-xs text-blue-700">
              <strong>Применен тариф:</strong> {pricing.active_rule}
            </p>
            {pricing.time_based && (
              <p className="text-xs text-blue-600 mt-1">
                ⏰ Тариф изменяется по времени суток
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
