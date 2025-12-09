/**
 * Hook для определения типа пользователя (клиент или оператор)
 *
 * Проверяет наличие пользователя в таблице users (операторы/админы)
 * Если не найден - значит это обычный клиент из таблицы clients
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/config/supabase";
import { useAuthStore } from "../store";
import type {
  UserType,
  UserTypeInfo,
  OperatorRole,
  OperatorUser,
} from "../types/userRole.types";
import { logger } from "@/shared/utils/logger";

/**
 * Получает тип пользователя из Supabase
 */
async function fetchUserType(userId: string): Promise<UserTypeInfo> {
  try {
    // Проверяем, есть ли пользователь в таблице users (операторы/админы)
    // Используем maybeSingle() чтобы избежать HTTP 406 ошибки при отсутствии записи
    const { data: operatorData, error } = await supabase
      .from("users")
      .select("id, email, role, is_active, admin_id, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      logger.error("[useUserType] Error fetching user type:", error);
      // По умолчанию считаем клиентом
      return { type: "client" };
    }

    // Пользователь не найден в users — это обычный клиент
    if (!operatorData) {
      logger.debug("[useUserType] User is a client (not found in users table)");
      return { type: "client" };
    }

    if (operatorData && operatorData.is_active) {
      logger.debug("[useUserType] User is an operator:", operatorData.role);
      return {
        type: "operator",
        role: operatorData.role as OperatorRole,
        operatorData: operatorData as OperatorUser,
        adminId: operatorData.admin_id,
      };
    }

    // Оператор найден, но не активен
    if (operatorData && !operatorData.is_active) {
      logger.debug("[useUserType] Operator is inactive, treating as client");
      return { type: "client" };
    }

    return { type: "client" };
  } catch (error) {
    logger.error("[useUserType] Exception fetching user type:", error);
    return { type: "client" };
  }
}

/**
 * Hook для получения типа пользователя
 */
export function useUserType() {
  const { user, isAuthenticated } = useAuthStore();

  const query = useQuery({
    queryKey: ["userType", user?.id],
    queryFn: () => fetchUserType(user!.id),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 30 * 60 * 1000, // 30 минут (gcTime заменяет cacheTime в v5)
    retry: 1,
  });

  const userTypeInfo = query.data ?? { type: "client" as UserType };

  return {
    /** Тип пользователя (client | operator) */
    userType: userTypeInfo.type,
    /** Роль оператора (только для операторов) */
    role: userTypeInfo.role,
    /** Данные оператора */
    operatorData: userTypeInfo.operatorData,
    /** ID администратора */
    adminId: userTypeInfo.adminId,
    /** Является ли пользователь клиентом */
    isClient: userTypeInfo.type === "client",
    /** Является ли пользователь оператором */
    isOperator: userTypeInfo.type === "operator",
    /** Является ли пользователь админом */
    isAdmin:
      userTypeInfo.type === "operator" &&
      (userTypeInfo.role === "admin" || userTypeInfo.role === "superadmin"),
    /** Является ли пользователь суперадмином */
    isSuperAdmin:
      userTypeInfo.type === "operator" && userTypeInfo.role === "superadmin",
    /** Загружается ли информация */
    isLoading: query.isLoading,
    /** Ошибка загрузки */
    error: query.error,
    /** Обновить информацию о типе */
    refetch: query.refetch,
  };
}

/**
 * Hook для проверки конкретных разрешений
 */
export function usePermissions() {
  const { role, isOperator } = useUserType();

  return {
    /** Может управлять станциями */
    canManageStations: isOperator,
    /** Может управлять пользователями */
    canManageUsers: role === "superadmin",
    /** Может управлять операторами */
    canManageOperators: role === "admin" || role === "superadmin",
    /** Может просматривать аналитику */
    canViewAnalytics: isOperator,
    /** Может управлять тарифами */
    canManagePricing: role === "admin" || role === "superadmin",
  };
}
