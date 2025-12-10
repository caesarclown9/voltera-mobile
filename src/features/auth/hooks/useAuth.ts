/**
 * Auth Hooks - хуки для авторизации
 *
 * Использует phone + OTP авторизацию через WhatsApp (wappi.pro)
 */

import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store";
import { authService, type VerifyOtpResponse } from "../services/authService";
import { tokenService } from "../services/tokenService";
import { useNavigate } from "react-router-dom";
import { logger } from "@/shared/utils/logger";

/**
 * Hook для отправки OTP кода
 */
export const useSendOtp = () => {
  return useMutation({
    mutationFn: async (phone: string) => {
      const result = await authService.sendOtp(phone);
      return result;
    },
    onError: (error) => {
      logger.error("[useSendOtp] Error:", error);
    },
  });
};

/**
 * Hook для верификации OTP и входа
 */
export const useVerifyOtp = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      const result = await authService.verifyOtp(phone, code);
      return result;
    },
    onSuccess: (data: VerifyOtpResponse) => {
      logger.info("[useVerifyOtp] OTP verified successfully");

      // Преобразуем AuthUser в UnifiedUser
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
    },
    onError: (error) => {
      logger.error("[useVerifyOtp] Error:", error);
    },
  });
};

/**
 * Hook для выхода из системы
 */
export const useLogout = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      logger.debug("[useLogout] Starting logout...");
      await authService.signOut();
      logger.debug("[useLogout] AuthService signOut completed");
      return Promise.resolve();
    },
    onSuccess: () => {
      logger.debug(
        "[useLogout] onSuccess called, clearing store and navigating...",
      );
      logout();
      try {
        localStorage.removeItem("skipped_auth");
      } catch {
        // Ignore storage errors
      }
      // После логаута открываем главную и показываем модалку авторизации (со скипом)
      navigate("/", { replace: true });
    },
    onError: (error) => {
      logger.error("[useLogout] Error during logout:", error);
      // Все равно очищаем локальное состояние
      logout();
    },
  });
};

/**
 * Hook для проверки статуса авторизации
 */
export const useAuthStatus = () => {
  const { isAuthenticated, user, isInitialized } = useAuthStore();

  return {
    isAuthenticated,
    user,
    phone: user?.phone || null,
    isInitialized,
    isLoading: !isInitialized, // Loading пока не завершена инициализация
  };
};

/**
 * Hook для получения client_id
 */
export const useClientId = () => {
  const { user } = useAuthStore();
  return user?.id || null;
};

/**
 * Hook для получения типа пользователя
 */
export const useUserType = () => {
  return tokenService.getUserType();
};

// Alias для обратной совместимости
export const useAuth = useAuthStatus;
