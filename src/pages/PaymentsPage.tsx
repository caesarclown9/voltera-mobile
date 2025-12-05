import { useState } from "react";
import {
  ChevronLeft,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Smartphone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useBalance } from "@/features/balance/hooks/useBalance";
import { SimpleTopup } from "@/features/balance/components/SimpleTopup";
import { useTransactionHistory } from "@/features/balance/hooks/useTransactionHistory";

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: balance } = useBalance();
  const { data: transactions, isLoading: transactionsLoading } =
    useTransactionHistory(20);
  const [selectedMethod, setSelectedMethod] = useState<
    "card" | "wallet" | null
  >(null);
  const [showQRTopup, setShowQRTopup] = useState(false);

  // Преобразуем транзакции в формат для отображения
  const paymentHistory = (transactions || []).map((tx) => ({
    id: tx.id.toString(),
    date: tx.created_at,
    amount: tx.paid_amount || tx.requested_amount,
    method:
      tx.payment_provider === "ODENGI"
        ? "O!Dengi"
        : tx.payment_provider || t("payments.unknown"),
    // approved и paid = успешно, processing = в обработке, остальные = отклонено
    status:
      tx.status === "approved" || tx.status === "paid"
        ? "success"
        : tx.status === "processing" || tx.status === "pending"
          ? "pending"
          : "failed",
    description: tx.description || t("payments.topupViaOdengi"),
  }));

  const paymentMethods = [
    {
      id: "wallet",
      name: t("payments.electronicWallet"),
      icon: <Smartphone className="w-6 h-6" />,
      description: "MBank, O!Dengi, Элсом",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-semibold ml-2 text-gray-900 dark:text-white">
            {t("payments.title")}
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Текущий баланс */}
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-6 text-white">
          <div className="text-sm opacity-90">
            {t("payments.currentBalance")}
          </div>
          <div className="text-3xl font-bold mt-1">
            {balance?.balance || 0} {t("common.som")}
          </div>
          <button
            onClick={() => setShowQRTopup(true)}
            className="mt-4 bg-white/20 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t("payments.topup")}
          </button>
        </div>

        {/* Способы оплаты */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            {t("payments.paymentMethods")}
          </h2>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() =>
                  setSelectedMethod(method.id as "card" | "wallet")
                }
                className={`w-full bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3 transition-all ${
                  selectedMethod === method.id ? "ring-2 ring-primary-500" : ""
                }`}
              >
                <div className="text-primary-500 dark:text-primary-400">
                  {method.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {method.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {method.description}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 ${
                    selectedMethod === method.id
                      ? "bg-primary-500 border-primary-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {selectedMethod === method.id && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* История платежей */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
            {t("payments.paymentHistory")}
          </h2>

          {transactionsLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {t("common.loading")}
              </p>
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {t("payments.historyEmpty")}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                {t("payments.topupToSeeHistory")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          payment.status === "success"
                            ? "bg-success-100 dark:bg-success-900/30"
                            : payment.status === "pending"
                              ? "bg-yellow-100 dark:bg-yellow-900/30"
                              : "bg-red-100 dark:bg-red-900/30"
                        }`}
                      >
                        {payment.status === "success" ? (
                          <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />
                        ) : payment.status === "pending" ? (
                          <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          +{payment.amount} {t("common.som")}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {payment.method}
                        </div>
                        {payment.description && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {payment.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {new Date(payment.date).toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div
                        className={`text-xs ${
                          payment.status === "success"
                            ? "text-success-600 dark:text-success-400"
                            : payment.status === "pending"
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {payment.status === "success"
                          ? t("payments.statusSuccess")
                          : payment.status === "pending"
                            ? t("payments.statusPending")
                            : t("payments.statusFailed")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Topup Modal */}
      {showQRTopup && <SimpleTopup onClose={() => setShowQRTopup(false)} />}
    </div>
  );
}
