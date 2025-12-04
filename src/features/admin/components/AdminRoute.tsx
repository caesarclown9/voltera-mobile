/**
 * Защищенный маршрут для операторов и администраторов
 * Перенаправляет на главную, если пользователь не оператор
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuthStatus } from "@/features/auth/hooks/useAuth";
import { useUserType } from "@/features/auth/hooks/useUserType";
import { Loader2 } from "lucide-react";
import type { OperatorRole } from "@/features/auth/types/userRole.types";

interface AdminRouteProps {
  children: React.ReactNode;
  /** Минимальная требуемая роль (по умолчанию любой оператор) */
  requiredRole?: OperatorRole[];
}

export function AdminRoute({ children, requiredRole }: AdminRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuthStatus();
  const { isOperator, role, isLoading: userTypeLoading } = useUserType();

  // Показываем загрузку пока проверяем авторизацию
  if (authLoading || userTypeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
          <p className="text-sm text-gray-500">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  // Не авторизован - перенаправляем на страницу входа
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Не оператор - перенаправляем на главную
  if (!isOperator) {
    return <Navigate to="/" replace />;
  }

  // Проверяем требуемую роль
  if (requiredRole && role && !requiredRole.includes(role)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
