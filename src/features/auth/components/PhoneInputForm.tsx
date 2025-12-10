/**
 * PhoneInputForm - форма ввода номера телефона
 *
 * Первый шаг авторизации:
 * 1. Пользователь вводит номер телефона
 * 2. Нажимает "Получить код"
 * 3. OTP код отправляется на WhatsApp
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Phone, Loader2 } from "lucide-react";
import { authService } from "../services/authService";
import { logger } from "@/shared/utils/logger";

interface PhoneInputFormProps {
  onOtpSent: (phone: string, expiresIn: number, resendDelay: number) => void;
  onError?: (error: string) => void;
}

/**
 * Форматирует номер для отображения (+996 XXX XXX XXX)
 */
function formatPhoneDisplay(value: string): string {
  // Оставляем только цифры
  const digits = value.replace(/\D/g, "");

  // Убираем код страны если есть
  const phone = digits.startsWith("996") ? digits.slice(3) : digits;

  // Форматируем в формат XXX XXX XXX
  if (phone.length <= 3) {
    return phone;
  } else if (phone.length <= 6) {
    return `${phone.slice(0, 3)} ${phone.slice(3)}`;
  } else {
    return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)}`;
  }
}

/**
 * Извлекает чистые цифры из отформатированного номера
 */
function extractDigits(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export function PhoneInputForm({ onOtpSent, onError }: PhoneInputFormProps) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const digits = extractDigits(value);

      // Максимум 9 цифр (без кода страны)
      if (digits.length <= 9) {
        setPhone(formatPhoneDisplay(digits));
        setError(null);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const digits = extractDigits(phone);

      // Валидация
      if (digits.length !== 9) {
        setError(t("auth.invalidPhone"));
        return;
      }

      // Проверяем что номер начинается с правильного кода оператора
      const validPrefixes = [
        "70",
        "77",
        "55",
        "99",
        "50",
        "22",
        "75",
        "76",
        "78",
      ];
      const prefix = digits.slice(0, 2);
      if (!validPrefixes.includes(prefix)) {
        setError(t("auth.invalidOperator"));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const fullPhone = `+996${digits}`;
        const result = await authService.sendOtp(fullPhone);

        logger.info("OTP sent successfully");
        onOtpSent(
          result.phone,
          result.expires_in_seconds,
          result.resend_available_in_seconds,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Не удалось отправить код";

        // Проверяем на rate limit
        if ((err as { code?: string }).code === "rate_limit") {
          const retryAfter = (err as { retryAfter?: number }).retryAfter || 60;
          setError(t("auth.waitBeforeResend", { seconds: retryAfter }));
        } else {
          setError(errorMessage);
        }

        logger.error("Failed to send OTP:", err);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [phone, onOtpSent, onError, t],
  );

  const isValid = extractDigits(phone).length === 9;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-6"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          {t("auth.loginTitle")}
        </h2>
        <p className="text-gray-500 mt-1">{t("auth.loginSubtitle")}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Phone Input */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("auth.phone")}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <span className="text-gray-500 font-medium">+996</span>
            </div>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder=""
              className={`
                w-full pl-16 pr-4 py-3 rounded-xl border-2 transition-colors
                text-lg font-medium tracking-wide
                ${error ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-primary-500"}
                focus:outline-none focus:ring-0
              `}
              autoComplete="tel"
              inputMode="numeric"
              disabled={isLoading}
            />
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-red-600"
            >
              {error}
            </motion.p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className={`
            w-full py-3.5 rounded-xl font-semibold text-white transition-all
            flex items-center justify-center gap-2
            ${
              isValid && !isLoading
                ? "bg-primary-500 hover:bg-primary-600 active:scale-[0.98]"
                : "bg-gray-300 cursor-not-allowed"
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("auth.sending")}
            </>
          ) : (
            t("auth.getCode")
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-6">
        {t("auth.termsNotice")}
      </p>
    </motion.div>
  );
}
