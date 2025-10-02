# Ответы на вопросы интеграции с бэкендом EvPower

**Дата ответа**: 2025-09-29
**От**: Backend Team
**Для**: Mobile Development Team

## 🔴 КРИТИЧЕСКИЕ ВОПРОСЫ (блокируют релиз)

### 1. API Endpoints и структура

**Базовый URL**: `https://ocpp.evpower.kg/`

#### Структура endpoints:

У нас **двойная структура API**:
- **Legacy Mobile API**: `/api/*` - для обратной совместимости с FlutterFlow
- **Новый V1 API**: `/api/v1/*` - модульная структура (рекомендуется использовать)

**Примеры endpoints:**

```http
# V1 API (РЕКОМЕНДУЕТСЯ)
POST /api/v1/charging/start
POST /api/v1/charging/stop
GET  /api/v1/charging/status/{session_id}
GET  /api/v1/balance/{client_id}
POST /api/v1/balance/topup-qr
POST /api/v1/balance/topup-card
GET  /api/v1/locations
GET  /api/v1/station/status/{station_id}

# Legacy Mobile API (для совместимости)
POST /api/charging/start
POST /api/charging/stop
GET  /api/charging/status/{session_id}
GET  /api/balance/{client_id}
POST /api/balance/topup-qr
```

**⚠️ ВАЖНО**: Swagger/OpenAPI документация **отключена в production** (docs_url=None, redoc_url=None). Используйте эту документацию.

### 2. Авторизация и аутентификация

#### ⚠️ КРИТИЧЕСКИ ВАЖНО:

**НЕТ ТРАДИЦИОННОЙ АУТЕНТИФИКАЦИИ НА БЭКЕНДЕ!**

- Аутентификация **полностью происходит через FlutterFlow/Supabase**
- Бэкенд **не хранит пароли** и **не выдает JWT токены**
- Используется **прямая передача `client_id`** в запросах
- Нет endpoints для login/register/refresh на OCPP бэкенде

#### Как работает авторизация:

1. **Регистрация/вход** - через Supabase Auth (управляется из FlutterFlow)
2. **Получение client_id** - из Supabase после успешной авторизации
3. **Использование API** - передача client_id напрямую в запросах

```typescript
// НЕ СУЩЕСТВУЕТ на OCPP бэкенде:
POST /auth/login ❌
POST /auth/register ❌
POST /auth/refresh ❌
GET /auth/me ❌

// Вместо этого используйте Supabase Auth:
// https://supabase.com/docs/reference/javascript/auth-api
```

#### Для мобильного приложения нужно:

1. Интегрировать **Supabase Auth SDK**
2. Получать `client_id` из Supabase профиля
3. Передавать `client_id` в запросах к OCPP API

### 3. Структура данных пользователя

```typescript
// АКТУАЛЬНАЯ структура Client в базе данных:
interface Client {
  id: string;           // UUID из Supabase Auth
  name?: string;        // Nullable
  phone?: string;       // Nullable
  balance: number;      // В СОМАХ (не копейках!)
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;   // ISO datetime
  updated_at: string;   // ISO datetime
}

// НЕТ полей:
// - email (хранится в Supabase Auth)
// - avatar (не поддерживается)
// - password (управляется Supabase)
```

**📝 Примечания:**
- `balance` хранится в **сомах как float** (например: 150.50)
- `client_id` = Supabase User UUID
- Email получайте из Supabase Auth, не из нашего API

### 4. Зарядные станции

#### 4.1 Получение списка станций через locations

```typescript
// Получение локаций со станциями
GET /api/v1/locations?include_stations=true

Response: {
  locations: [
    {
      id: string,
      name: string,
      address: string,
      city?: string,
      country?: string,
      latitude?: number,
      longitude?: number,
      status: 'available' | 'occupied' | 'offline' | 'maintenance' | 'partial',
      stations_count: number,
      connectors_count: number,
      available_connectors: number,
      stations: Station[] // если include_stations=true
    }
  ]
}
```

#### 4.2 Структура станции

```typescript
interface Station {
  id: string;
  serial_number: string;
  model: string;
  manufacturer: string;
  location_id: string;
  power_capacity: number; // кВт
  connector_types: string[]; // ["Type2", "CCS"]
  status: 'active' | 'inactive' | 'maintenance';
  connectors_count: number;
  price_per_kwh: number; // Базовая цена в сомах
  session_fee: number;   // Фиксированная плата за сессию
  currency: 'KGS';
  firmware_version?: string;

  // Операционный статус (из OCPP)
  ocpp_status?: {
    is_online: boolean;
    last_heartbeat: string;
    connector_status: ConnectorStatus[];
  }
}

interface ConnectorStatus {
  connector_id: number; // 1, 2, 3...
  status: 'Available' | 'Preparing' | 'Charging' | 'SuspendedEVSE' |
          'SuspendedEV' | 'Finishing' | 'Reserved' | 'Unavailable' | 'Faulted';
  error_code?: string;
  info?: string;
}
```

