# 🔐 Security Migration Guide - HttpOnly Cookies

## Текущая ситуация
- **Mobile (iOS/Android)**: Используется Secure Storage (Keychain/Keystore) - ✅ Безопасно
- **Web**: Используется sessionStorage - ⚠️ Требует миграции

## План миграции на HttpOnly Cookies для веб-версии

### Backend изменения (требуется от API команды)

#### 1. Эндпоинт логина
```python
@app.post("/api/v1/auth/login")
async def login(credentials: LoginCredentials, response: Response, request: Request):
    # Проверка платформы
    use_cookie = credentials.use_cookie or request.headers.get("X-Platform") == "web"

    # ... валидация ...

    if use_cookie:
        # Для веб-платформы - установка HttpOnly cookie
        response.set_cookie(
            key="auth_token",
            value=token,
            httponly=True,
            secure=True,  # Только HTTPS
            samesite="strict",
            max_age=86400,  # 24 часа
            path="/"
        )
        # Не возвращаем токен в теле ответа
        return {"success": True, "user": user_data}
    else:
        # Для мобильных - возвращаем токен
        return {"success": True, "token": token, "user": user_data}
```

#### 2. Эндпоинт logout
```python
@app.post("/api/v1/auth/logout")
async def logout(response: Response):
    response.delete_cookie("auth_token")
    return {"success": True}
```

#### 3. Middleware для проверки cookie
```python
async def auth_middleware(request: Request):
    # Проверяем cookie
    token = request.cookies.get("auth_token")
    if not token:
        # Fallback на header для мобильных
        auth_header = request.headers.get("Authorization")
        if auth_header:
            token = auth_header.replace("Bearer ", "")

    if token:
        # Валидация токена
        request.state.user = validate_token(token)
```

#### 4. CORS настройки
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.evpower.kg"],  # Не используйте *
    allow_credentials=True,  # Важно для cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Frontend изменения (уже подготовлены)

#### 1. Инициализация при загрузке приложения
```typescript
// src/app/Providers.tsx
import { hybridAuthService } from '@/features/auth/services/hybridAuthService';

useEffect(() => {
  hybridAuthService.initialize();
}, []);
```

#### 2. Обновление auth store
```typescript
// src/features/auth/store/index.ts
import { hybridAuthService } from '../services/hybridAuthService';

const login = async (credentials) => {
  const response = await hybridAuthService.login(credentials);
  // ...
};

const logout = async () => {
  await hybridAuthService.logout();
  // ...
};
```

#### 3. Обновление API client
```typescript
// src/api/client.ts
import { hybridAuthService } from '@/features/auth/services/hybridAuthService';

// При инициализации
await hybridAuthService.configureApiClient(apiClient);
```

## Тестирование

### 1. Веб-платформа
```bash
# Проверка установки cookie
curl -X POST https://api.evpower.kg/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Platform: web" \
  -d '{"email":"test@test.com","password":"123456"}' \
  -c cookies.txt -v

# Проверка использования cookie
curl https://api.evpower.kg/api/v1/balance/123 \
  -b cookies.txt -v
```

### 2. Мобильные платформы
```bash
# Должно работать как раньше с Bearer token
curl https://api.evpower.kg/api/v1/balance/123 \
  -H "Authorization: Bearer TOKEN"
```

## Чеклист миграции

### Backend
- [ ] Реализовать условную логику в `/auth/login`
- [ ] Добавить эндпоинт `/auth/logout`
- [ ] Обновить middleware для поддержки cookies
- [ ] Настроить CORS с credentials
- [ ] Добавить CSRF защиту
- [ ] Реализовать `/auth/refresh` для обновления cookie

### Frontend
- [x] Создать `cookieAuthService`
- [x] Создать `hybridAuthService`
- [ ] Обновить auth store
- [ ] Обновить API client
- [ ] Протестировать на всех платформах

### DevOps
- [ ] Убедиться что используется HTTPS
- [ ] Настроить правильные CORS headers
- [ ] Добавить monitoring для cookie-based сессий

## Преимущества после миграции

1. **Безопасность**: XSS атаки не смогут украсть токены
2. **Простота**: Не нужно вручную добавлять токены к запросам
3. **Автоматизация**: Браузер сам отправляет cookies
4. **CSRF защита**: С SameSite=Strict cookies

## Риски и митигация

| Риск | Митигация |
|------|-----------|
| CSRF атаки | SameSite=Strict + CSRF токены |
| Subdomain атаки | Использовать __Host- префикс для cookies |
| Man-in-the-middle | Только HTTPS + Secure флаг |
| Cookie overflow | Хранить только токен, не user data |

## Обратная совместимость

Система поддерживает оба метода:
- **Web**: HttpOnly cookies
- **Mobile**: Bearer tokens в Secure Storage

Это позволяет мигрировать постепенно без breaking changes.

## Контакты для вопросов

- Frontend: [Ваш контакт]
- Backend: [Контакт backend команды]
- Security: [Контакт по безопасности]

---

*Последнее обновление: 2025-09-25*