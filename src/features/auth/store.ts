import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UnifiedUser } from "./types/unified.types";
import { unifiedApi } from "@/services/evpowerApi";

interface AuthState {
  user: UnifiedUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // Добавляем флаг инициализации

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
        console.log("[AuthStore] Logout called, clearing state...");

        // Очищаем состояние
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });

        // Явно удаляем флаг пропуска авторизации, чтобы показать модалку входа
        localStorage.removeItem("skipped_auth");

        console.log(
          "[AuthStore] State cleared, auth removed from localStorage",
        );
      },

      setUser: (user: UnifiedUser) => {
        set({ user });
      },

      refreshUser: async () => {
        await unifiedApi.refreshUserData();
        const user = await unifiedApi.getCurrentUser();
        if (user) {
          set({ user, isAuthenticated: true });
        } else {
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