### 5. Процесс зарядки

#### 5.1 Старт зарядки

```typescript
POST /api/v1/charging/start
Request: {
  client_id: string,      // ОБЯЗАТЕЛЬНО
  station_id: string,     // ОБЯЗАТЕЛЬНО
  connector_id: number,   // ОБЯЗАТЕЛЬНО (1, 2, 3...)

  // Опциональные лимиты (можно указать один или оба):
  energy_kwh?: number,    // Лимит по энергии в кВт·ч
  amount_som?: number     // Лимит по сумме в сомах
}

Response (успех): {
  success: true,
  message: string,
  session_id: string,
  connector_id: number,
  reserved_amount: number,  // Зарезервировано на балансе
  limit_type: 'energy' | 'amount' | 'none',
  limit_value?: number,
  rate_per_kwh: number,     // Актуальный тариф
  session_fee: number
}

Response (ошибка): {
  success: false,
  error: string, // "Insufficient balance" | "Connector not available" | etc
  required_amount?: number,
  current_balance?: number
}
```

#### 5.2 Статус зарядки

```typescript
GET /api/v1/charging/status/{session_id}

Response: {
  success: true,
  session: {
    id: string,
    status: 'started' | 'stopped' | 'error',
    station_id: string,
    connector_id: number,
    start_time: string,      // ISO datetime
    stop_time?: string,

    // Энергия и стоимость
    energy_consumed: number,  // кВт·ч
    current_cost: number,     // Текущая стоимость в сомах
    reserved_amount: number,  // Зарезервировано

    // Лимиты
    limit_type: 'energy' | 'amount' | 'none',
    limit_value?: number,
    limit_reached: boolean,
    limit_percentage: number, // 0-100%

    // Тарифы
    rate_per_kwh: number,
    session_fee: number,

    // OCPP данные (если доступны)
    ocpp_transaction_id?: number,
    meter_start?: number,
    meter_current?: number,
    charging_duration_minutes: number
  }
}
```

#### 5.3 Остановка зарядки

```typescript
POST /api/v1/charging/stop
Request: {
  session_id: string  // ОБЯЗАТЕЛЬНО
}

Response (успех): {
  success: true,
  message: string,
  final_cost: number,        // Финальная стоимость
  energy_consumed: number,    // Потреблено кВт·ч
  duration_minutes: number,
  refunded_amount?: number,   // Возвращено на баланс (если был излишек)
  additional_charge?: number  // Дополнительно списано (если превышен резерв)
}
```

### 6. Платежи и транзакции

#### 6.1 Пополнение баланса через QR (O!Dengi)

```typescript
POST /api/v1/balance/topup-qr
Request: {
  client_id: string,
  amount: number,        // В сомах (10-100000)
  description?: string
}

Response: {
  success: true,
  invoice_id: string,
  order_id: string,
  qr_code: string,        // Данные для генерации QR (не картинка!)
  qr_code_url: string,    // URL картинки QR-кода
  app_link: string,       // Deeplink для O!Dengi приложения
  amount: number,
  client_id: string,
  current_balance: number,

  // Время жизни
  qr_expires_at: string,       // ISO datetime (через 5 минут)
  invoice_expires_at: string,  // ISO datetime (через 10 минут)
  qr_lifetime_seconds: 300,
  invoice_lifetime_seconds: 600
}
```

#### 6.2 Пополнение картой (OBANK H2H)

```typescript
POST /api/v1/balance/topup-card
Request: {
  client_id: string,
  amount: number,
  card_pan: string,        // "4169585512341234"
  card_name: string,       // "IVAN IVANOV"
  card_cvv: string,        // "123"
  card_year: string,       // "25" (YY)
  card_month: string,      // "12" (MM)
  email: string,           // Для чека
  phone_number?: string,
  description?: string
}

Response: {
  success: true,
  auth_key: string,        // Ключ для 3DS
  acs_url: string,         // URL для 3DS аутентификации
  md: string,              // Merchant data
  pa_req: string,          // 3DS request
  term_url: string,        // Return URL после 3DS
  client_id: string,
  current_balance: number
}
```

#### 6.3 Проверка статуса платежа

