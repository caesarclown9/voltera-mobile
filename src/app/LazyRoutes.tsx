/**
 * Централизованное управление lazy-загрузкой роутов
 * с поддержкой prefetch и error boundaries
 */

import { lazy, type ComponentType } from "react";
import { logger } from "@/shared/utils/logger";

// Тип для lazy компонента с prefetch
interface LazyRoute {
  component: React.LazyExoticComponent<ComponentType>;
  prefetch: () => Promise<void>;
}

// Функция для создания lazy роута с prefetch
function createLazyRoute(
  importFn: () => Promise<{ default: ComponentType }>,
): LazyRoute {
  const LazyComponent = lazy(importFn);

  return {
    component: LazyComponent,
    prefetch: async () => {
      await importFn();
    },
  };
}

// Определяем все lazy роуты
export const routes = {
  // Основные страницы
  MapPage: createLazyRoute(() =>
    import("../pages/MapPage").then((m) => ({ default: m.MapPage })),
  ),

  MapHome: createLazyRoute(() => import("../pages/MapHome")),

  StationsList: createLazyRoute(() =>
    import("../pages/StationsList").then((m) => ({ default: m.StationsList })),
  ),

  // Страницы зарядки
  ChargingPage: createLazyRoute(() =>
    import("../pages/ChargingPage").then((m) => ({ default: m.ChargingPage })),
  ),

  ChargingProcessPage: createLazyRoute(() =>
    import("../pages/ChargingProcessPage").then((m) => ({
      default: m.ChargingProcessPage,
    })),
  ),

  ChargingCompletePage: createLazyRoute(() =>
    import("../pages/ChargingCompletePage").then((m) => ({
      default: m.ChargingCompletePage,
    })),
  ),

  // Авторизация
  Auth: createLazyRoute(() => import("../pages/Auth")),

  // Профиль и история
  ProfilePage: createLazyRoute(() =>
    import("../pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
  ),

  HistoryPage: createLazyRoute(() =>
    import("../pages/HistoryPage").then((m) => ({ default: m.HistoryPage })),
  ),

  // Добавляем отсутствующие страницы
  PaymentsPage: createLazyRoute(() => import("../pages/PaymentsPage")),

  BalancePage: createLazyRoute(() =>
    import("../pages/BalancePage").then((m) => ({ default: m.BalancePage })),
  ),

  SettingsPage: createLazyRoute(() =>
    import("../pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
  ),

  AboutPage: createLazyRoute(() =>
    import("../pages/AboutPage").then((m) => ({ default: m.AboutPage })),
  ),

  SupportPage: createLazyRoute(() =>
    import("../pages/SupportPage").then((m) => ({ default: m.SupportPage })),
  ),

  NotificationsSettingsPage: createLazyRoute(() =>
    import("../pages/NotificationsSettingsPage").then((m) => ({
      default: m.NotificationsSettingsPage,
    })),
  ),

  // Админ-панель
  AdminDashboard: createLazyRoute(() =>
    import("../features/admin/pages/AdminDashboard").then((m) => ({
      default: m.AdminDashboard,
    })),
  ),

  AdminStations: createLazyRoute(() =>
    import("../features/admin/pages/AdminStationsPage").then((m) => ({
      default: m.AdminStationsPage,
    })),
  ),

  AdminStationDetail: createLazyRoute(() =>
    import("../features/admin/pages/AdminStationDetailPage").then((m) => ({
      default: m.AdminStationDetailPage,
    })),
  ),

  AdminSessions: createLazyRoute(() =>
    import("../features/admin/pages/AdminSessionsPage").then((m) => ({
      default: m.AdminSessionsPage,
    })),
  ),

  AdminClients: createLazyRoute(() =>
    import("../features/admin/pages/AdminClientsPage").then((m) => ({
      default: m.AdminClientsPage,
    })),
  ),
};

// Функция для prefetch критичных роутов
export const prefetchCriticalRoutes = async () => {
  try {
    // Prefetch основные страницы при загрузке приложения
    await Promise.all([
      routes.MapPage.prefetch(),
      routes.StationsList.prefetch(),
      routes.ChargingPage.prefetch(),
    ]);
  } catch (error) {
    logger.error("Failed to prefetch critical routes:", error);
  }
};

// Функция для prefetch роутов при наведении
export const prefetchRoute = async (routeName: keyof typeof routes) => {
  try {
    const route = routes[routeName];
    if (route) {
      await route.prefetch();
    }
  } catch (error) {
    logger.error(`Failed to prefetch route ${routeName}:`, error);
  }
};

// Функция для prefetch связанных роутов
export const prefetchRelatedRoutes = async (currentRoute: string) => {
  const relatedRoutes: Record<string, (keyof typeof routes)[]> = {
    "/": ["StationsList", "ChargingPage"],
    "/stations": ["ChargingPage", "MapPage"],
    "/charging": ["ChargingProcessPage"],
    "/profile": ["HistoryPage", "BalancePage", "SettingsPage", "AboutPage"],
    "/history": ["ProfilePage"],
  };

  const toPrefetch = relatedRoutes[currentRoute];
  if (toPrefetch) {
    await Promise.all(toPrefetch.map((routeName) => prefetchRoute(routeName)));
  }
};

// Hook для использования prefetch при взаимодействии
export const usePrefetch = () => {
  const handleMouseEnter = (routeName: keyof typeof routes) => {
    // Задержка перед prefetch чтобы избежать лишних загрузок
    const timer = setTimeout(() => {
      prefetchRoute(routeName);
    }, 200);

    return () => clearTimeout(timer);
  };

  return { handleMouseEnter, prefetchRoute };
};
