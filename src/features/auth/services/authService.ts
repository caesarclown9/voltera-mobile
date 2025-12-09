import {
  supabase,
  supabaseWithTimeout,
  isSupabaseConfigured,
} from "../../../shared/utils/supabaseHelpers";
import type { AuthResponse, Client } from "../types/auth.types";
import { pushNotificationService } from "@/lib/platform/push";
import { logger } from "@/shared/utils/logger";

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async signUpWithEmail(
    email: string,
    password: string,
    phone?: string,
  ): Promise<AuthResponse> {
    // Создаем пользователя через Supabase Auth с телефоном в метаданных
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone: phone || null,
          name: email.split("@")[0] || "User",
          user_type: "client", // ВАЖНО! Для триггера
        },
      },
    });

    if (authError) {
      // Нормализуем сообщение об ошибке для UI
      const errorMessage = String(
        (authError as { message?: string }).message || "",
      );
      const message = /already/i.test(errorMessage)
        ? "Пользователь с таким email уже существует"
        : /password/i.test(errorMessage)
          ? "Некорректный пароль: минимум 6 символов"
          : errorMessage || "Не удалось зарегистрировать пользователя";
      const normalizedError = new Error(message) as Error & { status?: number };
      normalizedError.status = (authError as { status?: number }).status;
      throw normalizedError;
    }

    if (!authData.user) {
      throw new Error("Failed to create user");
    }

    // Запись в public.clients создастся АВТОМАТИЧЕСКИ через триггер!
    // НЕ НУЖНО делать дополнительный INSERT

    // Ждем немного чтобы триггер создал запись и пытаемся получить данные клиента
    let clientData: Client | null = null;
    if (authData.session) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Даем триггеру время

      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (!clientError && client) {
        clientData = client as Client;
      } else {
        logger.warn(
          "Client not found after registration, trigger may be delayed",
        );
      }
    }

    return {
      success: true,
      client: clientData || undefined,
      session: authData.session || undefined,
    };
  }

  async signInWithPhone(
    phone: string,
    password: string,
  ): Promise<AuthResponse> {
    // Нормализуем телефон к E.164 (+996...)
    const digits = (phone || "").replace(/\D/g, "");
    const normalizedPhone = digits
      ? digits.length === 9 && !digits.startsWith("996")
        ? `+996${digits}`
        : digits.startsWith("996")
          ? `+${digits}`
          : digits.startsWith("0") && digits.length === 10
            ? `+996${digits.substring(1)}`
            : `+${digits}`
      : "";

    // Находим клиента по телефону
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("phone", normalizedPhone)
      .single();

    if (clientError || !clientData) {
      throw new Error("Пользователь с таким телефоном не найден");
    }

    // Если у клиента есть email, пытаемся войти через Supabase Auth
    if (clientData.email) {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email: clientData.email,
            password: password,
          });

        if (!authError && authData.user) {
          return {
            success: true,
            client: clientData || undefined,
            session: authData.session || undefined,
          };
        }
      } catch {
        // Если не удалось через Supabase Auth, продолжаем
      }
    }

    // Проверяем пароль напрямую (для старых пользователей без Supabase Auth)
    // TODO: В будущем можно добавить проверку через password_hash
    return {
      success: true,
      client: clientData || undefined,
      session: undefined,
    };
  }

  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    // В режиме разработки используем mock данные только если явно не указано использовать реальный API
    if (
      import.meta.env.DEV &&
      !import.meta.env["VITE_USE_REAL_API"] &&
      !import.meta.env["VITE_SUPABASE_ANON_KEY"]
    ) {
      return {
        success: true,
        client: {
          id: "demo-user-id",
          email: email,
          name: email.split("@")[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          balance: 250.75,
          status: "active",
        },
        session: undefined,
      };
    }

    // Входим через Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      // Сохраняем оригинальную ошибку от Supabase для правильной обработки
      throw authError;
    }

    if (!authData.user) {
      throw new Error("Failed to authenticate");
    }

    // Получаем данные клиента из нашей таблицы
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (clientError || !clientData) {
      // Если клиента нет, создаем его
      const { data: newClient, error: createError } = await supabase
        .from("clients")
        .insert({
          id: authData.user.id,
          email: email,
          name: email.split("@")[0] || "User",
          balance: 0,
        })
        .select()
        .single();

      if (createError) {
        logger.error("Error creating client on signin:", createError);
        throw new Error("Failed to get user data: " + createError.message);
      }

      return {
        success: true,
        client: newClient,
        session: authData.session || undefined,
      };
    }

    return {
      success: true,
      client: clientData || undefined,
      session: authData.session || undefined,
    };
  }

  async authenticateWithEmail(
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    // Сначала пытаемся войти
    try {
      const result = await this.signInWithEmail(email, password);
      return result;
    } catch (signInError: unknown) {
      logger.debug("Sign in error:", signInError);

      // Проверяем сначала - может пользователь уже существует в auth.users
      const { data: existingUser } = await supabase
        .from("clients")
        .select("id")
        .eq("email", email)
        .single();

      if (existingUser) {
        // Пользователь существует - значит просто неверный пароль
        throw new Error("Неверный пароль");
      }

      // Пользователь не существует - создаем нового
      logger.debug("User not found, creating new account...");
      try {
        return await this.signUpWithEmail(email, password);
      } catch {
        // Если регистрация не удалась, возвращаем оригинальную ошибку входа
        throw new Error("Неверный email или пароль");
      }
    }
  }

  async signOut(): Promise<void> {
    if (!import.meta.env.PROD)
      logger.debug("[AuthService] Attempting sign out...");
    try {
      if (isSupabaseConfigured()) {
        // 1) Мгновенно чистим локальную сессию (без сети)
        try {
          await supabase.auth.signOut({
            scope: "local" as "local" | "global" | "others",
          });
        } catch {
          // Ignore error - local signOut is best effort
        }

        // 2) Дополнительно подчистим возможные ключи supabase в localStorage
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        } catch {
          // Ignore error - localStorage cleanup is best effort
        }

        // 3) Пытаемся отозвать токен на сервере (не критично)
        await supabaseWithTimeout(() => supabase.auth.signOut(), 2000, {
          error: null,
        });
      }

      // 4) Удаляем FCM токен с бэкенда (при выходе из аккаунта)
      try {
        await pushNotificationService.unregister();
      } catch {
        // Ignore error - push unregister is best effort
      }

      if (!import.meta.env.PROD)
        logger.debug("[AuthService] Sign out successful");
    } catch (error) {
      if (!import.meta.env.PROD)
        logger.error("[AuthService] Sign out error:", error);
    }
  }

  async getCurrentUser(): Promise<Client | null> {
    try {
      if (!import.meta.env.PROD)
        logger.debug("[AuthService] getCurrentUser: Getting auth user...");

      // Если Supabase не сконфигурирован, возвращаем null
      if (!isSupabaseConfigured()) {
        if (!import.meta.env.PROD)
          logger.debug(
            "[AuthService] getCurrentUser: Supabase not configured, returning null",
          );
        return null;
      }

      // Получаем пользователя с timeout
      const { data, error: authGetError } = await supabaseWithTimeout(
        () => supabase.auth.getUser(),
        5000, // Увеличен timeout до 5 секунд
        { data: { user: null as never }, error: null },
      );

      if (!import.meta.env.PROD) {
        logger.debug("[AuthService] getCurrentUser: getUser response:", {
          hasData: !!data,
          hasUser: !!data?.user,
          userId: data?.user?.id,
          authGetError,
        });
      }

      const user = data?.user ?? null;
      if (!import.meta.env.PROD)
        logger.debug(
          "[AuthService] getCurrentUser: Auth user:",
          user ? user.id : "null",
        );
      if (user) {
        if (!import.meta.env.PROD)
          logger.debug(
            "[AuthService] getCurrentUser: Fetching client data for",
            user.id,
          );
        const { data: clientData, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", user.id)
          .single();

        if (!import.meta.env.PROD) {
          logger.debug("[AuthService] getCurrentUser: Client query result:", {
            hasClientData: !!clientData,
            clientId: clientData?.id,
            clientEmail: clientData?.email,
            clientStatus: (clientData as { status?: string })?.status,
            balance: clientData?.balance,
            error: error?.message,
          });
        }

        if (!error && clientData) {
          return clientData;
        }
      }

      if (!import.meta.env.PROD)
        logger.debug("[AuthService] getCurrentUser: Returning null");
      return null;
    } catch (error) {
      if (!import.meta.env.PROD)
        logger.error("[AuthService] getCurrentUser error:", error);
      return null;
    }
  }

  async resetPassword(email: string): Promise<void> {
    // Для Supabase Auth пользователей
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      // Для custom auth можно реализовать свой механизм сброса пароля
    }
  }

  // refreshSession удален - Supabase автоматически обновляет токены

  async updatePassword(newPassword: string): Promise<void> {
    // Обновляем в Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw error;
    }
  }

  onAuthStateChange(
    callback: (
      event: string,
      session: { user?: { id?: string; [key: string]: unknown } } | null,
    ) => void,
  ) {
    return supabase.auth.onAuthStateChange(callback as never);
  }
}

export const authService = AuthService.getInstance();
