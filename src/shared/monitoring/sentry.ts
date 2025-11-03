/**
 * Sentry Error Monitoring - Production Error Tracking
 *
 * ТЕКУЩИЙ СТАТУС: STUB (заглушка готова к активации)
 *
 * ДЛЯ АКТИВАЦИИ:
 * 1. npm install @sentry/react
 * 2. Раскомментировать импорты и код ниже
 * 3. Добавить VITE_SENTRY_DSN в .env
 * 4. Добавить Sentry.ErrorBoundary в App.tsx
 *
 * ПРЕИМУЩЕСТВА:
 * - Real-time error tracking в production
 * - Stack traces и контекст ошибок
 * - User session replays
 * - Performance monitoring
 * - Release tracking
 *
 * @module shared/monitoring/sentry
 */

import { logger } from "../utils/logger";

// ============= STUB: РАСКОММЕНТИРОВАТЬ ПОСЛЕ УСТАНОВКИ =============
// import * as Sentry from "@sentry/react";

/**
 * Конфигурация Sentry
 */
const SENTRY_CONFIG = {
  // DSN из Sentry dashboard (добавить в .env)
  dsn: import.meta.env.VITE_SENTRY_DSN as string | undefined,

  // Окружение
  environment: import.meta.env.MODE || "development",

  // Версия приложения (для tracking релизов)
  release: `evpower-mobile@${import.meta.env["VITE_APP_VERSION"] || "1.0.0"}`,

  // Sample rate (1.0 = 100% ошибок отправляется)
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

  // Replay sample rate (для session replays)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Игнорируемые ошибки
  ignoreErrors: [
    // Browser extensions
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",

    // Network errors (не баги приложения)
    "Network request failed",
    "NetworkError",
    "Failed to fetch",

    // User cancellations
    "AbortError",
    "The operation was aborted",
  ],

  // Sanitize sensitive data
  beforeSend: (event: unknown) => {
    // В production можно фильтровать sensitive данные
    if (import.meta.env.DEV) {
      logger.debug("[Sentry] Event captured:", event);
    }
    return event;
  },
};

/**
 * Инициализирует Sentry monitoring
 *
 * ВАЖНО: Вызывать ОДИН раз при старте приложения (в main.tsx)
 */
export function initSentry(): void {
  // Проверяем что Sentry включен и есть DSN
  if (!SENTRY_CONFIG.dsn) {
    logger.info(
      "[Sentry] Monitoring disabled (no DSN). Add VITE_SENTRY_DSN to .env to enable.",
    );
    return;
  }

  // STUB: Заглушка для безопасного деплоя
  // Раскомментировать после установки @sentry/react:
  /*
  try {
    Sentry.init({
      dsn: SENTRY_CONFIG.dsn,
      environment: SENTRY_CONFIG.environment,
      release: SENTRY_CONFIG.release,
      integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: SENTRY_CONFIG.tracesSampleRate,
      replaysSessionSampleRate: SENTRY_CONFIG.replaysSessionSampleRate,
      replaysOnErrorSampleRate: SENTRY_CONFIG.replaysOnErrorSampleRate,
      ignoreErrors: SENTRY_CONFIG.ignoreErrors,
      beforeSend: SENTRY_CONFIG.beforeSend as Sentry.EventProcessor,
    });

    logger.info("[Sentry] Monitoring initialized successfully");
  } catch (error) {
    logger.error("[Sentry] Failed to initialize:", error);
  }
  */

  // Временная заглушка
  logger.info(
    "[Sentry] STUB mode - monitoring ready but not active. Install @sentry/react to enable.",
  );
}

/**
 * Захватывает exception и отправляет в Sentry
 *
 * @example
 * ```typescript
 * try {
 *   await api.startCharging(stationId);
 * } catch (error) {
 *   captureException(error, { tags: { feature: 'charging' } });
 *   throw error;
 * }
 * ```
 */
export function captureException(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id?: string; phone?: string };
  },
): void {
  // STUB: Раскомментировать после установки
  /*
  if (SENTRY_CONFIG.dsn) {
    Sentry.withScope((scope) => {
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      if (context?.extra) {
        scope.setExtras(context.extra);
      }
      if (context?.user) {
        scope.setUser(context.user);
      }

      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureException(new Error(String(error)));
      }
    });
  }
  */

  // Временная заглушка - логируем локально
  if (import.meta.env.DEV) {
    logger.error("[Sentry STUB] Exception would be captured:", {
      error,
      context,
    });
  }
}

