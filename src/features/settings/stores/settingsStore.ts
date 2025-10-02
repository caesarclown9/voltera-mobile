import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  // Настройки приложения
  notifications: boolean;
  darkMode: boolean;
  language: 'ru' | 'en' | 'ky';

  // Actions
  setNotifications: (enabled: boolean) => void;
  setDarkMode: (enabled: boolean) => void;
  setLanguage: (lang: 'ru' | 'en' | 'ky') => void;
  resetSettings: () => void;
}

const defaultSettings = {
  notifications: true,
  darkMode: false,
  language: 'ru' as const,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setNotifications: (enabled) =>
        set({ notifications: enabled }),

      setDarkMode: (enabled) =>
        set({ darkMode: enabled }),

      setLanguage: (language) =>
        set({ language }),

      resetSettings: () =>
        set(defaultSettings),
    }),
    {
      name: 'app-settings',
    }
  )
);