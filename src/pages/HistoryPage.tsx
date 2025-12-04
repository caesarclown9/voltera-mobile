import { useState } from "react";
import { ChevronLeft, Zap, CreditCard, TrendingUp, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useChargingHistory,
  useTransactionHistory,
  useUsageStatistics,
} from "../features/history/hooks/useChargingHistory";
import { ChargingHistoryCard } from "../features/history/components/ChargingHistoryCard";
import { TransactionCard } from "../features/history/components/TransactionCard";
import { ExportButton } from "../features/history/components/ExportButton";
import { HistoryListSkeleton } from "@/shared/components/Skeleton";
import type { ChargingHistoryItem } from "../features/history/types";
import { logger } from "@/shared/utils/logger";

type TabType = "charging" | "transactions" | "statistics";

export function HistoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("charging");
  const [showFilters, setShowFilters] = useState(false);

  const { data: chargingHistory, isLoading: isLoadingCharging } =
    useChargingHistory();
  const { data: transactionHistory, isLoading: isLoadingTransactions } =
    useTransactionHistory();
  const { data: statistics, isLoading: isLoadingStats } = useUsageStatistics();

  const handleChargingItemClick = (item: ChargingHistoryItem) => {
    // Можно перейти на детальную страницу или показать модальное окно
    logger.debug("Charging session details:", item);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU").format(Math.round(amount));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky-header-safe z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/icons/voltera-logo-square.svg"
              alt=""
              className="h-6 w-auto"
            />
            <h1 className="text-xl font-semibold">История</h1>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("charging")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === "charging"
                ? "text-primary-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Зарядки</span>
            </div>
            {activeTab === "charging" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === "transactions"
                ? "text-primary-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Платежи</span>
            </div>
            {activeTab === "transactions" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("statistics")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === "statistics"
                ? "text-primary-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>Статистика</span>
            </div>
            {activeTab === "statistics" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
            )}
          </button>
        </div>
      </div>

      {/* Filters (показываем если нажата кнопка фильтра) */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium whitespace-nowrap">
              Последние 30 дней
            </button>
            <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-200">
              Эта неделя
            </button>
            <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-200">
              Этот месяц
            </button>
            <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-200">
              Выбрать период
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4">
        {/* Charging History Tab */}
        {activeTab === "charging" && (
          <div className="space-y-3">
            {/* Export Button */}
            {chargingHistory && chargingHistory.length > 0 && (
              <div className="flex justify-end mb-3">
                <ExportButton data={chargingHistory} type="charging" />
              </div>
            )}

            {isLoadingCharging ? (
              <HistoryListSkeleton count={4} />
            ) : chargingHistory && chargingHistory.length > 0 ? (
              chargingHistory.map((item) => (
                <ChargingHistoryCard
                  key={item.id}
                  item={item}
                  onClick={handleChargingItemClick}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <img
                  src="/icons/voltera-logo-square.svg"
                  alt=""
                  className="h-16 w-auto mx-auto mb-3 opacity-20"
                />
                <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">История зарядок пуста</p>
                <p className="text-sm text-gray-400 mt-1">
                  Здесь будут отображаться ваши зарядные сессии
                </p>
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="space-y-3">
            {/* Export Button */}
            {transactionHistory && transactionHistory.length > 0 && (
              <div className="flex justify-end mb-3">
                <ExportButton data={transactionHistory} type="transaction" />
              </div>
            )}

            {isLoadingTransactions ? (
              <HistoryListSkeleton count={4} />
            ) : transactionHistory && transactionHistory.length > 0 ? (
              transactionHistory.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <img
                  src="/icons/voltera-logo-square.svg"
                  alt=""
                  className="h-16 w-auto mx-auto mb-3 opacity-20"
                />
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">История платежей пуста</p>
                <p className="text-sm text-gray-400 mt-1">
                  Здесь будут отображаться ваши транзакции
                </p>
              </div>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === "statistics" && (
          <div className="space-y-4">
            {isLoadingStats ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : statistics ? (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Всего сессий</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statistics.totalSessions}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Всего энергии</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statistics.totalEnergy.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">кВт·ч</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">
                      Всего потрачено
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(statistics.totalCost)}
                    </p>
                    <p className="text-xs text-gray-500">сом</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Время зарядки</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(statistics.totalDuration)}
                    </p>
                    <p className="text-xs text-gray-500">минут</p>
                  </div>
                </div>

                {/* Average Stats */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Средние показатели
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Энергия за сессию
                      </span>
                      <span className="font-medium">
                        {statistics.averageSessionEnergy.toFixed(1)} кВт·ч
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Стоимость сессии
                      </span>
                      <span className="font-medium">
                        {formatCurrency(statistics.averageSessionCost)} сом
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Длительность сессии
                      </span>
                      <span className="font-medium">
                        {Math.round(statistics.averageSessionDuration)} мин
                      </span>
                    </div>
                  </div>
                </div>

                {/* Favorite Station */}
                {statistics.favoriteStation && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Любимая станция
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {statistics.favoriteStation.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {statistics.favoriteStation.visitsCount} посещений
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly Chart */}
                {statistics.monthlyData &&
                  statistics.monthlyData.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        По месяцам
                      </h3>
                      <div className="space-y-3">
                        {statistics.monthlyData.map((month) => (
                          <div key={month.month}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {month.month}
                              </span>
                              <span className="text-sm text-gray-500">
                                {month.sessions} сессий
                              </span>
                            </div>
                            <div className="bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary-500 h-2 rounded-full"
                                style={{
                                  width: `${(month.energy / Math.max(...statistics.monthlyData.map((m) => m.energy))) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-gray-500">
                                {month.energy.toFixed(1)} кВт·ч
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatCurrency(month.cost)} сом
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <div className="text-center py-12">
                <img
                  src="/icons/voltera-logo-square.svg"
                  alt=""
                  className="h-16 w-auto mx-auto mb-3 opacity-20"
                />
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Нет данных для статистики</p>
                <p className="text-sm text-gray-400 mt-1">
                  Статистика появится после первой зарядки
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
