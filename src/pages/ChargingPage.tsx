import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Heart,
  CreditCard,
  Zap,
  BatteryCharging,
  Plug,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const { user } = useAuthStatus();
  const { data: balance } = useBalance();
  const { startCharging, isStarting } = useCharging();
  const { toggleFavorite: toggleFavoriteApi, isFavorite } = useFavorites();
  const [isStartingCharging, setIsStartingCharging] = useState(false);

  // Объединяем состояние загрузки: либо мутация в процессе, либо локальное состояние
  const chargingLoading = isStarting || isStartingCharging;

  // Загружаем статус станции через новый API
  const { data: stationStatus, isLoading } = useStationStatus(stationId || "");

  // Подключаемся к real-time обновлениям для этой станции
  useLocationUpdates(stationId ? [`station:${stationId}`] : []);

  // Проверяем наличие активной сессии зарядки
  useEffect(() => {
    const savedSessionId = localStorage.getItem("activeChargingSession");
    if (savedSessionId) {
      setActiveSession(savedSessionId);
    }
  }, []);

  // Конвертируем stationStatus в формат для UI (мемоизируем для избежания лишних ререндеров)
  const station = useMemo(() => {
    if (!stationStatus) return null;

    // Валидация обязательных полей
    if (
      !stationStatus.serial_number ||
      !stationStatus.location_name ||
      !stationStatus.connectors ||
      stationStatus.connectors.length === 0
    ) {
      logger.error("Invalid station data:", {
        serial_number: stationStatus.serial_number,
        location_name: stationStatus.location_name,
        connectors_count: stationStatus.connectors?.length,
      });
      return null;
    }

    return {
      id: stationStatus.serial_number,
      name: stationStatus.location_name,
      address: stationStatus.location_address || "Адрес не указан",
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

    // Дополнительная валидация station
    if (!station.id || !station.connectors || station.connectors.length === 0) {
      logger.error("Invalid station data in handleStartCharging:", station);
      setChargingError("Ошибка данных станции. Пожалуйста, обновите страницу.");
      return;
    }

    setChargingError(null);
    setIsStartingCharging(true); // Показываем состояние загрузки СРАЗУ

    // В dev режиме без настроенного API показываем предупреждение
    if (import.meta.env.DEV && !import.meta.env["VITE_API_URL"]) {
      setChargingError(
        "Запуск зарядки недоступен в режиме разработки. Настройте VITE_API_URL для тестирования.",
      );
      setIsStartingCharging(false);
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

      // Обрабатываем результат
      if (result && result.success) {
        // Успех - переходим на страницу процесса зарядки
        navigate(`/charging-process/${result.sessionId}`, {
          state: {
            stationId: station.id,
            chargingLimits: chargingLimits,
          },
        });
      } else if (result) {
        // Неудача - показываем сообщение об ошибке
        setChargingError(
          result.message || "Не удалось запустить зарядку. Попробуйте снова.",
        );
        setIsStartingCharging(false);
      } else {
        // Неожиданный случай - result undefined
        setChargingError(
          "Произошла ошибка при запуске зарядки. Попробуйте снова.",
        );
        setIsStartingCharging(false);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      setChargingError(errorMessage);
      setIsStartingCharging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">{t("errors.notFound")}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-6 py-2 bg-primary-500 text-white rounded-lg"
          >
            {t("charging.toStations")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 overflow-y-auto max-h-screen">
      {/* Loading Overlay - показывается при запуске зарядки */}
      {chargingLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 mx-4 shadow-xl max-w-sm w-full">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent"></div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t("charging.startingCharging")}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {t("charging.pleaseWait")}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Zap className="w-4 h-4 animate-pulse" />
                <span>{t("charging.connectingToStation")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm sticky-header-safe z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full bg-yellow-400 hover:bg-yellow-500"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/icons/voltera-logo-square.svg"
              alt=""
              className="h-6 w-auto"
            />
            <h1 className="text-xl font-semibold">{t("charging.title")}</h1>
          </div>
          <div className="text-right">
            <div className="text-sm">
              <p className="font-semibold">
                {(balance?.balance ?? 0).toFixed(2)} KGS
              </p>
              <p className="text-xs text-gray-500">{t("profile.balance")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Charging Session Banner */}
      {activeSession && (
        <div className="bg-gradient-to-r from-success-500 to-success-600 px-4 py-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <BatteryCharging className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div className="text-white">
                <p className="font-semibold">{t("charging.inProgress")}</p>
                <p className="text-sm text-white/90">
                  {t("charging.activeSession")}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                navigate(`/charging-process/${activeSession}`);
              }}
              className="px-4 py-2 bg-white text-success-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              {t("charging.return")}
            </button>
          </div>
        </div>
      )}

      {/* Station Info */}
      <div className="bg-white mt-1 px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-500" />
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
            {t("charging.selectConnector")}:
          </h3>
          {station &&
            station.connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => setSelectedConnector(connector.id)}
                disabled={connector.status !== "available"}
                className={`w-full p-2.5 rounded-lg border transition-all ${
                  selectedConnector === connector.id
                    ? "border-primary-500 bg-primary-50"
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
                          ? "bg-success-100 text-success-600"
                          : connector.status === "occupied"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-red-100 text-red-600"
                      }`}
                    >
                      <Plug className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{connector.type}</div>
                      <div className="text-sm text-gray-500">
                        {t("charging.connector")} №
                        {connector.id.split("-").pop()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <span className="font-medium flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          {connector.power || station.power || 0}{" "}
                          {t("common.kwh")}
                        </span>
                        <span className="text-orange-500 font-semibold">
                          {connectorPrices[connector.id] ||
                            station.price ||
                            13.5}{" "}
                          {t("common.som")}/{t("common.kw")}
                        </span>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          connector.status === "available"
                            ? "text-success-600"
                            : connector.status === "occupied"
                              ? "text-orange-600"
                              : "text-red-600"
                        }`}
                      >
                        {connector.status === "available"
                          ? t("station.available")
                          : connector.status === "occupied"
                            ? t("station.occupied")
                            : t("station.error")}
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
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(balance?.balance ?? 0).toFixed(2)} KGS
                </p>
                <p className="text-sm text-gray-500">{t("profile.balance")}</p>
              </div>
            </div>
            <button
              onClick={() => setShowTopup(true)}
              className="px-4 py-2 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
            >
              + {t("profile.topup")}
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
              {/* Full charge button */}
              <button
                className="w-full bg-primary-500 text-white py-4 rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={() => {
                  setChargingLimits({ type: "none" });
                  handleStartCharging();
                }}
                disabled={chargingLoading || !selectedConnector}
              >
                {chargingLoading && chargingLimits.type === "none" ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {t("charging.startCharging")}...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    {t("charging.fullCharge")}
                  </>
                )}
              </button>

              {/* Charge by amount section */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-medium text-gray-900">
                  {t("charging.chargeByAmount")}
                </h4>

                {/* Amount slider */}
                {currentPrice && station && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {t("balance.amount")}
                      </span>
                      <span className="text-lg font-bold text-primary-600">
                        {chargingLimits.amount_som || 100} {t("common.som")}
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
                              (station?.connectors.find(
                                (c) => c.id === selectedConnector,
                              )?.power ||
                                station?.power ||
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
                      <span>50 {t("common.som")}</span>
                      <span>
                        {Math.min(2000, balance?.balance || 0)}{" "}
                        {t("common.som")} (max)
                      </span>
                    </div>

                    {/* Estimated info */}
                    <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {t("charging.estimatedEnergy")}:
                        </span>
                        <span className="font-semibold">
                          ~
                          {(
                            (chargingLimits.amount_som || 100) / currentPrice
                          ).toFixed(2)}{" "}
                          {t("common.kwh")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {t("charging.estimatedTime")}:
                        </span>
                        <span className="font-semibold">
                          ~
                          {Math.round(
                            ((chargingLimits.amount_som || 100) /
                              currentPrice /
                              (station?.connectors.find(
                                (c) => c.id === selectedConnector,
                              )?.power ||
                                station?.power ||
                                22)) *
                              60,
                          )}{" "}
                          {t("common.minutes")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className="w-full bg-primary-500 text-white py-3 rounded-xl font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                      {t("charging.startCharging")}...
                    </>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      {t("charging.startCharging")} (
                      {chargingLimits.amount_som || 100} {t("common.som")})
                    </span>
                  )}
                </button>

                {(balance?.balance || 0) <
                  (chargingLimits.amount_som || 100) && (
                  <p className="text-sm text-red-600 text-center">
                    {t("errors.insufficientFunds")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {!selectedConnector && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-center text-gray-600">
            {t("charging.selectConnector")}
          </div>
        )}
      </div>

      {/* Simple Topup Modal */}
      {showTopup && <SimpleTopup onClose={() => setShowTopup(false)} />}
    </div>
  );
};
