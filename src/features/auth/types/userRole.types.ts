/**
 * Типы ролей пользователей
 *
 * Система поддерживает два типа пользователей:
 * 1. Клиенты (clients) - обычные пользователи, заряжающие EV
 * 2. Операторы/Админы (users) - управляют станциями и системой
 */

/**
 * Тип пользователя в системе
 */
export type UserType = 'client' | 'operator';

/**
 * Роли для операторов/админов (из таблицы users)
 */
export type OperatorRole = 'operator' | 'admin' | 'superadmin';

/**
 * Данные оператора из таблицы users
 */
export interface OperatorUser {
  id: string;
  email: string;
  role: OperatorRole;
  is_active: boolean;
  admin_id?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Расширенная информация о типе пользователя
 */
export interface UserTypeInfo {
  /** Тип пользователя */
  type: UserType;
  /** Роль оператора (только для type === 'operator') */
  role?: OperatorRole;
  /** Данные оператора (только для type === 'operator') */
  operatorData?: OperatorUser;
  /** ID администратора, к которому привязан оператор */
  adminId?: string | null;
}

/**
 * Проверка прав доступа по роли
 */
export const rolePermissions = {
  /** Оператор - может управлять назначенными станциями */
  operator: {
    canManageStations: true,
    canManageUsers: false,
    canManageOperators: false,
    canViewAnalytics: true,
    canManagePricing: false,
  },
  /** Админ - может управлять станциями и операторами */
  admin: {
    canManageStations: true,
    canManageUsers: false,
    canManageOperators: true,
    canViewAnalytics: true,
    canManagePricing: true,
  },
  /** Суперадмин - полный доступ */
  superadmin: {
    canManageStations: true,
    canManageUsers: true,
    canManageOperators: true,
    canViewAnalytics: true,
    canManagePricing: true,
  },
} as const;

/**
 * Проверка наличия определенного разрешения
 */
export function hasPermission(
  role: OperatorRole | undefined,
  permission: keyof typeof rolePermissions.operator
): boolean {
  if (!role) return false;
  return rolePermissions[role]?.[permission] ?? false;
}
