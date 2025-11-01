import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, Heart, CreditCard, Zap } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useStationStatus,
  useLocationUpdates,
} from "@/features/locations/hooks/useLocations";
import { useCharging } from "../features/charging/hooks/useCharging";
import { useBalance } from "../features/balance/hooks/useBalance";
import { SimpleTopup } from "../features/balance/components/SimpleTopup";
import { DynamicPricingDisplay } from "../features/pricing/components/DynamicPricingDisplay";
import { type ChargingLimits } from "../features/charging/components/ChargingLimitsSelector";
import { pricingService } from "../features/pricing/pricingService";
import { useAuthStatus } from "@/features/auth/hooks/useAuth";
import { useFavorites } from "@/features/favorites/hooks/useFavorites";
import { handleApiError } from "@/services/evpowerApi";
import { logger } from "@/shared/utils/logger";

export const ChargingPage = () => {
  const navigate = useNavigate();
  const { stationId } = useParams();
  const [showTopup, setShowTopup] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(
    null,
  );
  const [chargingError, setChargingError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [connectorPrices, setConnectorPrices] = useState<
    Record<string, number>
  >({});
  const [chargingLimits, setChargingLimits] = useState<ChargingLimits>({
    type: "amount",
    amount_som: 100,
  });

  const { user } = useAuthStatus();
  const { data: balance } = useBalance();
  const { startCharging } = useCharging();
  const { toggleFavorite: toggleFavoriteApi, isFavorite } = useFavorites();
  const chargingLoading = false;

  // Загружаем статус станции через новый API
  const { data: stationStatus, isLoading } = useStationStatus(stationId || "");

  // Подключаемся к real-time обновлениям для этой станции
  useLocationUpdates(stationId ? [`station:${stationId}`] : []);

  // Конвертируем stationStatus в формат для UI (мемоизируем для избежания лишних ререндеров)
  const station = useMemo(() => {
    if (!stationStatus) return null;

    return {
      id: stationStatus.serial_number,
      name: stationStatus.location_name,
      address: stationStatus.location_address,
      lat: 0,
      lng: 0,
      status: stationStatus.available_for_charging ? "available" : "offline",
      connectors: stationStatus.connectors.map((connector) => ({
        id: connector.id.toString(),
        type: connector.type,
        power: connector.power_kw,
        status: connector.available ? "available" : "occupied",
        price_per_kwh: stationStatus.tariff_rub_kwh,
      })),
      power: Math.max(
        0,
        ...stationStatus.connectors.map((c) => c.power_kw ?? 0),
      ),
      price: stationStatus.tariff_rub_kwh,
      is_available: stationStatus.available_for_charging,
      location_id: stationStatus.location_id,
    };
  }, [stationStatus]);

  const loading = isLoading;

  // Автоматически выбираем первый доступный коннектор
  useEffect(() => {
    if (station && station.connectors.length > 0 && !selectedConnector) {
      const availableConnector = station.connectors.find(
        (c) => c.status === "available",
      );
      if (availableConnector) {
        setSelectedConnector(availableConnector.id);
      } else {
        setSelectedConnector(station.connectors[0]?.id || "1");
      }
    }
  }, [station, selectedConnector]);

  // Загружаем цены для всех коннекторов при загрузке станции
  useEffect(() => {
    const loadPrices = async () => {
      if (!stationId || !stationStatus) return;

      try {
        const prices: Record<string, number> = {};

        // Загружаем цены для каждого коннектора
        for (const connector of stationStatus.connectors) {
          const pricing = await pricingService.calculatePricing(
            stationId,
            connector.type,
          );
          prices[connector.id.toString()] = pricing.rate_per_kwh;
        }

        setConnectorPrices(prices);

        // Устанавливаем текущую цену для выбранного коннектора
        if (selectedConnector && prices[selectedConnector]) {
          setCurrentPrice(prices[selectedConnector]);
        }
      } catch (error) {
        logger.error("[ChargingPage] Error loading prices:", error);
      }
    };

    loadPrices();
  }, [stationId, stationStatus, selectedConnector]); // Added selectedConnector as dependency

  // Обновляем текущую цену при изменении выбранного коннектора
  useEffect(() => {
    if (selectedConnector && connectorPrices[selectedConnector]) {
      setCurrentPrice(connectorPrices[selectedConnector]);
    }
  }, [selectedConnector, connectorPrices]);

  const handleStartCharging = async () => {
    if (!selectedConnector || !station) return;

    setChargingError(null);

    // В dev режиме без настроенного API показываем предупреждение
    if (import.meta.env.DEV && !import.meta.env["VITE_API_BASE_URL"]) {
      setChargingError(
        "Запуск зарядки недоступен в режиме разработки. Настройте VITE_API_BASE_URL для тестирования.",
      );
      return;
    }

    try {
      // Проверяем баланс для лимитированной зарядки
      if (
        chargingLimits.type !== "none" &&
        balance &&
        balance.balance !== null
      ) {
        const requiredBalance = chargingLimits.estimatedCost || 0;
        if (balance.balance < requiredBalance) {
          setChargingError("Недостаточно средств на балансе");
          return;
        }
      }

      interface ChargingParams {
        stationId: string;
        connectorId: string;
        amount_som?: number;
        energy_kwh?: number;
      }

      const chargingParams: ChargingParams = {
        stationId: station.id,
        connectorId: selectedConnector.split("-").pop() || "1",
      };

      // Добавляем лимиты в зависимости от типа
      if (chargingLimits.type === "amount") {
        chargingParams.amount_som = chargingLimits.amount_som;
      } else if (chargingLimits.type === "energy") {
        chargingParams.energy_kwh = chargingLimits.energy_kwh;
      }
      // Для типа 'none' (полный бак) не передаём лимиты

      const result = await startCharging(chargingParams);

      if (result && result.success) {
        navigate(`/charging-process/${result.sessionId}`, {
          state: {
            stationId: station.id,
            chargingLimits: chargingLimits,
          },
        });
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setChargingError(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загружаем станцию...</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Станция не найдена</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-6 py-2 bg-cyan-500 text-white rounded-lg"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 overflow-y-auto max-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm sticky-header-safe z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full bg-yellow-400 hover:bg-yellow-500"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold">Зарядка</h1>
          <div className="text-right">
            <div className="text-sm">
              <p className="font-semibold">
                {(balance?.balance ?? 0).toFixed(2)} KGS
              </p>
              <p className="text-xs text-gray-500">Баланс</p>
            </div>
          </div>
        </div>
      </div>

      {/* Station Info */}
      <div className="bg-white mt-1 px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <h2 className="font-semibold text-lg">{station.name}</h2>
              <p className="text-sm text-gray-500">{station.address}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (!user) {
                navigate("/auth");
                return;
              }
              if (station && station.location_id) {
                logger.debug(
                  "Toggling favorite for location:",
                  station.location_id,
                );
                toggleFavoriteApi(station.location_id);
              }
            }}
            className="p-2"
          >
            <Heart
              className={`w-6 h-6 transition-colors ${
                station &&
                station.location_id &&
                isFavorite(station.location_id)
                  ? "fill-red-500 text-red-500"
                  : "text-gray-400"
              }`}
            />
          </button>
        </div>

        {/* Connectors Selection */}
        <div className="mt-3 space-y-2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Выберите коннектор:
          </h3>
          {station.connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => setSelectedConnector(connector.id)}
              disabled={connector.status !== "available"}
              className={`w-full p-2.5 rounded-lg border transition-all ${
                selectedConnector === connector.id
                  ? "border-cyan-500 bg-cyan-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              } ${
                connector.status !== "available"
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      connector.status === "available"
                        ? "bg-green-100 text-green-600"
                        : connector.status === "occupied"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-red-100 text-red-600"
                    }`}
                  >
                    🔌
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{connector.type}</div>
                    <div className="text-sm text-gray-500">
                      Коннектор №{connector.id.split("-").pop()}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        ⚡ {connector.power || station.power || 0} кВт/ч
                      </span>
                      <span className="text-orange-500 font-semibold">
                        {connectorPrices[connector.id] || station.price || 13.5}{" "}
                        сом/кВт
                      </span>
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        connector.status === "available"
                          ? "text-green-600"
                          : connector.status === "occupied"
                            ? "text-orange-600"
                            : "text-red-600"
                      }`}
                    >
                      {connector.status === "available"
                        ? "Работает"
                        : connector.status === "occupied"
                          ? "Занят"
                          : "Неисправен"}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Balance Card */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(balance?.balance ?? 0).toFixed(2)} KGS
                </p>
                <p className="text-sm text-gray-500">Баланс</p>
              </div>
            </div>
            <button
              onClick={() => setShowTopup(true)}
              className="px-4 py-2 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
            >
              + Пополнить
            </button>
          </div>
        </div>

        {/* Dynamic Pricing Display */}
        {selectedConnector && station && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <DynamicPricingDisplay
              stationId={station.id}
              connectorType={
                station.connectors.find((c) => c.id === selectedConnector)?.type
              }
            />
          </div>
        )}

        {/* Charging Parameters */}
        {selectedConnector && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <h3 className="font-semibold mb-3">
              Выберите параметры зарядной сессии
            </h3>

            {chargingError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{chargingError}</p>
              </div>
            )}

            {/* Две основные кнопки */}
            <div className="space-y-3">
              {/* Кнопка: Полный заряд */}
              <button
                className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={() => {
                  setChargingLimits({ type: "none" });
                  handleStartCharging();
                }}
                disabled={chargingLoading || !selectedConnector}
              >
                {chargingLoading && chargingLimits.type === "none" ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Запуск зарядки...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Полный заряд
                  </>
                )}
              </button>

              {/* Кнопка: Зарядить на сумму (с ползунком) */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-medium text-gray-900">Зарядить на сумму</h4>

                {/* Ползунок для выбора суммы */}
                {currentPrice && station && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Сумма зарядки
                      </span>
                      <span className="text-lg font-bold text-cyan-600">
                        {chargingLimits.amount_som || 100} сом
                      </span>
                    </div>

                    <input
                      type="range"
                      min="50"
                      max={Math.min(2000, balance?.balance || 0)}
                      step="10"
                      value={chargingLimits.amount_som || 100}
                      onChange={(e) => {
                        const amount = Number(e.target.value);
                        setChargingLimits({
                          type: "amount",
                          amount_som: amount,
                          estimatedEnergy: amount / currentPrice,
                          estimatedCost: amount,
                          estimatedDuration:
                            (amount /
                              currentPrice /
                              (station.connectors.find(
                                (c) => c.id === selectedConnector,
                              )?.power ||
                                station.power ||
                                22)) *
                            60,
                        });
                      }}
                      disabled={chargingLoading}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${
                          (((chargingLimits.amount_som || 100) - 50) /
                            (Math.min(2000, balance?.balance || 0) - 50)) *
                          100
                        }%, #e5e7eb ${
                          (((chargingLimits.amount_som || 100) - 50) /
                            (Math.min(2000, balance?.balance || 0) - 50)) *
                          100
                        }%, #e5e7eb 100%)`,
                      }}
                    />

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>50 сом</span>
                      <span>
                        {Math.min(2000, balance?.balance || 0)} сом (макс)
                      </span>
                    </div>

                    {/* Расчётная информация */}
                    <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Получите энергии:</span>
                        <span className="font-semibold">
                          ~
                          {(
                            (chargingLimits.amount_som || 100) / currentPrice
                          ).toFixed(2)}{" "}
                          кВт·ч
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Время зарядки:</span>
                        <span className="font-semibold">
                          ~
                          {Math.round(
                            ((chargingLimits.amount_som || 100) /
                              currentPrice /
                              (station.connectors.find(
                                (c) => c.id === selectedConnector,
                              )?.power ||
                                station.power ||
                                22)) *
                              60,
                          )}{" "}
                          мин
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="w-full bg-cyan-500 text-white py-3 rounded-xl font-semibold hover:bg-cyan-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  onClick={() => {
                    if (chargingLimits.type !== "amount") {
                      setChargingLimits({ type: "amount", amount_som: 100 });
                    }
                    handleStartCharging();
                  }}
                  disabled={
                    chargingLoading ||
                    !selectedConnector ||
                    (balance?.balance || 0) < (chargingLimits.amount_som || 100)
                  }
                >
                  {chargingLoading && chargingLimits.type === "amount" ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Запуск зарядки...
                    </>
                  ) : (
                    <>
                      ⚡ Начать зарядку ({chargingLimits.amount_som || 100} сом)
                    </>
                  )}
                </button>

                {(balance?.balance || 0) <
                  (chargingLimits.amount_som || 100) && (
                  <p className="text-sm text-red-600 text-center">
                    Недостаточно средств на балансе
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!selectedConnector && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-center text-gray-600">
            Выберите коннектор для начала зарядки
          </div>
        )}
      </div>

      {/* Simple Topup Modal */}
      {showTopup && <SimpleTopup onClose={() => setShowTopup(false)} />}
    </div>
  );
};
