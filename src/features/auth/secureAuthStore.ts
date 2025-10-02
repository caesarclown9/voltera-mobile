/**
 * Улучшенный auth store с повышенной безопасностью
 * Временное решение до миграции на HttpOnly cookies
 */

import { create } from 'zustand';
import type { UnifiedUser } from './types/unified.types';
import { SecureTokenStorage, SecurityMonitor, XSSDetector } from '../../utils/tokenSecurity';
import { supabase } from '../../shared/config/supabase';

interface SecureAuthState {
  user: UnifiedUser | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  lockoutTimeRemaining: number;

  // Actions
  login: (user: UnifiedUser, token?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
  unlockAccount: () => void;
}

export const useSecureAuthStore = create<SecureAuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLocked: false,
  lockoutTimeRemaining: 0,

  login: async (user: UnifiedUser, token?: string) => {
    // Проверяем блокировку
    if (SecurityMonitor.isLocked()) {
      set({
        isLocked: true,
        lockoutTimeRemaining: SecurityMonitor.getLockoutTimeRemaining()
      });
      throw new Error('Account temporarily locked due to multiple failed attempts');
    }

    // Санитизация данных пользователя
    const sanitizedUser: UnifiedUser = {
      ...user,
      name: XSSDetector.sanitize(user.name),
      email: XSSDetector.sanitize(user.email),
      phone: user.phone ? XSSDetector.sanitize(user.phone) : null,
    };

    // Сохраняем токен безопасно
    if (token) {
      SecureTokenStorage.setToken(token);
    }

    SecurityMonitor.reset(); // Сбрасываем счетчик при успешном входе

    set({
      user: sanitizedUser,
      isAuthenticated: true,
      isLocked: false,
      lockoutTimeRemaining: 0
    });
  },

  logout: async () => {
    // Очищаем токен
    SecureTokenStorage.clearToken();

    // Выходим из Supabase
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Supabase signout error:', error);
    }

    set({
      user: null,
      isAuthenticated: false,
      isLocked: false,
      lockoutTimeRemaining: 0
    });
  },

  checkAuth: async () => {
    try {
      // Проверяем наличие и валидность токена
      const token = SecureTokenStorage.getToken();

      if (!token || SecureTokenStorage.isTokenExpired()) {
        await get().logout();
        return;
      }

      // Проверяем сессию Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        await get().logout();
        return;
      }

      // Получаем данные пользователя
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Получаем данные из таблицы clients
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('id', user.id)
          .single();

        if (clientData) {
          const unifiedUser: UnifiedUser = {
            id: clientData.id,
            email: XSSDetector.sanitize(clientData.email),
            phone: clientData.phone ? XSSDetector.sanitize(clientData.phone) : null,
            name: XSSDetector.sanitize(clientData.name || 'User'),
            balance: clientData.balance || 0,
            status: 'active' as const,
            favoriteStations: [],
            createdAt: clientData.created_at,
            updatedAt: new Date().toISOString()
          };

          set({
            user: unifiedUser,
            isAuthenticated: true
          });

          // Обновляем время жизни токена при активности
          SecureTokenStorage.refreshTokenExpiry();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await get().logout();
    }
  },

  refreshToken: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error || !session) {
        await get().logout();
        return;
      }

      // Сохраняем новый токен
      if (session.access_token) {
        SecureTokenStorage.setToken(session.access_token);
      }

      // Обновляем данные пользователя
      await get().checkAuth();
    } catch (error) {
      console.error('Token refresh failed:', error);
      await get().logout();
    }
  },

  unlockAccount: () => {
    if (SecurityMonitor.getLockoutTimeRemaining() === 0) {
      SecurityMonitor.reset();
      set({
        isLocked: false,
        lockoutTimeRemaining: 0
      });
    }
  }
}));

/**
 * Hook для автоматической проверки и обновления токенов
 */
export const useTokenAutoRefresh = () => {
  const { checkAuth, refreshToken } = useSecureAuthStore();

  // Проверяем auth при монтировании
  useEffect(() => {
    checkAuth();

    // Проверяем токен каждую минуту
    const interval = setInterval(() => {
      if (SecureTokenStorage.isTokenExpired()) {
        refreshToken();
      } else {
        // Обновляем время жизни при активности
        SecureTokenStorage.refreshTokenExpiry();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [checkAuth, refreshToken]);
};

/**
 * Hook для обработки неудачных попыток входа
 */
export const useAuthAttemptMonitor = () => {
  const { isLocked, lockoutTimeRemaining, unlockAccount } = useSecureAuthStore();

  const recordFailedAttempt = useCallback(() => {
    SecurityMonitor.recordFailedAttempt();

    if (SecurityMonitor.isLocked()) {
      useSecureAuthStore.setState({
        isLocked: true,
        lockoutTimeRemaining: SecurityMonitor.getLockoutTimeRemaining()
      });
    }
  }, []);

  // Таймер для автоматической разблокировки
  useEffect(() => {
    if (!isLocked) return;

    const timer = setTimeout(() => {
      unlockAccount();
    }, lockoutTimeRemaining);

    return () => clearTimeout(timer);
  }, [isLocked, lockoutTimeRemaining, unlockAccount]);

  return {
    isLocked,
    lockoutTimeRemaining,
    recordFailedAttempt
  };
};

// Добавляем необходимые импорты в начало файла
import { useEffect, useCallback } from 'react';