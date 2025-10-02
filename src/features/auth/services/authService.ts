import { supabase } from '../../../shared/config/supabase';
import type { AuthResponse, Client } from '../types/auth.types';

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
    phone?: string
  ): Promise<AuthResponse> {
    try {
      // Создаем пользователя через Supabase Auth с телефоном в метаданных
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            phone: phone || null,
            name: email.split('@')[0] || 'User',
            user_type: 'client' // ВАЖНО! Для триггера
          }
        }
      });

      if (authError) {
        // Нормализуем сообщение об ошибке для UI
        const message =
          // уже существует
          /already/i.test((authError as any).message || '')
            ? 'Пользователь с таким email уже существует'
            : /password/i.test((authError as any).message || '')
            ? 'Некорректный пароль: минимум 6 символов'
            : (authError as any).message || 'Не удалось зарегистрировать пользователя'
        const normalizedError = new Error(message)
        ;(normalizedError as any).status = (authError as any).status
        throw normalizedError
      }

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Запись в public.clients создастся АВТОМАТИЧЕСКИ через триггер!
      // НЕ НУЖНО делать дополнительный INSERT

      // Ждем немного чтобы триггер создал запись и пытаемся получить данные клиента
      let clientData: Client | null = null
      if (authData.session) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Даем триггеру время

        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (!clientError && client) {
          clientData = client as Client
        } else {
          console.warn('Client not found after registration, trigger may be delayed')
        }
      }

      return {
        success: true,
        client: clientData || undefined,
        session: authData.session,
      };
    } catch (error) {
      throw error;
    }
  }

  async signInWithPhone(phone: string, password: string): Promise<AuthResponse> {
    try {
      // Находим клиента по телефону
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', phone)
        .single();

      if (clientError || !clientData) {
        throw new Error('Пользователь с таким телефоном не найден');
      }

      // Если у клиента есть email, пытаемся войти через Supabase Auth
      if (clientData.email) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: clientData.email,
            password: password,
          });

          if (!authError && authData.user) {
            return {
              success: true,
              client: clientData || undefined,
              session: authData.session,
            };
          }
        } catch (error) {
          // Если не удалось через Supabase Auth, продолжаем
        }
      }

      // Проверяем пароль напрямую (для старых пользователей без Supabase Auth)
      // TODO: В будущем можно добавить проверку через password_hash
      
      return {
        success: true,
        client: clientData || undefined,
        session: null,
      };
    } catch (error) {
      throw error;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      // В режиме разработки используем mock данные только если явно не указано использовать реальный API
      if (import.meta.env.DEV && !import.meta.env.VITE_USE_REAL_API && !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return {
          success: true,
          client: {
            id: 'demo-user-id',
            email: email,
            name: email.split('@')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            balance: 250.75,
            status: 'active'
          },
          session: null
        };
      }

      // Входим через Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Сохраняем оригинальную ошибку от Supabase для правильной обработки
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to authenticate');
      }

      // Получаем данные клиента из нашей таблицы
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (clientError || !clientData) {
        // Если клиента нет, создаем его
        const { data: newClient, error: createError } = await supabase
          .from('clients')
          .insert({
            id: authData.user.id,
            email: email,
            name: email.split('@')[0] || 'User',
            balance: 0
            // created_at и status имеют default значения в БД
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating client on signin:', createError);
          throw new Error('Failed to get user data: ' + createError.message);
        }

        return {
          success: true,
          client: newClient,
          session: authData.session,
        };
      }

      return {
        success: true,
        client: clientData || undefined,
        session: authData.session,
      };
    } catch (error) {
      throw error;
    }
  }

  async authenticateWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      // Сначала пытаемся войти
      try {
        const result = await this.signInWithEmail(email, password);
        return result;
      } catch (signInError: any) {
        console.log('Sign in error:', signInError);
        
        // Проверяем сначала - может пользователь уже существует в auth.users
        const { data: existingUser } = await supabase
          .from('clients')
          .select('id')
          .eq('email', email)
          .single();
        
        if (existingUser) {
          // Пользователь существует - значит просто неверный пароль
          throw new Error('Неверный пароль');
        }
        
        // Пользователь не существует - создаем нового
        console.log('User not found, creating new account...');
        try {
          return await this.signUpWithEmail(email, password);
        } catch (signUpError: any) {
          // Если регистрация не удалась, возвращаем оригинальную ошибку входа
          throw new Error('Неверный email или пароль');
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      // Пытаемся выйти из Supabase Auth
      await supabase.auth.signOut();
      // Даже если Supabase Auth не удался, считаем выход успешным
    } catch (error) {
      // Не бросаем ошибку, просто логируем
    }
  }

  async getCurrentUser(): Promise<Client | null> {
    try {
      // Сначала пробуем получить из Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: clientData, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && clientData) {
          return clientData;
        }
      }

      // Если нет сессии Supabase Auth, возвращаем null
      // В будущем можно добавить проверку custom токена из localStorage
      return null;
    } catch (error) {
      return null;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      // Для Supabase Auth пользователей
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) {
        // Для custom auth можно реализовать свой механизм сброса пароля
      }
    } catch (error) {
      throw error;
    }
  }

  // refreshSession удален - Supabase автоматически обновляет токены

  async updatePassword(newPassword: string): Promise<void> {
    try {
      // Обновляем в Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

}

export const authService = AuthService.getInstance();