/**
 * Захватывает сообщение (не ошибку) для отслеживания
 *
 * @example
 * ```typescript
 * captureMessage('User completed charging session', 'info', {
 *   extra: { sessionId: '123', duration: 3600 }
 * });
 * ```
 */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "log" | "info" | "debug" = "info",
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  },
): void {
  // STUB: Раскомментировать после установки
  /*
  if (SENTRY_CONFIG.dsn) {
    Sentry.withScope((scope) => {
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      if (context?.extra) {
        scope.setExtras(context.extra);
      }
      Sentry.captureMessage(message, level);
    });
  }
  */

  // Временная заглушка
  if (import.meta.env.DEV) {
    logger.debug("[Sentry STUB] Message would be captured:", {
      message,
      level,
      context,
    });
  }
}

/**
 * Устанавливает пользователя для контекста ошибок
 *
 * @example
 * ```typescript
 * setUser({ id: user.id, phone: user.phone });
 * ```
 */
export function setUser(
  user: {
    id?: string;
    phone?: string;
    email?: string;
  } | null,
): void {
  // STUB: Раскомментировать после установки
  /*
  if (SENTRY_CONFIG.dsn) {
    Sentry.setUser(user);
  }
  */

  if (import.meta.env.DEV) {
    logger.debug("[Sentry STUB] User would be set:", user);
  }
}

/**
 * Добавляет breadcrumb (след) для отслеживания пути к ошибке
 *
 * @example
 * ```typescript
 * addBreadcrumb({
 *   category: 'charging',
 *   message: 'User started charging session',
 *   level: 'info',
 *   data: { stationId: '123', connectorId: '1' }
 * });
 * ```
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: "fatal" | "error" | "warning" | "log" | "info" | "debug";
  data?: Record<string, unknown>;
}): void {
  // STUB: Раскомментировать после установки
  /*
  if (SENTRY_CONFIG.dsn) {
    Sentry.addBreadcrumb(breadcrumb);
  }
  */

  if (import.meta.env.DEV) {
    logger.debug("[Sentry STUB] Breadcrumb would be added:", breadcrumb);
  }
}

/**
 * Тегирует транзакцию (для performance monitoring)
 */
export function setTag(key: string, value: string): void {
  // STUB: Раскомментировать после установки
  /*
  if (SENTRY_CONFIG.dsn) {
    Sentry.setTag(key, value);
  }
  */

  if (import.meta.env.DEV) {
    logger.debug(`[Sentry STUB] Tag would be set: ${key}=${value}`);
  }
}

/**
 * React Error Boundary компонент для Sentry
 *
 * STUB: После установки @sentry/react использовать так:
 *
 * @example
 * ```typescript
 * import { SentryErrorBoundary } from '@/shared/monitoring/sentry';
 *
 * <SentryErrorBoundary fallback={<ErrorFallback />}>
 *   <App />
 * </SentryErrorBoundary>
 * ```
 */
export const SentryErrorBoundary = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // STUB: Раскомментировать после установки
  // return <Sentry.ErrorBoundary fallback={<div>Error occurred</div>}>{children}</Sentry.ErrorBoundary>;

  // Временная заглушка - просто рендерим детей
  return children;
};

/**
 * Пример интеграции с существующими error handlers
 *
 * ИСПОЛЬЗОВАНИЕ в API слое:
 *
 * @example
 * ```typescript
 * import { captureException, addBreadcrumb } from '@/shared/monitoring/sentry';
 * import { handleApiError } from '@/shared/errors/apiErrors';
 *
 * try {
 *   addBreadcrumb({
 *     category: 'api',
 *     message: 'Starting charging session',
 *     data: { stationId }
 *   });
 *
 *   const result = await api.startCharging(stationId);
 *   return result;
 * } catch (error) {
 *   captureException(error, {
 *     tags: { feature: 'charging', station: stationId },
 *     extra: { userAction: 'start_charging' }
 *   });
 *
 *   const message = handleApiError(error);
 *   toast.error(message);
 *   throw error;
 * }
 * ```
 */
