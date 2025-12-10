/**
 * AuthModal - модальное окно авторизации
 *
 * Использует phone + OTP авторизацию:
 * 1. PhoneInputForm - ввод номера телефона
 * 2. OtpVerifyForm - ввод OTP кода из WhatsApp
 */

import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneInputForm } from "./PhoneInputForm";
import { OtpVerifyForm } from "./OtpVerifyForm";
import { useAuthStatus } from "../hooks/useAuth";
import { useAuthStore } from "../store";
import type { VerifyOtpResponse } from "../services/authService";
import { logger } from "@/shared/utils/logger";

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  allowSkip?: boolean; // Можно ли пропустить авторизацию
  requireAuth?: boolean; // Требуется ли обязательная авторизация
}

type AuthStep = "phone" | "otp";

interface OtpData {
  phone: string;
  expiresIn: number;
  resendDelay: number;
}

export function AuthModal({
  isOpen: controlledIsOpen,
  onClose,
  allowSkip = true,
  requireAuth = false,
}: AuthModalProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [step, setStep] = useState<AuthStep>("phone");
  const [otpData, setOtpData] = useState<OtpData | null>(null);
  const [hasSkipped, setHasSkipped] = useState(false);
  const { isAuthenticated, isInitialized } = useAuthStatus();
  const { login } = useAuthStore();

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Показываем модалку при первом запуске если пользователь не авторизован и не пропускал
  useEffect(() => {
    // Не показываем модалку до завершения инициализации
    if (!isInitialized) {
      return;
    }

    // Если вернулись со страницы с requireAuth и хотим подавить авто‑показ один раз
    const suppressOnce = sessionStorage.getItem("suppress_auth_modal_once");
    if (suppressOnce) {
      sessionStorage.removeItem("suppress_auth_modal_once");
      setInternalIsOpen(false);
      return;
    }

    const skippedAuth = localStorage.getItem("skipped_auth");
    if (skippedAuth) {
      setHasSkipped(true);
    }

    if (!isAuthenticated && !skippedAuth && !requireAuth) {
      setInternalIsOpen(true);
    } else if (!isAuthenticated && requireAuth) {
      setInternalIsOpen(true);
    }
  }, [isAuthenticated, requireAuth, isInitialized]);

  // Сброс состояния при закрытии модалки
  useEffect(() => {
    if (!isOpen) {
      // Небольшая задержка чтобы анимация завершилась
      const timer = setTimeout(() => {
        setStep("phone");
        setOtpData(null);
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  const handleOtpSent = (
    phone: string,
    expiresIn: number,
    resendDelay: number,
  ) => {
    setOtpData({ phone, expiresIn, resendDelay });
    setStep("otp");
  };

  const handleOtpSuccess = (data: VerifyOtpResponse) => {
    logger.info("[AuthModal] OTP verified successfully, logging in user");

    // Преобразуем AuthUser в UnifiedUser и логиним
    const unifiedUser = {
      id: data.user.id,
      phone: data.user.phone || null,
      name: ("name" in data.user && data.user.name) || "User",
      balance: ("balance" in data.user && data.user.balance) || 0,
      status: "active" as const,
      favoriteStations: [],
      createdAt: data.user.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    login(unifiedUser);

    // Закрываем модалку
    setInternalIsOpen(false);
    onClose?.();
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setOtpData(null);
  };

  const handleBack = () => {
    // Если на шаге OTP - вернуться к телефону
    if (step === "otp") {
      handleBackToPhone();
      return;
    }

    // Если модалка контролируется извне (force open), делаем history.back
    if (controlledIsOpen !== undefined && requireAuth) {
      try {
        sessionStorage.setItem("suppress_auth_modal_once", "1");
      } catch {
        // Ignore storage errors
      }
      try {
        window.history.back();
      } catch {
        // Ignore navigation errors
      }
      return;
    }
    setInternalIsOpen(false);
    onClose?.();
  };

  const handleSkip = () => {
    if (allowSkip && !requireAuth) {
      localStorage.setItem("skipped_auth", "true");
      setHasSkipped(true);
      setInternalIsOpen(false);
      onClose?.();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={allowSkip && !requireAuth ? handleSkip : undefined}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative z-10 w-full max-w-md mx-4"
          >
            {/* Back Arrow - только на шаге phone и если можно вернуться */}
            {step === "phone" &&
              (allowSkip || controlledIsOpen !== undefined) && (
                <button
                  aria-label="Назад"
                  onClick={handleBack}
                  className="absolute top-3 left-3 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

            <AnimatePresence mode="wait">
              {step === "phone" ? (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <PhoneInputForm
                    onOtpSent={handleOtpSent}
                    onError={(error) =>
                      logger.error("[AuthModal] Phone error:", error)
                    }
                  />
                </motion.div>
              ) : otpData ? (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <OtpVerifyForm
                    phone={otpData.phone}
                    expiresIn={otpData.expiresIn}
                    resendDelay={otpData.resendDelay}
                    onSuccess={handleOtpSuccess}
                    onBack={handleBackToPhone}
                    onError={(error) =>
                      logger.error("[AuthModal] OTP error:", error)
                    }
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Кнопка "Продолжить без входа" - только на шаге phone */}
            {step === "phone" && allowSkip && !requireAuth && !hasSkipped && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={handleSkip}
                className="mt-4 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Продолжить без входа
              </motion.button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
