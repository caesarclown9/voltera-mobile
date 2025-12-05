import { useBalance } from "../hooks/useBalance";
import { useAuthStatus } from "../../auth/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface BalanceCardProps {
  onTopupClick: () => void;
}

export function BalanceCard({ onTopupClick }: BalanceCardProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStatus();
  const {
    data: balance,
    isLoading: loading,
    error,
    refetch: fetchBalance,
  } = useBalance();

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="card dark:bg-gray-800">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card dark:bg-gray-800">
        <div className="text-center py-4">
          <p className="text-error-600 dark:text-error-400 mb-4">
            {error.message || t("errors.network")}
          </p>
          <button
            onClick={() => fetchBalance()}
            className="btn btn-outline mr-2"
          >
            {t("common.retry")}
          </button>
          <button onClick={onTopupClick} className="btn btn-primary">
            {t("balance.topup")}
          </button>
        </div>
      </div>
    );
  }

  const formatBalance = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getBalanceColor = (amount: number) => {
    if (amount < 50) return "text-error-600 dark:text-error-400";
    if (amount < 200) return "text-primary-600 dark:text-primary-400";
    return "text-primary-600 dark:text-primary-400";
  };

  return (
    <div className="card dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("profile.balance")}
        </h2>
        <div className="flex items-center space-x-1">
          <svg
            className="w-5 h-5 text-primary-600 dark:text-primary-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
        </div>
      </div>

      <div
        className={`text-3xl font-bold mb-6 ${getBalanceColor(balance?.balance || 0)}`}
      >
        {formatBalance(balance?.balance || 0)} {balance?.currency || "сом"}
      </div>

      {(balance?.balance || 0) < 50 && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-error-600 dark:text-error-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-sm text-error-600 dark:text-error-400">
              {t("balance.lowBalance")}. {t("balance.recommendTopup")}.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onTopupClick} className="btn btn-primary">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          {t("profile.topup")}
        </button>

        <button className="btn btn-outline dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          {t("profile.history")}
        </button>
      </div>
    </div>
  );
}
