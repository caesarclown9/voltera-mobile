/**
 * i18n configuration - интернационализация приложения
 *
 * Поддерживаемые языки:
 * - ru: Русский (по умолчанию)
 * - ky: Кыргызский
 * - en: English
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ru from "./locales/ru.json";
import ky from "./locales/ky.json";
import en from "./locales/en.json";

const resources = {
  ru: { translation: ru },
  ky: { translation: ky },
  en: { translation: en },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "ru",
    supportedLngs: ["ru", "ky", "en"],

    detection: {
      // Порядок определения языка
      order: ["localStorage", "navigator", "htmlTag"],
      // Ключ в localStorage
      lookupLocalStorage: "voltera_language",
      // Кэшировать выбор пользователя
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false, // React уже экранирует
    },

    react: {
      useSuspense: false, // Для избежания проблем с SSR/hydration
    },
  });

export default i18n;

/**
 * Хелпер для смены языка
 */
export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
};

/**
 * Получить текущий язык
 */
export const getCurrentLanguage = () => i18n.language;

/**
 * Доступные языки
 */
export const availableLanguages = [
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ky", name: "Кыргызча", flag: "🇰🇬" },
  { code: "en", name: "English", flag: "🇬🇧" },
] as const;
