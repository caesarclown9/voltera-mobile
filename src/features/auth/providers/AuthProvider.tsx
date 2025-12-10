/**
 * AuthProvider - провайдер авторизации
 *
 * Инициализирует состояние авторизации при загрузке приложения.
 * Использует phone + OTP авторизацию через tokenService.
 */

import { useEffect } from "react";
import { useAuthStore } from "../store";
import { authService } from "../services/authService";
import { tokenService } from "../services/tokenService";
import { logger } from "@/shared/utils/logger";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { login, logout, setInitialized } = useAuthStore();

  useEffect(() => {
    // Rehydrate the store on mount
    useAuthStore.persist.rehydrate();

    // Initialize auth state - проверяем сохраненные токены
    const initializeAuth = async () => {
      try {
        logger.debug("[AuthProvider] Initializing auth...");

        // Проверяем есть ли сохраненные токены
        const hasTokens = await tokenService.hasTokens();
        logger.debug("[AuthProvider] Has tokens:", hasTokens);

        if (!hasTokens) {
          logger.debug(
            "[AuthProvider] No tokens found, user not authenticated",
          );
          setInitialized(true);
          return;
        }

        // Пробуем получить данные пользователя
        const user = await authService.getCurrentUser();
        logger.debug(
          "[AuthProvider] InitializeAuth: Got user:",
          user ? user.id : "null",
        );

        if (user) {
          // Преобразуем AuthUser в UnifiedUser
          const unifiedUser = {
            id: user.id,
            phone: user.phone || null,
            name: ("name" in user && user.name) || "User",
            balance: ("balance" in user && user.balance) || 0,
            status: "active" as const,
            favoriteStations: [],
            createdAt: user.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          logger.debug("[AuthProvider] InitializeAuth: Logging in user");
          login(unifiedUser);
        } else {
          logger.debug(
            "[AuthProvider] InitializeAuth: User data not found, tokens may be invalid",
          );
          // Токены есть, но пользователь не найден - возможно токены устарели
          // Пробуем обновить токен
          const refreshed = await tokenService.refreshAccessToken();
          if (refreshed) {
            // Повторно пробуем получить данные
            const retryUser = await authService.getCurrentUser();
            if (retryUser) {
              const unifiedUser = {
                id: retryUser.id,
                phone: retryUser.phone || null,
                name: ("name" in retryUser && retryUser.name) || "User",
                balance: ("balance" in retryUser && retryUser.balance) || 0,
                status: "active" as const,
                favoriteStations: [],
                createdAt: retryUser.created_at || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              login(unifiedUser);
            } else {
              // Не удалось получить пользователя даже после refresh
              await tokenService.clearTokens();
              logout();
            }
          } else {
            // Refresh не удался - очищаем токены
            await tokenService.clearTokens();
            logout();
          }
        }
      } catch (error) {
        logger.error("[AuthProvider] Error initializing auth:", error);
        // При ошибке очищаем состояние
        await tokenService.clearTokens();
        logout();
      } finally {
        // Всегда помечаем как инициализировано
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [login, logout, setInitialized]);

  return <>{children}</>;
}
