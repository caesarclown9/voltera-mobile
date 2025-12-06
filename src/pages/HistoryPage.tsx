import { useState } from "react";
import { ChevronLeft, Zap, CreditCard, TrendingUp, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>("charging");
  const [showFilters, setShowFilters] = useState(false);

  // Ленивая загрузка - загружаем данные только для активной вкладки
  const { data: chargingHistory, isLoading: isLoadingCharging } =
    useChargingHistory({ enabled: activeTab === "charging" || activeTab === "statistics" });
  const { data: transactionHistory, isLoading: isLoadingTransactions } =
    useTransactionHistory({ enabled: activeTab === "transactions" });
  const { data: statistics, isLoading: isLoadingStats } = useUsageStatistics({
    enabled: activeTab === "statistics",
    chargingHistory // Передаём уже загруженные данные
  });

  const handleChargingItemClick = (item: ChargingHistoryItem) => {
    // Можно перейти на детальную страницу или показать модальное окно
    logger.debug("Charging session details:", item);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ru-RU").format(Math.round(amount));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky-header-safe z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/icons/voltera-logo-square.svg"
              alt=""
              className="h-6 w-auto"
            />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("history.title")}
            </h1>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("charging")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === "charging"
                ? "text-primary-600 dark:text-primary-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              <span>{t("history.tabs.charging")}</span>
            </div>
            {activeTab === "charging" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("transactions")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === "transactions"
                ? "text-primary-600 dark:text-primary-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>{t("history.tabs.transactions")}</span>
            </div>
            {activeTab === "transactions" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("statistics")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === "statistics"
                ? "text-primary-600 dark:text-primary-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>{t("history.tabs.statistics")}</span>
            </div>
            {activeTab === "statistics" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" />
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium whitespace-nowrap">
              {t("history.filters.last30days")}
            </button>
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-600">
              {t("history.filters.thisWeek")}
            </button>
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-600">
              {t("history.filters.thisMonth")}
            </button>
            <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-600">
              {t("history.filters.selectPeriod")}
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
                <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t("history.empty.charging")}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {t("history.empty.chargingHint")}
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
                <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t("history.empty.transactions")}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {t("history.empty.transactionsHint")}
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400"></div>
              </div>
            ) : statistics ? (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t("history.stats.totalSessions")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {statistics.totalSessions}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t("history.stats.totalEnergy")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {statistics.totalEnergy.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("common.kwh")}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t("history.stats.totalSpent")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(statistics.totalCost)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("common.som")}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t("history.stats.chargingTime")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.round(statistics.totalDuration)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t("common.minutes")}
                    </p>
                  </div>
                </div>

                {/* Average Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    {t("history.stats.averages")}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("history.stats.energyPerSession")}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {statistics.averageSessionEnergy.toFixed(1)}{" "}
                        {t("common.kwh")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("history.stats.costPerSession")}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(statistics.averageSessionCost)}{" "}
                        {t("common.som")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("history.stats.durationPerSession")}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {Math.round(statistics.averageSessionDuration)}{" "}
                        {t("common.minutes")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Favorite Station */}
                {statistics.favoriteStation && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      {t("history.stats.favoriteStation")}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {statistics.favoriteStation.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {statistics.favoriteStation.visitsCount}{" "}
                          {t("common.visits")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Monthly Chart */}
                {statistics.monthlyData &&
                  statistics.monthlyData.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                        {t("history.stats.byMonth")}
                      </h3>
                      <div className="space-y-3">
                        {statistics.monthlyData.map((month) => (
                          <div key={month.month}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {month.month}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {month.sessions} {t("common.sessions")}
                              </span>
                            </div>
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-primary-500 dark:bg-primary-400 h-2 rounded-full"
                                style={{
                                  width: `${(month.energy / Math.max(...statistics.monthlyData.map((m) => m.energy))) * 100}%`,
                                }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {month.energy.toFixed(1)} {t("common.kwh")}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatCurrency(month.cost)} {t("common.som")}
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
                <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t("history.empty.statistics")}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {t("history.empty.statisticsHint")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
