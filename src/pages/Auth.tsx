/**
 * Auth Page - страница авторизации через телефон + OTP
 *
 * Использует phone + OTP авторизацию:
 * 1. PhoneInputForm - ввод номера телефона
 * 2. OtpVerifyForm - ввод OTP кода из WhatsApp
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneInputForm } from "../features/auth/components/PhoneInputForm";
import { OtpVerifyForm } from "../features/auth/components/OtpVerifyForm";
import { useAuthStatus } from "../features/auth/hooks/useAuth";
import { useAuthStore } from "../features/auth/store";
import type { VerifyOtpResponse } from "../features/auth/services/authService";
import { logger } from "../shared/utils/logger";

type AuthStep = "phone" | "otp";

interface OtpData {
  phone: string;
  expiresIn: number;
  resendDelay: number;
}

export default function Auth() {
  const [step, setStep] = useState<AuthStep>("phone");
  const [otpData, setOtpData] = useState<OtpData | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStatus();
  const { login } = useAuthStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleOtpSent = (
    phone: string,
    expiresIn: number,
    resendDelay: number,
  ) => {
    setOtpData({ phone, expiresIn, resendDelay });
    setStep("otp");
  };

  const handleOtpSuccess = (data: VerifyOtpResponse) => {
    logger.info("[Auth] OTP verified successfully, logging in user");

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
    navigate("/", { replace: true });
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
    // Иначе - вернуться на предыдущую страницу
    navigate(-1);
  };

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-8 transition-colors">
      <div className="relative w-full max-w-md mx-4">
        {/* Back Button */}
        <button
          aria-label="Назад"
          onClick={handleBack}
          className="absolute top-3 left-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>

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
                onError={(error) => logger.error("[Auth] Phone error:", error)}
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
                onError={(error) => logger.error("[Auth] OTP error:", error)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
