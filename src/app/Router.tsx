import { Suspense, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { BottomNavigation } from "../shared/components/BottomNavigation";
import { OfflineIndicator } from "../shared/components/OfflineIndicator";
import {
  routes,
  prefetchCriticalRoutes,
  prefetchRelatedRoutes,
} from "./LazyRoutes";

export function Router() {
  const location = useLocation();

  // Prefetch критичных роутов при загрузке приложения
  useEffect(() => {
    prefetchCriticalRoutes();
  }, []);

  // Prefetch связанных роутов при изменении локации
  useEffect(() => {
    prefetchRelatedRoutes(location.pathname);
  }, [location.pathname]);

  return (
    <>
      {/* Offline Status Indicator */}
      <OfflineIndicator />

      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<routes.MapPage.component />} />
          <Route path="/map" element={<routes.MapHome.component />} />
          <Route path="/auth/*" element={<routes.Auth.component />} />
          <Route path="/stations" element={<routes.StationsList.component />} />
          <Route path="/charging" element={<routes.ChargingPage.component />} />
          <Route
            path="/charging/:stationId"
            element={<routes.ChargingPage.component />}
          />
          <Route
            path="/charging-process/:sessionId"
            element={<routes.ChargingProcessPage.component />}
          />
          <Route
            path="/charging-complete/:sessionId"
            element={<routes.ChargingCompletePage.component />}
          />
          <Route
            path="/favorites"
            element={<routes.StationsList.component />}
          />
          <Route path="/profile" element={<routes.ProfilePage.component />} />
          <Route path="/history" element={<routes.HistoryPage.component />} />
          <Route path="/payments" element={<routes.PaymentsPage.component />} />
          <Route path="/about" element={<routes.AboutPage.component />} />
        </Routes>
      </Suspense>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </>
  );
}