```typescript
GET /api/v1/payment/status/{invoice_id}

Response: {
  success: true,
  status: 0 | 1 | 2 | 3 | 4,  // O!Dengi коды
  status_text: 'processing' | 'approved' | 'canceled' | 'refunded' | 'partial_refund',
  amount: number,
  paid_amount?: number,
  invoice_id: string,

  // Время жизни
  qr_expired: boolean,
  invoice_expired: boolean,
  qr_expires_at?: string,
  invoice_expires_at?: string,

  // Флаги для клиента
  can_proceed: boolean,        // Можно ли использовать для зарядки
  can_start_charging: boolean  // Платеж успешен
}
```

#### 6.4 История транзакций

**⚠️ НЕТ ОТДЕЛЬНОГО ENDPOINT!** История доступна только через Supabase:

```sql
-- Используйте Supabase Client для запроса:
SELECT * FROM payment_transactions_odengi
WHERE client_id = ?
ORDER BY created_at DESC
```

### 7. История зарядок

**⚠️ НЕТ ОТДЕЛЬНОГО ENDPOINT!** История доступна только через Supabase:

```sql
-- Используйте Supabase Client для запроса:
SELECT * FROM charging_sessions
WHERE user_id = ? -- user_id это client_id
ORDER BY created_at DESC
```

### 8. Push уведомления

**❌ НЕ ПОДДЕРЖИВАЮТСЯ** на уровне OCPP бэкенда.

Рекомендуется использовать:
- Supabase Realtime для мгновенных обновлений
- WebSocket подключения для статусов

### 9. WebSocket соединения

#### 9.1 OCPP WebSocket (только для станций)

```typescript
// ⚠️ ТОЛЬКО ДЛЯ ЗАРЯДНЫХ СТАНЦИЙ, НЕ ДЛЯ КЛИЕНТОВ!
ws://ocpp.evpower.kg/ws/{station_id}
ws://ocpp.evpower.kg/ocpp/{station_id}
```

#### 9.2 Locations WebSocket (для клиентов)

```typescript
// Realtime обновления статусов локаций
const ws = new WebSocket('wss://ocpp.evpower.kg/api/v1/ws/locations?client_id=YOUR_CLIENT_ID');

// Формат сообщений
interface LocationUpdate {
  type: 'status_update',
  location_id: string,
  status: 'available' | 'occupied' | 'offline' | 'maintenance' | 'partial',
  available_connectors: number,
  timestamp: string
}
```

## 🟡 ВАЖНЫЕ ВОПРОСЫ (влияют на UX)

### 10. Обработка ошибок

#### Формат ошибок:

```typescript
// Стандартный формат ошибки
{
  success: false,
  error: string,        // Человекочитаемое сообщение
  detail?: any,         // Дополнительные данные
  // Контекстные поля в зависимости от endpoint
  required_amount?: number,
  current_balance?: number
}

// HTTP статусы:
// 200 - OK (даже для бизнес-ошибок с success: false)
// 400 - Bad Request (невалидные данные)
// 404 - Not Found
// 500 - Internal Server Error
```

#### Основные коды ошибок:

- `"Insufficient balance"` - Недостаточно средств
- `"Station not found"` - Станция не найдена
- `"Station offline"` - Станция офлайн
- `"Connector not available"` - Коннектор занят/недоступен
- `"Session not found"` - Сессия не найдена
- `"Invalid limit values"` - Неверные лимиты
- `"Payment expired"` - Платеж истек

### 11. Локализация

**❌ НЕ ПОДДЕРЖИВАЕТСЯ** на бэкенде.

- Все сообщения на английском
- Локализацию делайте на стороне клиента
- Используйте коды ошибок для mapping на локальные строки

### 12. Лимиты и квоты

```yaml
Rate Limiting: НЕТ (но планируется)
Max Request Size: 10 MB
Connection Timeout: 30 секунд
WebSocket Idle Timeout: 60 секунд
Max Active Sessions: Без ограничений
Payment Check Interval: 15 секунд
Payment Max Checks: 20 (5 минут)
Station Heartbeat Timeout: 300 секунд (5 минут)
Location Cache TTL: 30 секунд
```

### 13. Версионирование API

- **Версионирование через URL**: `/api/v1/`, `/api/v2/`
- **Текущая версия**: v1
- **Legacy API**: `/api/` (без версии) - deprecated
- **Backward compatibility**: Минимум 6 месяцев для v1
- **Уведомления об изменениях**: Через changelog в репозитории

## 🟢 ДОПОЛНИТЕЛЬНЫЕ ВОПРОСЫ

### 14. Статистика и аналитика

