# Вопросы для уточнения интеграции с бэкендом

## 🔴 КРИТИЧЕСКИЕ ВОПРОСЫ (блокируют релиз)

### 1. API Endpoints и структура
**Базовый URL**: `https://ocpp.evpower.kg/`

- [ ] Какая точная структура API endpoints? Примеры:
  - `/api/v1/auth/login` или `/auth/login`?
  - `/api/v1/stations` или `/stations`?
  - `/api/v1/charging/start` или `/ocpp/charging/start`?

- [ ] Есть ли Swagger/OpenAPI документация?

### 2. Авторизация и аутентификация

#### 2.1 Методы авторизации
- [ ] Какие методы авторизации поддерживаются?
  - Email + пароль?
  - Телефон + пароль?
  - Телефон + SMS код?
  - OAuth (Google, Apple)?

#### 2.2 Формат токенов
- [ ] JWT токены или другой формат?
- [ ] Структура токенов (что содержит payload)?
- [ ] Время жизни access token?
- [ ] Время жизни refresh token?

#### 2.3 Endpoints авторизации
```typescript
// Нужно уточнить точные endpoints и форматы запросов/ответов:

POST /auth/login
Request: {
  email?: string,
  phone?: string,
  password: string
}
Response: {
  token?: string,
  refresh_token?: string,
  user?: User,
  // или
  access_token?: string,
  expires_in?: number
}

POST /auth/register
Request: {
  email: string,
  phone?: string,
  password: string,
  name?: string
}

POST /auth/refresh
Request: {
  refresh_token: string
}

GET /auth/me
Headers: {
  Authorization: "Bearer {token}"
}
```

### 3. Структура данных пользователя

```typescript
// Текущая структура в приложении:
interface Client {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  balance?: number;
  created_at: string;
  updated_at?: string;
}

// Вопросы:
// - Совпадает ли с бэкендом?
// - Как хранится баланс (в копейках или сомах)?
// - Есть ли дополнительные поля?
```

### 4. Зарядные станции

#### 4.1 Получение списка станций
```typescript
GET /stations
Query params: {
  lat?: number,
  lng?: number,
  radius?: number,
  status?: 'available' | 'occupied' | 'offline',
  power_min?: number,
  power_max?: number
}

Response: Station[]
```

#### 4.2 Структура станции
```typescript
interface Station {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  status: 'available' | 'occupied' | 'offline' | 'faulted';
  connectors: Connector[];
  // Что еще?
}

interface Connector {
  id: number;
  type: 'Type2' | 'CCS' | 'CHAdeMO' | 'GB/T';
  power_kw: number;
  status: 'available' | 'occupied' | 'offline' | 'faulted';
  current_price_per_kwh?: number;
  // Что еще?
}
```

### 5. Процесс зарядки

#### 5.1 Старт зарядки
```typescript
POST /charging/start
Request: {
  station_id: string,
  connector_id: number,
  // Нужен ли QR код?
  qr_code?: string,
  // Или идентификатор транспорта?
  vehicle_id?: string,
  // Лимиты
  charge_limit_kwh?: number,
  charge_limit_amount?: number,
  charge_limit_percent?: number
}

Response: {
  session_id: string,
  status: 'starting' | 'active' | 'error',
  error?: string
}
```

#### 5.2 Статус зарядки
```typescript
GET /charging/status/{session_id}
// или WebSocket?
WS /ws/charging/{session_id}

Response: {
  session_id: string,
  status: 'preparing' | 'charging' | 'completed' | 'error',
  energy_delivered: number, // кВт·ч
  duration_seconds: number,
  current_power: number, // кВт
  current_cost: number, // сом
  estimated_time_remaining?: number, // секунды
  state_of_charge?: number // процент батареи
}
```

#### 5.3 Остановка зарядки
```typescript
POST /charging/stop
Request: {
  session_id: string,
  reason?: 'user' | 'limit_reached' | 'emergency'
}
```

### 6. Платежи и транзакции

#### 6.1 Пополнение баланса
```typescript
POST /payments/topup
Request: {
  amount: number,
  payment_method: 'odengi' | 'obank' | 'elsom' | 'card',
  return_url?: string // для веб-версии
}

Response: {
  invoice_id: string,
  payment_url?: string, // для редиректа
  qr_code?: string, // для QR платежа
  status: 'pending' | 'paid' | 'failed'
}
```

#### 6.2 Проверка статуса платежа
```typescript
GET /payments/status/{invoice_id}
Response: {
  invoice_id: string,
  status: 0 | 1 | 2, // или 'pending' | 'paid' | 'failed'?
  amount: number,
  created_at: string,
  paid_at?: string
}
```

