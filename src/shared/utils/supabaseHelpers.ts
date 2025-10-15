import { supabase } from "../config/supabase";

// Проверка валидности Supabase конфигурации
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && !url.includes("dummy"));
};

// Wrapper для Supabase запросов с timeout
export async function supabaseWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 5000,
  fallback?: T,
): Promise<T> {
  // Если Supabase не сконфигурирован, сразу возвращаем fallback
  if (!isSupabaseConfigured()) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error("Supabase not configured");
  }

  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs),
    ),
  ]).catch((error) => {
    // В dev режиме не логируем timeout'ы - они ожидаемы
    if (import.meta.env.PROD) {
      console.warn("Supabase request failed:", error.message);
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  });
}

export { supabase };
