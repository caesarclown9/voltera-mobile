import { useState, useEffect, useRef } from "react";
import { useQRTopup } from "../hooks/useBalance";
import { evpowerApi } from "@/services/evpowerApi";
import { useQueryClient } from "@tanstack/react-query";
import { safeParseInt } from "../../../shared/utils/parsers";

interface SimpleTopupProps {
  onClose: () => void;
}

export function SimpleTopup({ onClose }: SimpleTopupProps) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"amount" | "qr" | "success">("amount");
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const { mutateAsync: createQRTopup } = useQRTopup();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const startPaymentStatusPolling = (invoiceId: string) => {
    // Wait 5 seconds before starting to check - give user time to scan QR
    setTimeout(() => {
      setCheckingPayment(true);

      // Poll every 3 seconds
      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await evpowerApi.getPaymentStatus(invoiceId);

          // Log the status to understand what we're getting
          console.log("Payment status response:", {
            status: status.status,
            success: status.success,
            invoice_expired: status.invoice_expired,
            paid_amount: status.paid_amount,
            full_response: status,
          });

          // Only mark as successful if status is explicitly 1 (paid) AND success is true
          // Status 0 = pending, 1 = paid, 2 = failed
          // NOTE: Backend иногда не возвращает paid_amount, поэтому проверяем только status
          if (status.status === 1 && status.success === true) {
            // Payment successful - confirmed paid
            console.log(
              "Payment confirmed! Paid amount:",
              status.paid_amount || status.amount,
            );
            stopPolling();
            setStep("success");
            // Refetch balance and transaction history to update them
            queryClient.invalidateQueries({ queryKey: ["balance"] });
            queryClient.invalidateQueries({
              queryKey: ["transaction-history"],
            });

            // Auto close after 3 seconds
            setTimeout(() => {
              onClose();
            }, 3000);
          } else if (status.status === 2 || status.invoice_expired === true) {
            // Payment failed (status 2 = failed) or invoice expired
            console.log("Payment failed or expired");
            stopPolling();
            setError("Платеж не прошел или срок действия QR кода истек.");
          } else {
            // Status 0 or other - payment is still pending
            console.log("Payment still pending...");
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      }, 3000);

      // Stop polling after 5 minutes
      setTimeout(
        () => {
          stopPolling();
          setError(
            "Время ожидания истекло. Если вы оплатили, баланс обновится автоматически.",
          );
        },
        5 * 60 * 1000,
      );
    }, 5000); // Initial 5 second delay
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setCheckingPayment(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const handleGenerateQR = async () => {
    const numAmount = safeParseInt(amount, 0);
    if (numAmount < 1) {
      setError("Минимальная сумма пополнения 1 сом");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createQRTopup({
        amount: numAmount,
        description: "Пополнение баланса",
      });

      if (result) {
        setQrData(result);
        setStep("qr");
        // Start automatic polling for payment status
        startPaymentStatusPolling(result.paymentId);
      }
    } catch (error: any) {
      console.error("QR Generation Error:", error);
      setError(error.response?.data?.message || "Не удалось создать QR код");
    } finally {
      setLoading(false);
    }
  };

  const numAmount = safeParseInt(amount, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === "amount"
              ? "Пополнение баланса"
              : step === "qr"
                ? "QR код для оплаты"
                : "Платеж успешен"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {step === "amount" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Введите сумму пополнения
                </label>
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Сумма в сомах"
                  autoFocus
                />
              </div>

              {numAmount > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <span className="text-sm text-gray-600">К пополнению: </span>
                  <span className="text-lg font-bold text-primary-600">
                    {numAmount} сом
                  </span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleGenerateQR}
                disabled={numAmount < 1 || loading}
                className="w-full bg-primary-500 text-white py-2 rounded-lg font-medium hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? "Генерация QR..." : "Создать QR код"}
              </button>
            </div>
          ) : step === "qr" ? (
            <div className="space-y-4">
              <div className="text-center">
                {/* Backend может вернуть qr_code_url или qr_url */}
                {qrData?.qr_code_url || qrData?.qr_url ? (
                  <img
                    src={qrData.qr_code_url || qrData.qr_url}
                    alt="QR код"
                    className="w-48 h-48 mx-auto border-2 border-gray-200 rounded-lg p-2"
                  />
                ) : qrData?.qr_code || qrData?.qr ? (
                  // Backend может вернуть qr_code или qr - проверяем URL или base64
                  <img
                    src={
                      (qrData.qr_code || qrData.qr).startsWith("http")
                        ? qrData.qr_code || qrData.qr
                        : `data:image/png;base64,${qrData.qr_code || qrData.qr}`
                    }
                    alt="QR код"
                    className="w-48 h-48 mx-auto border-2 border-gray-200 rounded-lg p-2"
                  />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">QR код недоступен</span>
                  </div>
                )}

                <p className="mt-3 text-sm text-gray-600">
                  Сумма: <span className="font-semibold">{numAmount} сом</span>
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Сканируйте QR код в приложении O!Dengi
                </p>

                {/* Payment status indicator */}
                {checkingPayment && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    <span className="text-sm text-gray-600">
                      Ожидаем подтверждение платежа...
                    </span>
                  </div>
                )}

                {/* Error message */}
                {error && step === "qr" && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-xs">{error}</p>
                  </div>
                )}

                {/* Payment URL for mobile - backend может вернуть payment_url, link_app или app_link */}
                {(qrData?.payment_url ||
                  qrData?.link_app ||
                  qrData?.app_link) && (
                  <div className="mt-3">
                    <a
                      href={
                        qrData.payment_url || qrData.link_app || qrData.app_link
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline text-sm font-medium"
                    >
                      Открыть в O!Dengi →
                    </a>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setStep("amount");
                    setError(null);
                    stopPolling();
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Изменить сумму
                </button>
                <button
                  onClick={() => {
                    stopPolling();
                    onClose();
                  }}
                  className="flex-1 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
                >
                  Закрыть
                </button>
              </div>
            </div>
          ) : (
            /* Success Screen */
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Баланс успешно пополнен!
                </h3>

                <p className="text-lg text-gray-600">
                  На сумму:{" "}
                  <span className="font-bold text-primary-600">
                    {numAmount} сом
                  </span>
                </p>

                <p className="mt-3 text-sm text-gray-500">
                  Окно закроется автоматически...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
