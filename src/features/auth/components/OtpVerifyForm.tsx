/**
 * OtpVerifyForm - форма ввода OTP кода
 *
 * Второй шаг авторизации:
 * 1. Пользователь вводит 6-значный код из WhatsApp
 * 2. Код проверяется на сервере
 * 3. При успехе - вход в аккаунт
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { authService, type VerifyOtpResponse } from "../services/authService";
import { logger } from "@/shared/utils/logger";

interface OtpVerifyFormProps {
  phone: string;
  expiresIn: number; // секунды
  resendDelay: number; // секунды
  onSuccess: (data: VerifyOtpResponse) => void;
  onBack: () => void;
  onError?: (error: string) => void;
}

const OTP_LENGTH = 6;

export function OtpVerifyForm({
  phone,
  expiresIn,
  resendDelay,
  onSuccess,
  onBack,
  onError,
}: OtpVerifyFormProps) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(resendDelay);
  const [canResend, setCanResend] = useState(false);
  const [expiryTime, setExpiryTime] = useState(expiresIn);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown для повторной отправки
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
      return undefined;
    }
  }, [countdown]);

  // Countdown для истечения кода
  useEffect(() => {
    if (expiryTime > 0) {
      const timer = setTimeout(() => setExpiryTime(expiryTime - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [expiryTime]);

  // Фокус на первом инпуте при монтировании
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Автоматическая отправка при заполнении всех цифр
  useEffect(() => {
    const code = otp.join("");
    if (code.length === OTP_LENGTH && !isLoading) {
      handleVerify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleInputChange = useCallback(
    (index: number, value: string) => {
      // Только цифры
      const digit = value.replace(/\D/g, "").slice(-1);

      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      setError(null);

      // Переход к следующему инпуту
      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        // Переход к предыдущему инпуту при Backspace
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    const digits = pastedData.slice(0, OTP_LENGTH).split("");

    const newOtp = Array(OTP_LENGTH).fill("");
    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);

    // Фокус на последний заполненный или следующий пустой
    const focusIndex = Math.min(digits.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }, []);

  const handleVerify = useCallback(
    async (code: string) => {
      if (code.length !== OTP_LENGTH) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await authService.verifyOtp(phone, code);

        logger.info("OTP verified successfully");
        onSuccess(result);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Не удалось проверить код";

        setError(errorMessage);
        setOtp(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();

        logger.error("OTP verification failed:", err);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [phone, onSuccess, onError],
  );

  const handleResend = useCallback(async () => {
    if (!canResend || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.sendOtp(phone);

      setCountdown(result.resend_available_in_seconds);
      setExpiryTime(result.expires_in_seconds);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();

      logger.info("OTP resent successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Не удалось отправить код";
      setError(errorMessage);
      logger.error("Failed to resend OTP:", err);
    } finally {
      setIsLoading(false);
    }
  }, [phone, canResend, isLoading]);

  // Форматируем телефон для отображения
  const displayPhone = phone.replace(
    /(\+996)(\d{2})(\d{3})(\d{2})(\d{2})/,
    "$1 $2 $3 $4 $5",
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={isLoading}
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Изменить номер</span>
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Введите код</h2>
        <p className="text-gray-500 mt-1">
          Код отправлен на WhatsApp
          <br />
          <span className="font-medium text-gray-700">{displayPhone}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={isLoading}
            className={`
              w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all
              ${error ? "border-red-300" : digit ? "border-primary-500" : "border-gray-200"}
              focus:border-primary-500 focus:outline-none focus:ring-0
              disabled:bg-gray-50 disabled:text-gray-400
            `}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-red-600 mb-4"
        >
          {error}
        </motion.p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-primary-600 mb-4">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Проверка...</span>
        </div>
      )}

      {/* Timer */}
      {expiryTime > 0 && (
        <p className="text-center text-sm text-gray-400 mb-4">
          Код действителен ещё{" "}
          <span className="font-medium">
            {Math.floor(expiryTime / 60)}:
            {String(expiryTime % 60).padStart(2, "0")}
          </span>
        </p>
      )}

      {/* Resend Button */}
      <div className="text-center">
        {canResend ? (
          <button
            onClick={handleResend}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 mx-auto text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Отправить код повторно
          </button>
        ) : (
          <p className="text-gray-400 text-sm">
            Отправить повторно через{" "}
            <span className="font-medium">{countdown} сек</span>
          </p>
        )}
      </div>
    </motion.div>
  );
}
