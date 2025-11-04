import { useState } from "react";
import { ChevronLeft, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBalance } from "@/features/balance/hooks/useBalance";
import { SimpleTopup } from "@/features/balance/components/SimpleTopup";
import { useTransactionHistory } from "@/features/balance/hooks/useTransactionHistory";

export default function PaymentsPage() {
  const navigate = useNavigate();
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
        : tx.payment_provider || "Неизвестно",
    // approved и paid = успешно, processing = в обработке, остальные = отклонено
    status:
      tx.status === "approved" || tx.status === "paid"
        ? "success"
        : tx.status === "processing" || tx.status === "pending"
          ? "pending"
          : "failed",
    description: tx.description || "Пополнение баланса через ODENGI",
  }));

  const paymentMethods = [
    {
      id: "wallet",
      name: "Электронный кошелек",
      icon: "📱",
      description: "MBank, O!Деньги, Элсом",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold ml-2">Платежи</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Текущий баланс */}
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-6 text-white">
          <div className="text-sm opacity-90">Текущий баланс</div>
          <div className="text-3xl font-bold mt-1">
            {balance?.balance || 0} сом
          </div>
          <button
            onClick={() => setShowQRTopup(true)}
            className="mt-4 bg-white/20 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Пополнить
          </button>
        </div>

        {/* Способы оплаты */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Способы оплаты</h2>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() =>
                  setSelectedMethod(method.id as "card" | "wallet")
                }
                className={`w-full bg-white rounded-xl p-4 flex items-center gap-3 transition-all ${
                  selectedMethod === method.id ? "ring-2 ring-green-500" : ""
                }`}
              >
                <div className="text-2xl">{method.icon}</div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{method.name}</div>
                  <div className="text-sm text-gray-500">
                    {method.description}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 ${
                    selectedMethod === method.id
                      ? "bg-primary-500 border-primary-500"
                      : "border-gray-300"
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
          <h2 className="text-lg font-semibold mb-3">История платежей</h2>

          {transactionsLoading ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              <p className="text-gray-500 mt-2">Загрузка...</p>
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <p className="text-gray-500">История платежей пуста</p>
              <p className="text-sm text-gray-400 mt-2">
                Пополните баланс чтобы увидеть историю
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="bg-white rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          payment.status === "success"
                            ? "bg-success-100"
                            : payment.status === "pending"
                              ? "bg-yellow-100"
                              : "bg-red-100"
                        }`}
                      >
                        {payment.status === "success" ? (
                          <CheckCircle className="w-5 h-5 text-success-600" />
                        ) : payment.status === "pending" ? (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">+{payment.amount} сом</div>
                        <div className="text-sm text-gray-500">
                          {payment.method}
                        </div>
                        {payment.description && (
                          <div className="text-xs text-gray-400 mt-1">
                            {payment.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
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
                            ? "text-success-600"
                            : payment.status === "pending"
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {payment.status === "success"
                          ? "Успешно"
                          : payment.status === "pending"
                            ? "В обработке"
                            : "Отклонено"}
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
