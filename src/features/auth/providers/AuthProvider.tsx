import { useEffect } from "react";
import { useAuthStore } from "../store";
import { authService } from "../services/authService";
import { logger } from "@/shared/utils/logger";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { login, logout, setInitialized } = useAuthStore();

  useEffect(() => {
    // Rehydrate the store on mount
    useAuthStore.persist.rehydrate();

    // Initialize auth state - проверяем сохраненную сессию
    const initializeAuth = async () => {
      try {
        logger.debug("[AuthProvider] Initializing auth...");
        const user = await authService.getCurrentUser();
        logger.debug(
          "[AuthProvider] InitializeAuth: Got user:",
          user ? user.id : "null",
        );

        if (user) {
          // Преобразуем Client в UnifiedUser
          const unifiedUser = {
            id: user.id,
            email: user.email,
            phone: user.phone || null,
            name: user.name || "User",
            balance: user.balance || 0,
            status: "active" as const,
            favoriteStations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          logger.debug("[AuthProvider] InitializeAuth: Logging in user");
          login(unifiedUser);
        } else {
          logger.debug(
            "[AuthProvider] InitializeAuth: No user data yet, will wait for INITIAL_SESSION event",
          );
          // НЕ вызываем logout - просто ждем INITIAL_SESSION event
          // который придет с валидными данными
        }
      } catch (error) {
        logger.error("[AuthProvider] Error initializing auth:", error);
        setInitialized(true);
      } finally {
        // Всегда помечаем как инициализировано
        setInitialized(true);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (event, session) => {
      logger.debug("[AuthProvider] Auth state change:", {
        event,
        userId: session?.user?.id,
        hasSession: !!session,
      });

      if (event === "SIGNED_IN" && session?.user) {
        logger.debug("[AuthProvider] SIGNED_IN event, fetching user data...");

        // Retry механизм для устранения race condition
        let user = await authService.getCurrentUser();
        let retries = 0;
        const maxRetries = 3;

        while (!user && retries < maxRetries) {
          logger.debug(
            `[AuthProvider] SIGNED_IN: Retry ${retries + 1}/${maxRetries}...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 300)); // Ждем 300ms
          user = await authService.getCurrentUser();
          retries++;
        }

        logger.debug(
          "[AuthProvider] SIGNED_IN: Got user:",
          user ? user.id : "null",
        );

        if (user) {
          // Преобразуем Client в UnifiedUser
          const unifiedUser = {
            id: user.id,
            email: user.email,
            phone: user.phone || null,
            name: user.name || "User",
            balance: user.balance || 0,
            status: "active" as const,
            favoriteStations: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          logger.debug("[AuthProvider] SIGNED_IN: Logging in user");
          login(unifiedUser);
        } else {
          logger.warn(
            "[AuthProvider] SIGNED_IN: User data not found after retries, cannot login",
          );
        }
      } else if (event === "INITIAL_SESSION") {
        logger.debug("[AuthProvider] INITIAL_SESSION event");
        // INITIAL_SESSION может приходить с или без session
        if (session?.user) {
          logger.debug(
            "[AuthProvider] INITIAL_SESSION: Has session, fetching user data...",
          );
          const user = await authService.getCurrentUser();
          logger.debug(
            "[AuthProvider] INITIAL_SESSION: Got user:",
            user ? user.id : "null",
          );

          if (user) {
            const unifiedUser = {
              id: user.id,
              email: user.email,
              phone: user.phone || null,
              name: user.name || "User",
              balance: user.balance || 0,
              status: "active" as const,
              favoriteStations: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            logger.debug("[AuthProvider] INITIAL_SESSION: Logging in user");
            login(unifiedUser);
          } else {
            logger.warn(
              "[AuthProvider] INITIAL_SESSION: Session exists but user data not found",
            );
          }
        } else {
          logger.debug("[AuthProvider] INITIAL_SESSION: No session");
        }
      } else if (event === "SIGNED_OUT") {
        logger.debug("[AuthProvider] SIGNED_OUT - clearing state");
        logout();
      } else if (event === "TOKEN_REFRESHED") {
        logger.debug("[AuthProvider] Token refreshed");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [login, logout, setInitialized]);

  return <>{children}</>;
}