#### 6.3 История транзакций
```typescript
GET /transactions
Query params: {
  limit?: number,
  offset?: number,
  type?: 'topup' | 'charge' | 'refund',
  date_from?: string,
  date_to?: string
}
```

### 7. История зарядок

```typescript
GET /charging/history
Query params: {
  limit?: number,
  offset?: number,
  date_from?: string,
  date_to?: string,
  station_id?: string
}

Response: ChargingSession[]
```

### 8. Push уведомления

- [ ] Какой сервис используется (FCM, OneSignal, другой)?
- [ ] Формат регистрации токена устройства?
```typescript
POST /devices/register
Request: {
  token: string,
  platform: 'ios' | 'android',
  device_id?: string
}
```

### 9. WebSocket соединения

- [ ] Используется ли WebSocket для real-time обновлений?
- [ ] Если да, то для каких событий:
  - Статус зарядки?
  - Обновление баланса?
  - Изменение статуса станций?

- [ ] Формат подключения и авторизации?
```typescript
// Пример
const ws = new WebSocket('wss://ocpp.evpower.kg/ws');
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt_token'
}));
```

## 🟡 ВАЖНЫЕ ВОПРОСЫ (влияют на UX)

### 10. Обработка ошибок

- [ ] Какой формат ошибок от API?
```typescript
// Вариант 1
{
  error: string,
  message: string,
  code?: number
}

// Вариант 2
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

- [ ] Коды ошибок и их значения?
- [ ] Локализация ошибок на стороне бэкенда или фронтенда?

### 11. Локализация

- [ ] Поддерживаются ли языки на бэкенде?
- [ ] Как передавать язык (header, query param)?
```typescript
Headers: {
  'Accept-Language': 'ru' | 'en' | 'ky'
}
// или
GET /stations?lang=ru
```

### 12. Лимиты и квоты

- [ ] Есть ли rate limiting на API?
- [ ] Максимальный размер запросов?
- [ ] Ограничения на количество активных сессий?
- [ ] Таймауты соединений?

### 13. Версионирование API

- [ ] Как происходит версионирование?
  - В URL: `/api/v1/`, `/api/v2/`
  - В headers: `API-Version: 1.0`
- [ ] Как узнать о deprecated endpoints?
- [ ] Есть ли backward compatibility?

## 🟢 ДОПОЛНИТЕЛЬНЫЕ ВОПРОСЫ

### 14. Статистика и аналитика

- [ ] Какие метрики собираются на бэкенде?
- [ ] Нужно ли отправлять события с фронтенда?
```typescript
POST /analytics/event
Request: {
  event: string,
  properties?: Record<string, any>
}
```

### 15. Файлы и медиа

- [ ] Загрузка аватара пользователя - поддерживается?
- [ ] Формат и ограничения?
```typescript
POST /users/avatar
Content-Type: multipart/form-data
Body: FormData with 'avatar' field

// Или base64?
POST /users/avatar
Request: {
  avatar: string // base64
}
```

### 16. Поддержка и обратная связь

- [ ] Есть ли endpoint для отправки обратной связи?
```typescript
POST /support/feedback
Request: {
  message: string,
  type: 'bug' | 'feature' | 'complaint',
  attachments?: string[]
}
```

### 17. Тестовое окружение

- [ ] Есть ли тестовый сервер для разработки?
- [ ] Тестовые учетные записи?
- [ ] Тестовые платежные методы?
- [ ] Можно ли эмулировать процесс зарядки?

## 📝 СУММАРНО

### Что критически важно выяснить СЕЙЧАС:

1. **Точная структура API endpoints**
2. **Формат авторизации (токены, refresh flow)**
3. **Структуры данных (User, Station, Connector, Session)**
4. **Процесс старта/остановки зарядки**
5. **Интеграция с платежными системами**

### Что уже известно:

- Production URL: `https://ocpp.evpower.kg/`
- Используется Supabase для части функционала
- Поддерживаются QR коды для станций
- Есть баланс пользователя
- Платежи через O!Денги, O!Bank

### Что нужно синхронизировать:

1. Типы данных TypeScript с актуальными моделями бэкенда
2. Статусы зарядных сессий
3. Статусы транзакций
4. Методы оплаты
5. Обработку ошибок

---

**ВАЖНО**: После получения ответов на эти вопросы нужно будет:
1. Обновить все типы в приложении
2. Создать правильные API сервисы
3. Настроить error handling
4. Провести интеграционное тестирование

**Дата создания**: 2025-09-29