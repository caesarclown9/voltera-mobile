# Миграция на HttpOnly Cookies для безопасной аутентификации

## Текущая проблема
Сейчас токены хранятся в localStorage, что делает их уязвимыми для XSS-атак. Это критическая уязвимость для production.

## Решение
Миграция на HttpOnly cookies с SameSite=Strict и Secure флагами.

## Необходимые изменения Backend

### 1. API Endpoints для Cookie-based Auth

```typescript
// POST /api/auth/login
// Устанавливает HttpOnly cookie с токеном
Response: {
  success: boolean;
  user: UserData;
  // НЕ возвращаем токен в body
}
Headers: {
  'Set-Cookie': 'auth_token=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400'
}

// POST /api/auth/logout
// Очищает cookie
Headers: {
  'Set-Cookie': 'auth_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
}

// GET /api/auth/me
// Возвращает текущего пользователя на основе cookie
Request Headers: {
  'Cookie': 'auth_token=...'
}
Response: {
  user: UserData | null
}

// POST /api/auth/refresh
// Обновляет токен в cookie
Response Headers: {
  'Set-Cookie': 'auth_token=...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400'
}
```

### 2. CSRF Protection
- Добавить CSRF токены для всех мутирующих операций
- Использовать Double Submit Cookie pattern или Synchronizer Token pattern

### 3. CORS Configuration
```javascript
cors: {
  origin: ['https://app.evpower.kg', 'http://localhost:3000'],
  credentials: true, // Важно для cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
}
```

## Необходимые изменения Frontend

### 1. Создать новый auth сервис для cookie-based auth

```typescript
// src/services/cookieAuthService.ts
class CookieAuthService {
  async login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include', // Важно для cookies
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Login failed');
    return response.json();
  }

  async logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  }

  async getCurrentUser() {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });

    if (!response.ok) return null;
    return response.json();
  }

  async refreshToken() {
    await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
  }
}
```

### 2. Обновить axios interceptors

```typescript
// Добавить credentials для всех запросов
axios.defaults.withCredentials = true;

// Убрать manual добавление Authorization header
// Cookies будут отправляться автоматически
```

### 3. Обновить auth store

```typescript
// Убрать persist middleware для токенов
// Хранить только non-sensitive user data
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  checkAuth: async () => {
    const user = await cookieAuthService.getCurrentUser();
    set({ user, isAuthenticated: !!user });
  },

  login: async (credentials) => {
    const { user } = await cookieAuthService.login(credentials);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await cookieAuthService.logout();
    set({ user: null, isAuthenticated: false });
  }
}));
```

### 4. Обновить App initialization

```typescript
// App.tsx
useEffect(() => {
  // Проверяем аутентификацию при загрузке
  authStore.checkAuth();
}, []);
```

## План миграции

### Фаза 1: Backend (требует backend разработчика)
1. Реализовать cookie-based endpoints
2. Настроить CORS для credentials
3. Добавить CSRF protection
4. Тестирование endpoints

### Фаза 2: Frontend Feature Flag
1. Создать feature flag USE_COOKIE_AUTH
2. Реализовать cookieAuthService
3. Создать условную логику в auth hooks
4. Тестирование с mock backend

### Фаза 3: Поэтапный rollout
1. Включить для 10% пользователей
2. Мониторинг метрик и ошибок
3. Постепенное увеличение до 100%
4. Удаление старого кода

## Временное решение для Frontend (без backend)

Пока backend не готов, можно улучшить безопасность:

1. **Использовать Session Storage вместо Local Storage** (уже реализовано частично)
   - Токены удаляются при закрытии вкладки

2. **Добавить обфускацию токенов**
   - Простое XOR шифрование в storage
   - Не защищает полностью, но усложняет атаку

3. **Реализовать token rotation**
   - Регулярное обновление токенов
   - Короткий lifetime (15 минут)

4. **Content Security Policy**
   - Добавить CSP headers для защиты от XSS

## Риски текущей реализации

1. **XSS атаки** - любой injected script может украсть токены
2. **Нет защиты от CSRF** - после кражи токена
3. **Токены видны в DevTools** - упрощает атаку
4. **Нет token rotation** - скомпрометированный токен действует долго

## Метрики успеха миграции

- 0 токенов в localStorage/sessionStorage
- 100% запросов используют credentials: 'include'
- Снижение security incidents на 90%
- Отсутствие регрессий в UX

## Ресурсы

- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [SameSite Cookie Explained](https://web.dev/samesite-cookies-explained/)