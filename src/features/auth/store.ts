/**
 * Auth Store - состояние авторизации
 *
 * Использует phone + OTP авторизацию.
 * Токены управляются через tokenService.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UnifiedUser } from "./types/unified.types";
import { authService } from "./services/authService";
import { tokenService } from "./services/tokenService";
import { logger } from "@/shared/utils/logger";

interface AuthState {
  user: UnifiedUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  // Actions
  login: (user: UnifiedUser) => void;
  logout: () => void;
  setUser: (user: UnifiedUser) => void;
  refreshUser: () => Promise<void>;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isInitialized: false,

      login: (user: UnifiedUser) => {
        set({
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
      },

      logout: () => {
        logger.debug("[AuthStore] Logout called, clearing state...");

        // Очищаем состояние
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });

        // Явно удаляем флаг пропуска авторизации, чтобы показать модалку входа
        localStorage.removeItem("skipped_auth");

        logger.debug(
          "[AuthStore] State cleared, auth removed from localStorage",
        );
      },

      setUser: (user: UnifiedUser) => {
        set({ user });
      },

      refreshUser: async () => {
        try {
          const authUser = await authService.getCurrentUser();
          if (authUser) {
            const user: UnifiedUser = {
              id: authUser.id,
              phone: authUser.phone || null,
              name: ("name" in authUser && authUser.name) || "User",
              balance: ("balance" in authUser && authUser.balance) || 0,
              status: "active" as const,
              favoriteStations: [],
              createdAt: authUser.created_at || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            set({ user, isAuthenticated: true });
          } else {
            // Пользователь не найден - очищаем токены
            await tokenService.clearTokens();
            set({ user: null, isAuthenticated: false });
          }
        } catch (error) {
          logger.error("[AuthStore] Error refreshing user:", error);
          await tokenService.clearTokens();
          set({ user: null, isAuthenticated: false });
        }
      },

      setInitialized: (initialized: boolean) => {
        set({ isInitialized: initialized });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // НЕ сохраняем isInitialized - он должен быть false при каждой загрузке
      }),
      skipHydration: true, // Оставляем true, чтобы контролировать процесс вручную в AuthProvider
    },
  ),
);
