import { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { QueryClient, type Query } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Router } from "./app/Router";
import { Providers } from "./app/Providers";
import { ErrorBoundary } from "./shared/components/ErrorBoundary";
import { AuthModal } from "./features/auth/components/AuthModal";
import { ToastContainer } from "./shared/hooks/useToast";
import { createIDBPersister, shouldPersistQuery } from "./lib/queryPersister";
import { versionManager } from "./lib/versionManager";
import { LoadingScreen } from "./shared/components/LoadingScreen";
import { logger } from "./shared/utils/logger";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes for reference data
      gcTime: 1000 * 60 * 60, // 1 hour garbage collection
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Don't retry on certain errors
        const status =
          error instanceof Error && "status" in error
            ? (error as Error & { status: number }).status
            : undefined;
        if (status === 404 || status === 401) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
    },
  },
});

const persister = createIDBPersister();

function App() {
  const [isVersionCheckComplete, setIsVersionCheckComplete] = useState(false);

  // Проверка версии и миграции при старте приложения
  useEffect(() => {
    const initializeVersion = async () => {
      try {
        if (!import.meta.env.PROD)
          logger.debug("[App] Starting version check...");
        const result = await versionManager.initialize();

        if (!result.success) {
          if (!import.meta.env.PROD)
            logger.error("[App] Version migration errors:", result.errors);
          // Даже при ошибках продолжаем работу - миграции не критичны
        }

        if (result.migrationsRun.length > 0) {
          if (!import.meta.env.PROD)
            logger.info("[App] Migrations completed:", result.migrationsRun);
          // Показываем пользователю что приложение обновилось
          if (import.meta.env.PROD) {
            // В production можно показать toast или уведомление
            logger.info(
              "[App] App updated to version:",
              versionManager.getVersionInfo().version,
            );
          }
        }

        setIsVersionCheckComplete(true);
      } catch (error) {
        if (!import.meta.env.PROD)
          logger.error("[App] Version check failed:", error);
        // Продолжаем работу даже при ошибке
        setIsVersionCheckComplete(true);
      }
    };

    initializeVersion();
  }, []);

  // Показываем loading screen пока идет проверка версии
  if (!isVersionCheckComplete) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
          dehydrateOptions: {
            shouldDehydrateQuery: (query: Query) => {
              // Only persist queries that match our criteria
              return (
                query.state.status === "success" &&
                shouldPersistQuery(query.queryKey)
              );
            },
          },
        }}
      >
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Providers>
            <div className="min-h-screen bg-gray-50">
              <Router />
              {/** Не показываем модалку авторизации на странице /auth, чтобы не дублировать форму */}
              <AuthModalGate />
              <ToastContainer />
            </div>
          </Providers>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

function AuthModalGate() {
  const location = useLocation();
  if (location.pathname.startsWith("/auth")) {
    return null;
  }
  // На главной всегда показываем приветственную модалку (даже если ранее пропускали)
  // Сбрасываем флаг skip, чтобы модалка отобразилась
  if (location.pathname === "/") {
    try {
      localStorage.removeItem("skipped_auth");
    } catch {
      // Ignore storage errors
    }
    try {
      sessionStorage.removeItem("suppress_auth_modal_once");
    } catch {
      // Ignore storage errors
    }
  }
  const params = new URLSearchParams(location.search);
  const forceAuth = params.get("auth") === "required";
  return (
    <AuthModal
      isOpen={forceAuth || undefined}
      requireAuth={forceAuth}
      allowSkip={!forceAuth}
      onClose={undefined}
    />
  );
}
