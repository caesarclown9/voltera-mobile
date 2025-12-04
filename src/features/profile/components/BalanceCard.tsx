import { Wallet } from "lucide-react";
import { motion } from "framer-motion";

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
  const isLowBalance = !isLoading && balance < lowBalanceThreshold;

  return (
    <div className="mx-4 p-4 bg-gray-50 rounded-xl flex items-center justify-between">
      <div className="flex items-center gap-3">
        <motion.div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isLowBalance ? "bg-warning-100" : "bg-primary-100"
          }`}
          animate={isLowBalance ? { scale: [1, 1.05, 1] } : {}}
          transition={isLowBalance ? { repeat: Infinity, duration: 2 } : {}}
        >
          <Wallet className={`w-5 h-5 ${isLowBalance ? "text-warning-600" : "text-primary-600"}`} />
        </motion.div>
        <div>
          <p className="text-sm text-gray-500">Баланс</p>
          <p className={`text-xl font-bold ${isLowBalance ? "text-warning-600" : "text-gray-900"}`}>
            {isLoading ? "..." : balance} <span className="text-base font-normal">{currency}</span>
          </p>
          {isLowBalance && (
            <p className="text-xs text-warning-500 mt-0.5">Рекомендуем пополнить</p>
          )}
        </div>
      </div>
      <motion.button
        onClick={onTopup}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          isLowBalance
            ? "bg-warning-500 text-white hover:bg-warning-600"
            : "bg-primary-500 text-white hover:bg-primary-600"
        }`}
        animate={isLowBalance ? {
          scale: [1, 1.05, 1],
          boxShadow: [
            "0 0 0 0 rgba(245, 158, 11, 0)",
            "0 0 0 8px rgba(245, 158, 11, 0.3)",
            "0 0 0 0 rgba(245, 158, 11, 0)"
          ]
        } : {}}
        transition={isLowBalance ? {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : {}}
        whileTap={{ scale: 0.95 }}
      >
        Пополнить
      </motion.button>
    </div>
  );
}
