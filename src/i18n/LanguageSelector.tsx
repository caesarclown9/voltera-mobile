/**
 * LanguageSelector - компонент выбора языка
 */

import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { availableLanguages } from "./index";

interface LanguageSelectorProps {
  /** Компактный режим (только флаги) */
  compact?: boolean;
  /** Показать метку */
  showLabel?: boolean;
}

export function LanguageSelector({
  compact = false,
  showLabel = true,
}: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.split("-")[0] || "ru";

  const handleChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    // Сохраняем в localStorage (i18next-browser-languagedetector использует этот ключ)
    localStorage.setItem("voltera_language", langCode);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {availableLanguages.map((lang) => {
          const isActive = currentLang === lang.code;

          return (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`px-2 py-1.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-white dark:bg-gray-700 shadow-sm font-medium text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title={lang.name}
            >
              {lang.code.toUpperCase()}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Язык / Language
        </p>
      )}
      <div className="flex gap-2">
        {availableLanguages.map((lang) => {
          const isActive = currentLang === lang.code;

          return (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
                isActive
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="text-sm">{lang.code.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Компактный переключатель языка для хедера
 */
export function LanguageSwitch() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.split("-")[0] || "ru";

  // Циклический переключатель
  const nextLang = () => {
    const currentIndex = availableLanguages.findIndex(
      (l) => l.code === currentLang,
    );
    const nextIndex = (currentIndex + 1) % availableLanguages.length;
    const nextLanguage = availableLanguages[nextIndex];
    if (nextLanguage) {
      i18n.changeLanguage(nextLanguage.code);
      localStorage.setItem("voltera_language", nextLanguage.code);
    }
  };

  const current = availableLanguages.find((l) => l.code === currentLang);

  return (
    <button
      onClick={nextLang}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
      title="Сменить язык"
    >
      <Globe className="w-4 h-4" />
      <span className="text-sm font-medium">{current?.code.toUpperCase()}</span>
    </button>
  );
}
