/**
 * Hook для управления состоянием onboarding
 */

import { useState, useEffect, useCallback } from "react";

const ONBOARDING_KEY = "voltera_onboarding_completed";

export function useOnboarding() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем состояние при монтировании
  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      setIsOnboardingComplete(completed === "true");
    } catch {
      // В случае ошибки считаем что onboarding пройден
      setIsOnboardingComplete(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Помечаем onboarding как завершенный
  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
      setIsOnboardingComplete(true);
    } catch {
      // Игнорируем ошибки записи
      setIsOnboardingComplete(true);
    }
  }, []);

  // Сброс onboarding (для тестирования)
  const resetOnboarding = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_KEY);
      setIsOnboardingComplete(false);
    } catch {
      // Игнорируем ошибки
    }
  }, []);

  return {
    /** Завершен ли onboarding */
    isOnboardingComplete,
    /** Загружается ли состояние */
    isLoading,
    /** Нужно ли показать onboarding */
    shouldShowOnboarding: !isLoading && isOnboardingComplete === false,
    /** Пометить onboarding как завершенный */
    completeOnboarding,
    /** Сбросить onboarding (для тестирования) */
    resetOnboarding,
  };
}
