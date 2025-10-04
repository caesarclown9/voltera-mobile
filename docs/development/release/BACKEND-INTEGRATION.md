# 🔌 Backend Integration Guide - EvPower Mobile

## 📋 СОДЕРЖАНИЕ
1. [API Архитектура](#api-архитектура)
2. [Аутентификация](#аутентификация)
3. [Основные API методы](#основные-api-методы)
4. [WebSocket интеграция](#websocket-интеграция)
5. [Обработка ошибок](#обработка-ошибок)
6. [Синхронизация данных](#синхронизация-данных)

---

## 🏗️ API АРХИТЕКТУРА

### Структура взаимодействия
```
Mobile App
    ↓
services/evpowerApi.ts (Единый API клиент)
    ↓
    ├── EvPower API (https://ocpp.evpower.kg/api/v1)
    │   ├── /charging/*  - Управление зарядкой
    │   ├── /locations/* - Локации и станции
    │   ├── /balance/*   - Баланс и платежи
    │   └── /payment/*   - Статусы платежей
    │
    └── Supabase
        ├── Auth (SMS OTP)
        ├── Database (PostgreSQL)
        └── Realtime (WebSocket)
```

### Единый API клиент
```typescript
// services/evpowerApi.ts - ЕДИНСТВЕННЫЙ файл для API

class EvPowerApiService {
  // Все API вызовы через этот класс
  async startCharging(stationId, connectorId, limits)
  async stopCharging(sessionId)
  async getBalance()
  async topupWithQR(amount)
  // ...
}

export const evpowerApi = new EvPowerApiService();
```

---

## 🔐 АУТЕНТИФИКАЦИЯ

### Поток аутентификации
```mermaid
1. User → Phone Number
2. App → Supabase.auth.signInWithOtp(phone)
3. Supabase → SMS with OTP
4. User → Enter OTP
5. App → Supabase.auth.verifyOtp(phone, token)
6. Supabase → JWT Token + User ID
7. App → Use User ID as client_id in EvPower API
```

### Важные моменты
- **НЕТ JWT токенов** в EvPower API
- **client_id = Supabase User ID**
- **Токен Supabase** хранится в Secure Storage
- **Автообновление** токена через interceptors

### Код аутентификации
```typescript
// features/auth/services/authService.ts

async signIn(phone: string): Promise<void> {
  // 1. Отправка OTP
  const { error } = await supabase.auth.signInWithOtp({
    phone: phone,
    options: {
      channel: 'sms',
      shouldCreateUser: true
    }
  });

  // 2. После ввода OTP
  const { data } = await supabase.auth.verifyOtp({
    phone,
    token: otp,
    type: 'sms'
  });

  // 3. client_id = data.user.id
}
```

---

## 📡 ОСНОВНЫЕ API МЕТОДЫ

### 1. Начало зарядки
```typescript
// Запрос
POST /api/v1/charging/start
{
  "client_id": "uuid",      // Supabase User ID
  "station_id": "EVI-0001", // ID станции
  "connector_id": 1,        // Номер коннектора (1, 2, 3...)
  "energy_kwh": 20,         // Опционально: лимит в кВт·ч
  "amount_som": 300         // Опционально: лимит в сомах
}

// Ответ успешный
{
  "success": true,
  "session_id": "uuid",
  "reserved_amount": 300,
  "limit_type": "energy",
  "limit_value": 20,
  "rate_per_kwh": 15
}

// Ответ с ошибкой
{
  "success": false,
  "error": "insufficient_balance",
  "required_amount": 300,
  "current_balance": 100
}
```

### 2. Статус зарядки
```typescript
// Запрос
GET /api/v1/charging/status/{session_id}

// Ответ
{
  "success": true,
  "session": {
    "id": "uuid",
    "status": "charging",
    "energy_consumed": 5.2,    // кВт·ч
    "current_cost": 78,         // сом
    "charging_duration_minutes": 15,
    "charging_power": 22,       // кВт
    "progress_percent": 26,     // % от лимита
    "limit_reached": false,
    "ev_battery_soc": 65        // % батареи авто
  }
}
```

### 3. Остановка зарядки
```typescript
// Запрос
POST /api/v1/charging/stop
{
  "session_id": "uuid"
}

// Ответ
{
  "success": true,
  "final_cost": 156,
  "energy_consumed": 10.4,
  "refunded_amount": 144,    // Возврат неиспользованного
  "duration_minutes": 30
}
```

### 4. Пополнение баланса QR
```typescript
// Запрос
POST /api/v1/balance/topup-qr
{
  "client_id": "uuid",
  "amount": 500,
  "description": "Пополнение через приложение"
}

// Ответ
{
  "success": true,
  "invoice_id": "INV123",
  "qr_code": "base64_data",       // Данные для QR
  "qr_code_url": "https://...",   // URL картинки QR
  "app_link": "odengi://...",     // Deeplink
  "qr_expires_at": "2024-01-01T12:15:00Z",
  "invoice_expires_at": "2024-01-01T12:20:00Z"
}
```

### 5. Статус платежа
```typescript
// Запрос
GET /api/v1/payment/status/{invoice_id}

// Ответ
{
  "success": true,
  "status": 1,              // 0=processing, 1=approved, 2=canceled
  "status_text": "approved",
  "amount": 500,
  "can_start_charging": true
}
```

### 6. Пополнение баланса картой (OBANK)
```typescript
// Запрос
POST /api/v1/balance/topup-card
{
  "client_id": "uuid",
  "amount": 1000,                     // сом (10-100000)
  "card_pan": "4169585512345678",    // 16 цифр
  "card_holder": "IVAN IVANOV",      // латиница
  "card_expiry": "12/25",            // MM/YY
  "card_cvv": "123",                 // 3 цифры
  "description": "Пополнение баланса"
}

// Ответ: транзакция одобрена
{
  "success": true,
  "transaction_id": "TRX-20250930-001234",
  "amount": 1000,
  "status": "approved",
  "new_balance": 1500,
  "card_mask": "416958******5678",
  "timestamp": "2025-09-30T12:05:00Z"
}

// Ответ: требуется 3DS
{
  "success": true,
  "requires_3ds": true,
  "acs_url": "https://3ds.bank.com/auth",
  "pa_req": "base64_encoded_data",
  "md": "transaction_md",
  "term_url": "https://ocpp.evpower.kg/api/v1/payment/3ds-callback"
}

// Ошибки
{
  "success": false,
  "error": "insufficient_funds",      // Недостаточно средств
  "message": "Недостаточно средств на карте"
}
```

**Статус**: 🚧 Backend готов, ожидаются production credentials от OBANK
**Тестирование**: Работает на test-rakhmet.dengi.kg:4431
**Production**: После получения credentials и сертификатов от банка

**Тестовые карты** (для разработки):
- Успешная: 4169 5855 1234 5678 (CVV: 123, Expiry: 12/25)
- С 3DS: 4169 5855 8765 4321 (CVV: 123, Expiry: 12/25)
- Отклонена: 4169 5855 1111 1111 (недостаточно средств)

---

### 7. Избранные станции (через Supabase)
```typescript
// Все операции с избранным выполняются через Supabase напрямую
// Таблица: user_favorites

// Получить избранные
const { data } = await supabase
  .from('user_favorites')
  .select('location_id')
  .eq('user_id', userId);

// Добавить в избранное
const { error } = await supabase
  .from('user_favorites')
  .insert({ user_id: userId, location_id: stationId });

// Удалить из избранного
const { error } = await supabase
  .from('user_favorites')
  .delete()
  .eq('user_id', userId)
  .eq('location_id', stationId);
```

---

## 🔄 WEBSOCKET ИНТЕГРАЦИЯ

### Supabase Realtime
```typescript
// Подписка на изменения баланса
supabase
  .channel('balance-changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'clients',
      filter: `id=eq.${userId}`
    },
    (payload) => {
      updateBalance(payload.new.balance);
    }
  )
  .subscribe();

// Подписка на статус зарядки
supabase
  .channel('charging-status')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'charging_sessions',
      filter: `client_id=eq.${userId}`
    },
    (payload) => {
      updateChargingStatus(payload.new);
    }
  )
  .subscribe();

// Подписка на изменения избранного
supabase
  .channel('favorites-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'user_favorites',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Обновление списка избранных
      updateFavorites(payload);
    }
  )
  .subscribe();
```

### WebSocket для локаций ✅ РАБОТАЕТ
```typescript
// Прямое WebSocket соединение
const ws = new WebSocket(
  `wss://ocpp.evpower.kg/api/v1/ws/locations?client_id=${clientId}`
);

ws.onopen = () => {
  console.log('Connected to stations status');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'stations_update') {
    // Обновление статусов станций в реальном времени
    updateStationStatuses(data.stations);
  } else if (data.type === 'ping') {
    // Heartbeat - отправить pong
    ws.send(JSON.stringify({ type: 'pong' }));
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected, reconnecting in 5s...');
  setTimeout(reconnect, 5000);
};

// Формат сообщений от сервера:
// {
//   "type": "stations_update",
//   "timestamp": "2025-09-30T12:05:00Z",
//   "stations": [
//     {
//       "station_id": "EVI-0001",
//       "location_id": "LOC-0001",
//       "status": "available",
//       "connectors": [
//         {
//           "connector_id": 1,
//           "type": "CCS2",
//           "status": "available",
//           "power_kw": 120
//         }
//       ]
//     }
//   ]
// }
```

**Update Frequency**:
- Full update каждые 60 секунд
- Incremental update при изменении статуса
- Heartbeat каждые 30 секунд

---

## ⚠️ ОБРАБОТКА ОШИБОК

### Коды ошибок API
```typescript
const ERROR_CODES = {
  // Клиент
  'client_not_found': 'Клиент не найден',
  'insufficient_balance': 'Недостаточно средств',

  // Станция
  'station_unavailable': 'Станция недоступна',
  'station_offline': 'Станция не в сети',
  'connector_occupied': 'Коннектор занят',

  // Платежи
  'payment_not_found': 'Платеж не найден',
  'payment_expired': 'Время оплаты истекло',

  // Общие
  'invalid_request': 'Некорректный запрос',
  'internal_error': 'Внутренняя ошибка сервера',
  'timeout': 'Превышено время ожидания'
};
```

### Обработчик ошибок
```typescript
// services/evpowerApi.ts

private async apiRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    // Логирование
    console.error(`API Error: ${endpoint}`, error);

    // User-friendly сообщение
    const message = ERROR_CODES[error.code] || 'Произошла ошибка';

    // Показать уведомление
    showNotification({ type: 'error', message });

    throw error;
  }
}
```

---

## 🔄 СИНХРОНИЗАЦИЯ ДАННЫХ

### Стратегия синхронизации
1. **Primary source**: EvPower API
2. **Cache layer**: Supabase
3. **Local state**: React Query

### Поток данных
```typescript
// 1. Запрос данных
const { data } = useQuery({
  queryKey: ['balance', userId],
  queryFn: async () => {
    // Сначала пробуем API
    try {
      return await evpowerApi.getBalance();
    } catch (error) {
      // Fallback на Supabase
      const { data } = await supabase
        .from('clients')
        .select('balance')
        .eq('id', userId)
        .single();
      return data?.balance;
    }
  },
  staleTime: 30000,        // Кэш на 30 сек
  refetchInterval: 60000   // Обновление каждую минуту
});

// 2. Обновление после действий
const mutation = useMutation({
  mutationFn: evpowerApi.startCharging,
  onSuccess: () => {
    // Инвалидация кэша
    queryClient.invalidateQueries(['balance']);
    queryClient.invalidateQueries(['charging-status']);
  }
});

// 3. Realtime обновления
useEffect(() => {
  const subscription = supabase
    .channel('updates')
    .on('postgres_changes', { /* ... */ }, (payload) => {
      // Обновление React Query кэша
      queryClient.setQueryData(['balance'], payload.new.balance);
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

---

## 📊 МОНИТОРИНГ И ЛОГИРОВАНИЕ

### Логирование запросов
```typescript
// services/evpowerApi.ts

private async apiRequest(endpoint: string, options: RequestInit) {
  const startTime = Date.now();

  console.log(`[API] Request: ${endpoint}`, {
    method: options.method,
    body: options.body
  });

  try {
    const result = await fetch(/* ... */);

    console.log(`[API] Response: ${endpoint}`, {
      duration: Date.now() - startTime,
      status: result.status
    });

    return result;
  } catch (error) {
    console.error(`[API] Error: ${endpoint}`, {
      duration: Date.now() - startTime,
      error
    });
    throw error;
  }
}
```

### Метрики производительности
```typescript
// Отслеживание времени ответа
const metrics = {
  apiCalls: 0,
  totalDuration: 0,
  errors: 0,

  get averageResponseTime() {
    return this.apiCalls ? this.totalDuration / this.apiCalls : 0;
  }
};
```

---

## 🔒 БЕЗОПАСНОСТЬ

### Принципы безопасности
1. **HTTPS only** - все запросы через защищенное соединение
2. **No hardcoded secrets** - все ключи через env переменные
3. **Input validation** - проверка всех входных данных
4. **Error masking** - скрытие технических деталей ошибок

**Note**: Rate limiting планируется в v1.1 (пока реализуйте debounce/throttle на клиенте)

### Защита данных
```typescript
// Никогда не логируем чувствительные данные
const sanitizeData = (data: any) => {
  const sanitized = { ...data };
  if (sanitized.password) sanitized.password = '***';
  if (sanitized.token) sanitized.token = '***';
  if (sanitized.card_number) sanitized.card_number = '****';
  return sanitized;
};
```

---

## 📋 ФОРМАТЫ ДАННЫХ

### Даты и время
**Формат**: ISO 8601 (UTC)
```typescript
"2025-09-30T12:00:00Z"           // Без микросекунд
"2025-09-30T12:00:00.123456Z"    // С микросекундами
```

**Клиент должен**: конвертировать в локальное время для отображения

### Числовые типы
```typescript
// Баланс
balance: number              // DECIMAL(10,2) - 0.00 до 99,999,999.99 сом
                             // Пример: 150.50, 1200.00

// Энергия
energy_consumed: number      // DECIMAL(10,3) - кВт·ч
                             // Пример: 15.234, 0.001

// Мощность
charging_power: number       // INTEGER - кВт (приходит уже в кВт, не Вт)
                             // Пример: 22, 120

// Цена
price_per_kwh: number        // DECIMAL(10,2) - сом/кВт·ч
                             // Пример: 13.50, 15.00
```

### Строковые идентификаторы
```typescript
station_id: string           // Формат: "EVP-XXX-YY" или "EVI-XXXX"
location_id: string          // Формат: "EVP-LOC-XXX" или "LOC-XXXX"
session_id: string           // UUID v4
client_id: string            // UUID v4 (Supabase auth.uid())
invoice_id: string           // Формат: "INV-YYYYMMDD-NNNNNN"
```

### Коды ошибок
```typescript
// Клиент
'client_not_found'
'insufficient_balance'
'invalid_client_id'

// Станция
'station_not_found'
'station_unavailable'
'station_offline'
'station_maintenance'

// Коннектор
'connector_not_found'
'connector_occupied'
'connector_faulted'

// Зарядка
'session_not_found'
'session_already_active'
'ocpp_communication_error'

// Платежи
'payment_not_found'
'payment_expired'
'payment_declined'
'card_invalid'
'card_blocked'
'insufficient_funds'
'invalid_cvv'

// Общие
'invalid_request'
'validation_error'
'internal_error'
'timeout'
```

---

## 📝 ЧЕКЛИСТ ИНТЕГРАЦИИ

- [x] Единый API клиент создан
- [x] Аутентификация через Supabase
- [x] Основные эндпоинты реализованы
- [x] Обработка ошибок настроена
- [x] React Query кэширование
- [x] Realtime подписки Supabase
- [x] WebSocket для станций ✅
- [x] Оплата картой OBANK (ожидает credentials)
- [ ] Метрики и мониторинг
- [ ] Rate limiting (v1.1)
- [ ] Retry логика

---

**Документ обновлен**: 2025-09-30
**Версия API**: v1.0.0
**Последние изменения**: Добавлены форматы данных, обновлен статус WebSocket и OBANK, убраны Firebase/Push уведомления