**❌ НЕ ПОДДЕРЖИВАЕТСЯ** на OCPP бэкенде.

События отслеживаются автоматически:
- Все платежные операции логируются
- Все зарядные сессии записываются
- OCPP события сохраняются

Для аналитики используйте Supabase запросы к таблицам.

### 15. Файлы и медиа

**❌ НЕ ПОДДЕРЖИВАЕТСЯ**

- Загрузка аватаров не реализована
- Для медиа используйте Supabase Storage

### 16. Поддержка и обратная связь

**❌ НЕТ ENDPOINT** для обратной связи.

Рекомендуется реализовать через:
- Supabase таблицу feedback
- Внешний сервис (Zendesk, Intercom)

### 17. Тестовое окружение

```yaml
# ТЕСТОВЫЙ СЕРВЕР
URL: https://test-ocpp.evpower.kg/ (уточните у DevOps)

# ТЕСТОВЫЕ ДАННЫЕ
Client ID: "test-client-123"
Station IDs: ["TEST-STATION-001", "TEST-STATION-002"]

# ТЕСТОВЫЕ ПЛАТЕЖИ
O!Dengi Test Mode: Включен (merchant_id тестовый)
OBANK Test Mode: Включен (используется test-rakhmet.dengi.kg)

# ТЕСТОВЫЕ КАРТЫ (OBANK)
Успешная: 4169 5855 1234 5678
3DS: 4169 5855 8765 4321
Отклоненная: 4169 5855 1111 1111

# ЭМУЛЯЦИЯ ЗАРЯДКИ
- Используйте OCPP симулятор (например, OCPP-1.6-Simulator)
- Или запросите доступ к тестовой станции
```

## 📋 ИНТЕГРАЦИОННЫЙ ЧЕКЛИСТ

### ✅ Что готово к использованию:

1. ✅ Все endpoints для зарядки (`/api/v1/charging/*`)
2. ✅ Пополнение баланса через QR (`/api/v1/balance/topup-qr`)
3. ✅ Пополнение картой с 3DS (`/api/v1/balance/topup-card`)
4. ✅ Получение статуса станций (`/api/v1/station/status/{id}`)
5. ✅ Получение локаций (`/api/v1/locations`)
6. ✅ WebSocket для realtime обновлений локаций
7. ✅ Проверка статуса платежей (`/api/v1/payment/status/{id}`)

### ⚠️ Что требует внимания:

1. ⚠️ **Аутентификация через Supabase** - нужна отдельная интеграция
2. ⚠️ **История через Supabase** - прямые SQL запросы
3. ⚠️ **Нет Push уведомлений** - используйте WebSocket/Polling
4. ⚠️ **Нет локализации** - делайте на клиенте
5. ⚠️ **client_id обязателен** - получайте из Supabase Auth

### 🔧 Рекомендации по интеграции:

1. **Используйте V1 API** (`/api/v1/*`), не legacy
2. **Интегрируйте Supabase SDK** для auth и данных
3. **Реализуйте retry логику** для платежей
4. **Кэшируйте статусы станций** 30 секунд
5. **Используйте WebSocket** для realtime обновлений
6. **Обрабатывайте таймауты платежей** (5 минут для QR)
7. **Валидируйте лимиты** перед отправкой

### 🚀 Быстрый старт:

```typescript
// 1. Инициализация Supabase
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 2. Авторизация
const { user } = await supabase.auth.signIn({
  email: 'user@example.com',
  password: 'password'
})
const client_id = user.id

// 3. Проверка баланса
const response = await fetch(`https://ocpp.evpower.kg/api/v1/balance/${client_id}`)
const { balance } = await response.json()

// 4. Старт зарядки
const startResponse = await fetch('https://ocpp.evpower.kg/api/v1/charging/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id,
    station_id: 'STATION-001',
    connector_id: 1,
    energy_kwh: 10
  })
})

// 5. Мониторинг статуса
const { session_id } = await startResponse.json()
const statusResponse = await fetch(`https://ocpp.evpower.kg/api/v1/charging/status/${session_id}`)
```

## 📞 КОНТАКТЫ

**По техническим вопросам API:**
- Документация: Этот файл
- Код: `/backend/app/api/v1/`
- Тесты: `/backend/tests/`

**По вопросам Supabase:**
- Документация: https://supabase.com/docs
- Схема БД: `/migrations/`

**По вопросам OCPP:**
- Спецификация: OCPP 1.6J
- Код: `/backend/ocpp_ws_server/`

---

**Последнее обновление**: 2025-09-29
**Версия API**: 1.0
**Статус**: Production Ready с оговорками по аутентификации