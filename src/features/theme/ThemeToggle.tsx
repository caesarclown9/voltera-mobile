/**
 * ThemeToggle - компонент переключения темы
 */

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  /** Показывать метки для каждой опции */
  showLabels?: boolean;
  /** Компактный режим (только иконки) */
  compact?: boolean;
}

export function ThemeToggle({
  showLabels = true,
  compact = false,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light" as const, icon: Sun, label: "Светлая" },
    { value: "dark" as const, icon: Moon, label: "Тёмная" },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;

          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`p-2 rounded-md transition-colors ${
                isActive
                  ? "bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              title={option.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showLabels && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Тема оформления
        </p>
      )}
      <div className="flex gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;

          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
                isActive
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              {showLabels && <span className="text-sm">{option.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Простой переключатель light/dark (без системной темы)
 */
export function ThemeSwitch() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title={
        resolvedTheme === "light"
          ? "Включить тёмную тему"
          : "Включить светлую тему"
      }
    >
      {resolvedTheme === "light" ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  );
}
