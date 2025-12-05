/**
 * ThemeProvider - управление темой приложения (light/dark/system)
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { storage } from "@/shared/utils/storage";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = storage.get<string>(THEME_STORAGE_KEY);
    // Если сохранена старая "system" тема или нет сохраненной темы, используем light
    if (!stored || stored === "system") {
      return defaultTheme;
    }
    // Проверяем что сохраненное значение валидно
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return defaultTheme;
  });

  const resolvedTheme = theme; // Теперь theme всегда light или dark

  // Обновляем resolved theme при изменении theme
  useEffect(() => {
    // Сохраняем тему при изменении
  }, [theme]);

  // Применяем класс к document
  useEffect(() => {
    const root = document.documentElement;

    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    storage.set(THEME_STORAGE_KEY, newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
