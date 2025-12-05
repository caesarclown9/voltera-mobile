import { Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface BalanceCardProps {
  balance: number;
  currency?: string;
  isLoading?: boolean;
  onTopup: () => void;
  /** Порог низкого баланса для анимации pulse (по умолчанию 50) */
  lowBalanceThreshold?: number;
}

export function BalanceCard({
  balance,
  currency = "сом",
  isLoading,
  onTopup,
  lowBalanceThreshold = 50,
}: BalanceCardProps) {
  const { t } = useTranslation();
  const isLowBalance = !isLoading && balance < lowBalanceThreshold;

  return (
    <div className="mx-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <motion.div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isLowBalance
              ? "bg-red-50 dark:bg-red-900/30"
              : "bg-primary-100 dark:bg-primary-900/30"
          }`}
          animate={isLowBalance ? { scale: [1, 1.05, 1] } : {}}
          transition={isLowBalance ? { repeat: Infinity, duration: 2 } : {}}
        >
          <Wallet
            className={`w-5 h-5 ${
              isLowBalance
                ? "text-red-600 dark:text-red-400"
                : "text-primary-600 dark:text-primary-400"
            }`}
          />
        </motion.div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("profile.balance")}
          </p>
          <p
            className={`text-xl font-bold ${
              isLowBalance
                ? "text-red-600 dark:text-red-400"
                : "text-gray-900 dark:text-white"
            }`}
          >
            {isLoading ? "..." : balance}{" "}
            <span className="text-base font-normal text-gray-600 dark:text-gray-300">
              {currency}
            </span>
          </p>
          {isLowBalance && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {t("balance.recommendTopup")}
            </p>
          )}
        </div>
      </div>
      <motion.button
        onClick={onTopup}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          isLowBalance
            ? "bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-500"
            : "bg-primary-500 dark:bg-primary-600 text-white hover:bg-primary-600 dark:hover:bg-primary-500"
        }`}
        animate={
          isLowBalance
            ? {
                scale: [1, 1.03, 1],
                boxShadow: [
                  "0 0 0 0 rgba(239, 68, 68, 0)",
                  "0 0 0 6px rgba(239, 68, 68, 0.2)",
                  "0 0 0 0 rgba(239, 68, 68, 0)",
                ],
              }
            : {}
        }
        transition={
          isLowBalance
            ? {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : {}
        }
        whileTap={{ scale: 0.95 }}
      >
        {t("profile.topup")}
      </motion.button>
    </div>
  );
}
