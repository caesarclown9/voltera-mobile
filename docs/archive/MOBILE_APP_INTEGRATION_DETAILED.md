# Детальные ответы на вопросы мобильного разработчика EvPower

**Дата**: 2025-09-30
**Версия API**: 1.0
**Статус**: Production Ready

---

## 1. WebSocket для real-time обновлений локаций/станций

### ✅ Реализовано и доступно

**Endpoint**: `wss://ocpp.evpower.kg/api/v1/ws/locations?client_id=YOUR_CLIENT_ID`

### Техническая реализация

**Код**: `/backend/app/api/v1/locations/websocket.py`

```typescript
// Подключение к WebSocket
const ws = new WebSocket('wss://ocpp.evpower.kg/api/v1/ws/locations?client_id=YOUR_CLIENT_ID');

ws.onopen = () => {
  console.log('WebSocket подключен');

  // Автоматическая подписка на все локации происходит сразу
  // Дополнительно можно подписаться на конкретную локацию:
  ws.send(JSON.stringify({
    action: 'subscribe',
    channel: 'location:LOCATION_ID'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Получено обновление:', data);

  switch (data.type) {
    case 'connection':
      // Приветственное сообщение при подключении
      console.log('Подключено:', data.message);
      break;

    case 'location_status_update':
      // Обновление статуса локации
      updateLocationStatus(data.data);
      break;

    case 'station_status_update':
      // Обновление статуса станции
      updateStationStatus(data.data);
      break;

    case 'subscription':
      // Подтверждение подписки/отписки
      console.log('Подписка:', data.status, data.channel);
      break;

    case 'pong':
      // Ответ на ping
      console.log('Pong получен');
      break;

    case 'error':
      console.error('Ошибка WebSocket:', data.message);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket ошибка:', error);
};

ws.onclose = () => {
  console.log('WebSocket отключен');
  // Реализуйте reconnect логику с exponential backoff
  setTimeout(() => reconnect(), 5000);
};
```

### Форматы сообщений

#### От клиента к серверу:

```typescript
// Подписка на все локации
{
  "action": "subscribe",
  "channel": "all"
}

// Подписка на конкретную локацию
{
  "action": "subscribe",
  "channel": "location:EVP-LOC-001"
}

// Подписка на станции локации
{
  "action": "subscribe",
  "channel": "location_stations:EVP-LOC-001"
}

// Отписка
{
  "action": "unsubscribe",
  "channel": "all"
}

// Ping для проверки соединения
{
  "action": "ping"
}
```

#### От сервера к клиенту:

```typescript
// Приветственное сообщение
{
  "type": "connection",
  "status": "connected",
  "client_id": "uuid-client-id",
  "message": "Подключено к обновлениям локаций"
}

// Обновление статуса локации
{
  "type": "location_status_update",
  "data": {
    "location_id": "EVP-LOC-001",
    "status": "available" | "occupied" | "offline" | "maintenance" | "partial",
    "available_connectors": 3,
    "total_connectors": 6,
    "stations_count": 2,
    "available_stations": 1,
    "occupied_stations": 1,
    "timestamp": "2025-09-30T12:00:00Z"
  }
}

// Обновление статуса станции
{
  "type": "station_status_update",
  "data": {
    "station_id": "EVP-001-01",
    "location_id": "EVP-LOC-001",
    "status": "available" | "occupied" | "offline" | "maintenance",
    "connectors": [
      {
        "connector_id": 1,
        "status": "Available" | "Charging" | "Occupied" | "Faulted",
        "power_kw": 22.0
      }
    ],
    "timestamp": "2025-09-30T12:00:00Z"
  }
}

// Подтверждение подписки
{
  "type": "subscription",
  "status": "subscribed" | "unsubscribed",
  "channel": "location:EVP-LOC-001"
}

// Pong ответ
{
  "type": "pong",
  "timestamp": 1696073200.123
}

// Ошибка
{
  "type": "error",
  "message": "Неверный формат JSON"
}
```

### Рекомендации по реализации

1. **Автоматическое переподключение**: Используйте exponential backoff (5s, 10s, 20s, 40s, 60s max)
2. **Ping/Pong**: Отправляйте ping каждые 30 секунд для поддержания соединения
3. **Обработка ошибок**: Показывайте пользователю статус подключения
4. **Кэширование**: Сохраняйте последние данные локально на случай разрыва соединения
5. **client_id**: Используйте Supabase User UUID

### Когда использовать WebSocket vs REST API

- **WebSocket**: Для экрана списка станций (real-time обновления статусов)
- **REST API**: Для детальной информации о конкретной станции при открытии

---

## 2. Синхронизация данных станций между Supabase и OCPP сервером

### Архитектура синхронизации

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  OCPP Станция   │◄───────►│  OCPP WebSocket  │◄───────►│     Redis       │
│   (Физическое   │  OCPP    │     Сервер       │  Pub/Sub│   (Real-time)   │
│   устройство)   │  1.6     │  (Backend)       │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │                            │
                                     │ Обновляет                  │
                                     ▼                            ▼
                            ┌──────────────────┐         ┌─────────────────┐
                            │  Supabase        │◄────────│  WebSocket      │
                            │  PostgreSQL      │  Читает │  Клиенты        │
                            │  (Основная БД)   │         │  (Мобильное     │
                            │                  │         │   приложение)   │
                            └──────────────────┘         └─────────────────┘
```

### Частота обновлений

1. **Heartbeat от станций**: Каждые 60 секунд (настраивается)
2. **StatusNotification**: Мгновенно при изменении статуса коннектора
3. **MeterValues**: Каждые 10-30 секунд во время зарядки
4. **Обновление статусов в БД**: Мгновенно при получении OCPP сообщений
5. **Фоновая задача**: Каждые 2 минуты проверяет heartbeat timeout (5 минут)

### Где брать актуальные данные

#### Для списка станций (List View):

**Рекомендуемый подход - гибридный:**

```typescript
// 1. Первичная загрузка из Supabase (быстро)
const { data: locations } = await supabase
  .from('locations')
  .select(`
    *,
    stations (
      id,
      serial_number,
      status,
      is_available,
      last_heartbeat_at,
      connectors (
        connector_number,
        status,
        connector_type,
        power_kw
      )
    )
  `)
  .eq('status', 'active');

// 2. Подключаем WebSocket для real-time обновлений
const ws = new WebSocket('wss://ocpp.evpower.kg/api/v1/ws/locations?client_id=' + userId);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  if (update.type === 'location_status_update') {
    // Обновляем локальный state
    updateLocationInList(update.data);
  }
};

// 3. Используем Supabase Realtime как fallback
const subscription = supabase
  .channel('locations-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'stations' },
    (payload) => {
      console.log('Station changed:', payload);
      refreshStationInList(payload.new.id);
    }
  )
  .subscribe();
```

#### Для детальной информации о станции:

```typescript
// При открытии экрана конкретной станции - ВСЕГДА запрашиваем REST API
const response = await fetch(
  `https://ocpp.evpower.kg/api/v1/station/status/${stationId}`
);
const stationStatus = await response.json();

// stationStatus содержит:
{
  "success": true,
  "station_id": "EVP-001-01",
  "is_online": true,
  "last_heartbeat": "2025-09-30T12:00:00Z",
  "connectors": [
    {
      "connector_id": 1,
      "status": "Available",
      "connector_type": "GBT",
      "power_kw": 22.0,
      "error_code": null
    }
  ],
  "current_sessions": [],
  "firmware_version": "1.2.3"
}

// Затем polling каждые 10 секунд для активной станции
const pollInterval = setInterval(async () => {
  const updated = await fetch(
    `https://ocpp.evpower.kg/api/v1/station/status/${stationId}`
  );
  updateStationDetails(await updated.json());
}, 10000);
```

### Определение статусов

**Код**: `/backend/app/services/location_status_service.py:25-67`

```python
def determine_location_status(
    available_stations: int,
    occupied_stations: int,
    offline_stations: int,
    maintenance_stations: int
) -> str:
    """
    Приоритет статусов:
    1. offline - если есть офлайн станции
    2. maintenance - если есть станции на обслуживании
    3. occupied - если ВСЕ станции заняты
    4. available - если ВСЕ станции свободны
    5. partial - если есть и свободные и занятые
    """
```

**Статусы локации:**
- `available` - все станции свободны
- `occupied` - все станции заняты
- `offline` - есть офлайн станции
- `maintenance` - есть станции на обслуживании
- `partial` - есть и свободные и занятые

**Статусы станции:**
- `available` - есть свободные коннекторы
- `occupied` - все коннекторы заняты
- `offline` - нет heartbeat > 5 минут
- `maintenance` - административно отключена

**Статусы коннектора (OCPP):**
- `Available` - свободен для зарядки
- `Preparing` - подготовка к зарядке
- `Charging` - идет зарядка
- `SuspendedEVSE` - приостановлено станцией
- `SuspendedEV` - приостановлено электромобилем
- `Finishing` - завершение зарядки
- `Reserved` - зарезервирован
- `Unavailable` - недоступен
- `Faulted` - ошибка

### Рекомендации

1. **Для списка**: Используйте гибридный подход (Supabase + WebSocket)
2. **Для деталей**: REST API `/api/v1/station/status/:id` + polling
3. **Кэширование**: 30 секунд для списка, 10 секунд для деталей
4. **Offline режим**: Показывайте последние известные данные из кэша

---

## 3. Endpoint для получения статусов всех станций сразу

### ✅ Реализовано

**Endpoint**: `GET /api/v1/locations?include_status=true`

**Код**: `/backend/app/api/v1/locations/locations.py`

```typescript
// Получение всех локаций с актуальными статусами
const response = await fetch(
  'https://ocpp.evpower.kg/api/v1/locations?include_status=true'
);

const data = await response.json();

// Response:
{
  "success": true,
  "locations": [
    {
      "id": "EVP-LOC-001",
      "name": "ТЦ Дордой Плаза",
      "address": "ул. Московская, 123",
      "city": "Бишкек",
      "country": "Кыргызстан",
      "coordinates": {
        "latitude": 42.8746,
        "longitude": 74.5698
      },
      "status": "available",  // 🔥 Актуальный real-time статус
      "stations_summary": {
        "total": 3,
        "available": 2,
        "occupied": 1,
        "offline": 0,
        "maintenance": 0
      },
      "connectors_summary": {
        "total": 6,
        "available": 4,
        "occupied": 2,
        "faulted": 0
      },
      // 🔥 Станции включены только если include_stations=true
      "stations": [
        {
          "id": "EVP-001-01",
          "serial_number": "EVPCS-001",
          "model": "ChargePoint Express 250",
          "status": "available",
          "power_capacity": 22.0,
          "connectors_count": 2,
          "tariff": {
            "price_per_kwh": 13.5,
            "session_fee": 0,
            "currency": "KGS"
          },
          "connectors_summary": {
            "available": 2,
            "occupied": 0,
            "faulted": 0
          }
        }
      ]
    }
  ],
  "total_locations": 1,
  "cached": false
}
```

### Параметры запроса

```typescript
// Только локации без деталей станций (быстро)
GET /api/v1/locations

// Локации с полной информацией о станциях
GET /api/v1/locations?include_stations=true

// Конкретная локация с деталями
GET /api/v1/locations?location_id=EVP-LOC-001&include_stations=true

// По городу
GET /api/v1/locations?city=Бишкек&include_stations=true
```

### Кэширование

- **TTL**: 30 секунд (настраивается в `location_status_service.py:22`)
- **Ключ кэша**: `locations_status:all` для всех локаций
- **Хранилище**: Redis

### Рекомендация

**Используйте этот endpoint для первичной загрузки списка станций**, затем подключайте WebSocket для real-time обновлений. Это оптимальный баланс между скоростью и актуальностью данных.

---

## 4. Формат данных коннекторов

### Текущее несоответствие - это НОРМА

**Ситуация:**
- `connectors_count: 3` но в таблице `connectors` только 2 записи
- `connector_types: ["GBT", "GBT"]` - дублирующиеся типы

### Объяснение

1. **`connectors_count`** - это **физическая характеристика станции** (сколько розеток на устройстве)
2. **Записи в таблице `connectors`** - это **активные/настроенные коннекторы** в системе
3. **`connector_types`** - массив типов **активных** коннекторов (может содержать дубликаты)

### Пример из реальной жизни

```typescript
// Станция EVP-001-01
{
  "connectors_count": 3,  // На устройстве 3 розетки

  // Но в БД только 2 коннектора активны:
  "connectors": [
    { "connector_number": 1, "connector_type": "GBT", "status": "available" },
    { "connector_number": 2, "connector_type": "GBT", "status": "available" }
    // Коннектор 3 может быть не настроен или отключен
  ],

  // Поэтому connector_types содержит только типы активных:
  "connector_types": ["GBT", "GBT"]
}
```

### Правила

✅ **Нормально:**
- `connectors_count > количество записей в connectors` - часть коннекторов отключена
- `connector_types` содержит дубликаты - несколько коннекторов одного типа
- Пропущенные номера (1, 2, 5 без 3, 4) - коннекторы 3 и 4 отключены

❌ **Ошибка (требует проверки):**
- `connectors_count < количество записей в connectors` - ошибка конфигурации
- `connector_number > connectors_count` - коннектор за пределами физических возможностей

### Рекомендация для UI

```typescript
// Показывайте реальное количество ДОСТУПНЫХ коннекторов:
const availableConnectors = station.connectors.filter(
  c => c.status === 'available'
).length;

// Для иконок типов - используйте unique типы:
const uniqueTypes = [...new Set(station.connector_types)];
// ["GBT", "GBT"] → ["GBT"]

// Для поиска по типу - используйте исходный массив:
const hasGBT = station.connector_types.includes("GBT");
```

---

## 5. Аутентификация и client_id

### ✅ Текущий подход ПРАВИЛЬНЫЙ

**Архитектура:**

```
┌────────────────────┐
│  Мобильное         │
│  приложение        │
└────────┬───────────┘
         │
         │ 1. SMS OTP / Email
         │
         ▼
┌────────────────────┐
│  Supabase Auth     │  ← Вся аутентификация здесь
│  (JWT токены)      │
└────────┬───────────┘
         │
         │ 2. Получаем user.id (UUID)
         │
         ▼
┌────────────────────┐
│  client_id =       │
│  user.id           │
└────────┬───────────┘
         │
         │ 3. Передаем в каждый запрос
         │
         ▼
┌────────────────────┐
│  EvPower OCPP API  │  ← НЕТ своей аутентификации
│  (Backend)         │     Доверяет client_id
└────────────────────┘
```

### Правильная реализация

```typescript
// 1. Инициализация Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://YOUR_PROJECT.supabase.co',
  'YOUR_ANON_KEY'
);

// 2. Аутентификация (SMS OTP)
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+996555123456'
});

// Пользователь вводит код из SMS
const { data: session, error: verifyError } = await supabase.auth.verifyOtp({
  phone: '+996555123456',
  token: '123456',
  type: 'sms'
});

// 3. Получаем client_id
const userId = session.user.id; // UUID
const clientId = userId; // client_id = user.id

// 4. Сохраняем локально
await AsyncStorage.setItem('client_id', clientId);

// 5. Используем в запросах к EvPower API
const startCharging = async () => {
  const response = await fetch('https://ocpp.evpower.kg/api/v1/charging/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // ⚠️ НЕ НУЖНЫ токены авторизации для EvPower API
    },
    body: JSON.stringify({
      client_id: clientId,  // ✅ Просто передаем client_id
      station_id: 'EVP-001-01',
      connector_id: 1,
      energy_kwh: 10
    })
  });
};
```

### Важные моменты

1. **НЕТ дополнительной регистрации** в системе EvPower - client_id создается автоматически при первом запросе
2. **НЕТ JWT токенов** для EvPower API - только для Supabase
3. **НЕ НУЖНО** передавать `Authorization` header в запросах к EvPower API
4. **client_id = Supabase User UUID** - это единственный идентификатор

### Безопасность

⚠️ **Текущая реализация доверяет client_id** - это нормально для MVP, но для production рекомендуем:

```typescript
// Будущее улучшение (не реализовано):
// Добавить Supabase JWT в header для валидации
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${session.access_token}`, // Supabase JWT
}

// Backend будет проверять:
// 1. JWT валидный?
// 2. client_id в body совпадает с user.id из JWT?
```

### Создание записи клиента

Запись в таблице `clients` создается автоматически:

```typescript
// При первом запросе к любому endpoint (например, /balance)
const response = await fetch(
  `https://ocpp.evpower.kg/api/v1/balance/${clientId}`
);

// Если клиента нет в БД - создается автоматически:
// INSERT INTO clients (id, balance, status, created_at)
// VALUES (client_id, 0, 'active', NOW());
```

---

## 6. Обработка ошибок недостаточного баланса

### Логика резервирования

**Код**: `/backend/app/api/v1/charging/service.py:207-311`

```typescript
// Сценарий 1: Лимит по энергии
{
  "client_id": "uuid",
  "station_id": "EVP-001-01",
  "connector_id": 1,
  "energy_kwh": 20  // Хочу 20 кВт⋅ч
}

// Backend рассчитывает:
// estimated_cost = (20 кВт⋅ч × 13.5 сом/кВт⋅ч) + session_fee
// estimated_cost = 270 + 0 = 270 сом
//
// Резервируется: 270 сом
// Лимит: 20 кВт⋅ч (зарядка остановится при достижении)

// Ответ:
{
  "success": true,
  "reserved_amount": 270,
  "limit_type": "energy",
  "limit_value": 20,
  "rate_per_kwh": 13.5,
  "session_fee": 0
}

// Сценарий 2: Лимит по сумме
{
  "client_id": "uuid",
  "station_id": "EVP-001-01",
  "connector_id": 1,
  "amount_som": 100  // Хочу потратить 100 сом
}

// Backend рассчитывает:
// max_energy = (100 сом - session_fee) / rate_per_kwh
// max_energy = 100 / 13.5 = 7.4 кВт⋅ч
//
// Резервируется: 100 сом
// Лимит: 100 сом (зарядка остановится при достижении суммы)

// Ответ:
{
  "success": true,
  "reserved_amount": 100,
  "limit_type": "amount",
  "limit_value": 100,
  "rate_per_kwh": 13.5,
  "estimated_energy": 7.4  // Примерно столько зарядится
}

// Сценарий 3: Недостаточно средств
{
  "client_id": "uuid",  // Баланс: 50 сом
  "station_id": "EVP-001-01",
  "connector_id": 1,
  "energy_kwh": 20  // Нужно: 270 сом
}

// Ответ:
{
  "success": false,
  "error": "insufficient_balance",
  "message": "Недостаточно средств. Баланс: 50 сом, требуется: 270 сом",
  "current_balance": 50,
  "required_amount": 270
}
```

### Ответы на вопросы

**Q: `required_amount` - это минимальная сумма для старта зарядки?**
A: Нет, это **рассчитанная стоимость согласно указанному лимиту**. Если запрошено 20 кВт⋅ч, то `required_amount = 20 × rate_per_kwh + session_fee`.

**Q: Или это стоимость всей зарядки согласно выбранному лимиту?**
A: **Да, именно это!** `required_amount` = стоимость зарядки до достижения лимита.

**Q: Если у пользователя 100 сом, но минимум 50 сом - может ли он начать зарядку с лимитом 50 сом?**
A: **Да, конечно!** Нет фиксированного минимума. Пользователь может:

```typescript
// Вариант 1: Указать сумму 50 сом
{
  "amount_som": 50
}
// Зарядится примерно на 50/13.5 = 3.7 кВт⋅ч

// Вариант 2: Указать 3 кВт⋅ч
{
  "energy_kwh": 3
}
// Зарезервируется 3 × 13.5 = 40.5 сом

// Вариант 3: Безлимитная с малым балансом
{
  // Без лимитов
}
// Зарезервируется min(balance, 200) = 100 сом
// ⚠️ Но есть минимум 10 сом для безлимитной
```

### Минимальные суммы

```python
# Код: /backend/app/api/v1/charging/service.py:270-289

# Для безлимитной зарядки:
min_reservation = 10.0  # сом

# Для зарядки с лимитами:
# НЕТ минимума! Можно зарядить хоть на 5 сом
```

### Рекомендации для UI

```typescript
// Экран выбора лимита
const userBalance = 150; // сом
const ratePerKwh = 13.5; // сом/кВт⋅ч

// Вариант 1: Ползунок по энергии
const maxEnergy = userBalance / ratePerKwh; // 11.1 кВт⋅ч
<Slider
  min={1}
  max={maxEnergy}
  step={0.5}
  value={selectedEnergy}
  label={`${selectedEnergy} кВт⋅ч ≈ ${selectedEnergy * ratePerKwh} сом`}
/>

// Вариант 2: Ползунок по сумме
<Slider
  min={10}  // Минимум только для безлимитной
  max={userBalance}
  step={10}
  value={selectedAmount}
  label={`${selectedAmount} сом ≈ ${selectedAmount / ratePerKwh} кВт⋅ч`}
/>

// Вариант 3: Быстрый выбор
<QuickSelect>
  <Button>25% ({userBalance * 0.25} сом)</Button>
  <Button>50% ({userBalance * 0.5} сом)</Button>
  <Button>100% (Весь баланс)</Button>
</QuickSelect>
```

---

## 7. Резервирование баланса при старте зарядки

### ✅ Ваше понимание ПРАВИЛЬНОЕ

### Жизненный цикл резервирования

```
┌─────────────────────────────────────────────────────────────┐
│ 1. До зарядки                                              │
│                                                             │
│ Баланс клиента: 500 сом                                     │
│ Доступно для использования: 500 сом                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ POST /charging/start
                          │ { energy_kwh: 20 }
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Резервирование (расчет: 20 × 13.5 = 270 сом)          │
│                                                             │
│ UPDATE clients SET balance = 500 - 270 = 230              │
│ INSERT INTO payment_transactions                            │
│   type: 'charge_reserve'                                   │
│   amount: -270                                             │
│                                                             │
│ Баланс клиента: 230 сом (в БД)                            │
│ Зарезервировано: 270 сом (в сессии)                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Зарядка идет...
                          │ Фактически потреблено: 15 кВт⋅ч
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Остановка (расчет: 15 × 13.5 = 202.5 сом)             │
│                                                             │
│ actual_cost = 202.5 сом                                    │
│ reserved = 270 сом                                         │
│ refund = 270 - 202.5 = 67.5 сом                           │
│                                                             │
│ UPDATE clients SET balance = 230 + 67.5 = 297.5           │
│ INSERT INTO payment_transactions                            │
│   type: 'charge_refund'                                    │
│   amount: +67.5                                            │
│                                                             │
│ UPDATE charging_sessions                                    │
│   amount = 202.5                                           │
│   energy = 15                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Финальный баланс                                        │
│                                                             │
│ Было: 500 сом                                              │
│ Потрачено: 202.5 сом                                       │
│ Осталось: 297.5 сом ✅                                     │
└─────────────────────────────────────────────────────────────┘
```

### Сценарии

#### Сценарий 1: Потреблено меньше резерва (типичный)

```typescript
// Старт
balance: 500 сом
reserved: 270 сом (20 кВт⋅ч)
available: 230 сом

// Стоп (фактически 15 кВт⋅ч)
actual_cost: 202.5 сом
refund: 67.5 сом
new_balance: 297.5 сом ✅

// Транзакции в БД:
[
  { type: 'charge_reserve', amount: -270, balance_after: 230 },
  { type: 'charge_refund', amount: +67.5, balance_after: 297.5 }
]
```

#### Сценарий 2: Потреблено больше резерва (редко)

```typescript
// Старт
balance: 500 сом
reserved: 270 сом (20 кВт⋅ч)
available: 230 сом

// Стоп (фактически 25 кВт⋅ч) - превышен лимит из-за задержки остановки
actual_cost: 337.5 сом
additional_charge: 67.5 сом

// Проверка баланса для доплаты
if (available_balance >= additional_charge) {
  // Списываем доплату
  new_balance: 230 - 67.5 = 162.5 сом ✅
} else {
  // Недостаточно для доплаты - списываем что есть
  additional_charge = available_balance;
  new_balance: 0 сом
  // Создается задолженность (долг)
}

// Транзакции в БД:
[
  { type: 'charge_reserve', amount: -270, balance_after: 230 },
  { type: 'charge_payment', amount: -67.5, balance_after: 162.5 }
]
```

#### Сценарий 3: Потреблено ровно резерв

```typescript
// Старт
balance: 500 сом
reserved: 270 сом (20 кВт⋅ч)
available: 230 сом

// Стоп (ровно 20 кВт⋅ч)
actual_cost: 270 сом
refund: 0 сом
additional_charge: 0 сом
new_balance: 230 сом ✅

// Транзакции в БД:
[
  { type: 'charge_reserve', amount: -270, balance_after: 230 }
  // Нет дополнительных транзакций
]
```

### Ответы на вопросы

**Q: Это правильное понимание?**
A: **Да, абсолютно правильно!** Резервирование → зарядка → расчет → возврат остатка (или доплата).

**Q: Показывать ли "замороженную" сумму отдельно от доступного баланса?**
A: **Да, рекомендуем показывать!** Это повышает прозрачность.

```typescript
// Рекомендуемый UI во время зарядки
┌──────────────────────────────────┐
│ Ваш баланс                       │
├──────────────────────────────────┤
│ Доступно:     230 сом            │
│ Зарезервировано: 270 сом         │
│ ────────────────────────          │
│ Всего:        500 сом            │
└──────────────────────────────────┘

// Или в одной строке:
"Баланс: 230 сом (+ 270 сом зарезервировано)"

// После остановки:
┌──────────────────────────────────┐
│ Зарядка завершена                │
├──────────────────────────────────┤
│ Потреблено:   15 кВт⋅ч           │
│ Стоимость:    202.5 сом          │
│ Возвращено:   67.5 сом           │
│                                  │
│ Новый баланс: 297.5 сом ✅       │
└──────────────────────────────────┘
```

**Q: Или показывать итоговый доступный баланс?**
A: **Зависит от контекста экрана:**

- **Экран "Баланс"**: Показывайте детали (доступно + зарезервировано)
- **Главный экран**: Показывайте только доступный баланс
- **Экран зарядки**: Показывайте оба значения

### Получение информации о резервировании

```typescript
// GET /api/v1/charging/status/{session_id}
{
  "success": true,
  "session_id": "uuid",
  "status": "started",

  // Финансы
  "reserved_amount": 270,           // Зарезервировано при старте
  "current_cost": 135,              // Текущая стоимость (в процессе)
  "energy_consumed": 10,            // Потреблено кВт⋅ч
  "rate_per_kwh": 13.5,

  // Прогресс
  "limit_type": "energy",
  "limit_value": 20,
  "limit_percentage": 50,           // 10 из 20 кВт⋅ч = 50%

  "duration_minutes": 25
}

// После остановки (status: "stopped"):
{
  "status": "stopped",
  "reserved_amount": 270,
  "final_cost": 202.5,              // Финальная стоимость
  "refunded_amount": 67.5,          // Возвращено
  "energy_consumed": 15
}
```

### Код реализации

**Резервирование**: `/backend/app/api/v1/charging/service.py:345-350`
**Возврат**: `/backend/app/api/v1/charging/service.py:642-665`
**Доплата**: `/backend/app/api/v1/charging/service.py:667-690`

---

## 8. Формат даты/времени в API

### Стандарт: ISO 8601 с timezone

**Формат**: `YYYY-MM-DDTHH:MM:SS.ffffffZ` или `YYYY-MM-DDTHH:MM:SS.ffffff+00:00`

```typescript
// Примеры из реальных ответов:
{
  "start_time": "2025-09-30T12:34:56.789000Z",        // UTC с Z
  "stop_time": "2025-09-30T13:45:12.123456+00:00",   // UTC с +00:00
  "created_at": "2025-09-30T18:00:00+06:00",         // Бишкек UTC+6
  "last_heartbeat": "2025-09-30T12:00:00Z"           // UTC
}
```

### Timezone

**Backend использует**:
- **Хранение в БД**: UTC (без timezone в PostgreSQL, но логически UTC)
- **Возврат в API**: UTC с суффиксом `Z` или `+00:00`
- **Расчеты**: `datetime.now(timezone.utc)` везде в коде

**Локальное время Бишкека**: UTC+6 (без перехода на летнее время)

### Конвертация на фронтенде

```typescript
// 1. Получаем от API (всегда UTC)
const response = await fetch('/api/v1/charging/status/uuid');
const data = await response.json();

// data.start_time = "2025-09-30T12:00:00Z"

// 2. Парсим в Date объект
const startTime = new Date(data.start_time);
// JavaScript автоматически парсит ISO 8601

// 3. Форматируем в локальное время пользователя
// Вариант A: Используем локальный timezone устройства (рекомендуется)
const localTime = startTime.toLocaleString('ru-RU', {
  timeZone: 'Asia/Bishkek',  // Явно указываем Бишкек
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});
// "30.09.2025, 18:00:00" (UTC+6)

// Вариант B: Используем библиотеку date-fns
import { format, parseISO } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

const utcDate = parseISO(data.start_time);
const bishkekDate = utcToZonedTime(utcDate, 'Asia/Bishkek');
const formatted = format(bishkekDate, 'dd.MM.yyyy HH:mm');
// "30.09.2025 18:00"

// Вариант C: Для React Native - используем moment-timezone
import moment from 'moment-timezone';

const momentDate = moment.utc(data.start_time);
const bishkekTime = momentDate.tz('Asia/Bishkek');
const formatted = bishkekTime.format('DD.MM.YYYY HH:mm');
// "30.09.2025 18:00"
```

### Отправка дат в API

```typescript
// НЕ ТРЕБУЕТСЯ! Все даты генерируются на backend
// Но если нужно отправить дату (например, дату рождения):

const userBirthday = new Date('1990-05-15');
const isoString = userBirthday.toISOString();
// "1990-05-15T00:00:00.000Z"

await fetch('/api/user/profile', {
  method: 'PUT',
  body: JSON.stringify({
    birthday: isoString  // ✅ Отправляем ISO 8601
  })
});
```

### Рекомендации

1. **Всегда используйте локальный timezone пользователя** для отображения
2. **Храните в UTC** локально в кэше/базе
3. **Для Кыргызстана**: Используйте `Asia/Bishkek` timezone (UTC+6)
4. **Библиотеки**:
   - React Native: `moment-timezone` или `date-fns-tz`
   - Flutter: `intl` package
   - Swift: `DateFormatter` с `timeZone`
   - Kotlin: `java.time.ZonedDateTime`

### Относительное время

```typescript
// Для "5 минут назад", "2 часа назад"
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const lastHeartbeat = parseISO(station.last_heartbeat);
const relativeTime = formatDistanceToNow(lastHeartbeat, {
  addSuffix: true,
  locale: ru
});
// "5 минут назад"

// Или для длительности зарядки:
const duration = intervalToDuration({
  start: parseISO(session.start_time),
  end: new Date()
});

const formatted = `${duration.hours}ч ${duration.minutes}м`;
// "1ч 25м"
```

---

## 9. Rate limiting и ограничения

### ❌ Rate Limiting НЕ РЕАЛИЗОВАН в текущей версии

**Статус**: Планируется для v1.1

**Код**: `/backend/app/core/config.py` - нет настроек rate limiting

### Текущие ограничения

```yaml
# Технические лимиты (из конфигурации):
Max Request Size: 10 MB
Connection Timeout: 30 секунд
WebSocket Idle Timeout: 60 секунд
Max Active Sessions: Без ограничений (на одного клиента)

# OCPP лимиты:
Station Heartbeat Timeout: 300 секунд (5 минут)
Station Heartbeat Interval: 60 секунд (рекомендуемый)

# Кэш лимиты:
Location Cache TTL: 30 секунд
Pricing Cache TTL: 300 секунд (5 минут)

# Платежные лимиты:
QR Code Lifetime: 5 минут
Invoice Lifetime: 5 минут
Payment Check Interval: 15 секунд
Payment Max Checks: 20 (итого 5 минут)
```

### Рекомендуемые лимиты на клиенте

```typescript
// Реализуйте rate limiting на стороне клиента:

// 1. Throttling для запросов статуса
let lastStatusCheck = 0;
const MIN_STATUS_INTERVAL = 10000; // 10 секунд

async function checkChargingStatus(sessionId) {
  const now = Date.now();
  if (now - lastStatusCheck < MIN_STATUS_INTERVAL) {
    return; // Пропускаем запрос
  }

  lastStatusCheck = now;
  const status = await fetch(`/api/v1/charging/status/${sessionId}`);
  // ...
}

// 2. Debouncing для поиска станций
import { debounce } from 'lodash';

const searchStations = debounce(async (query) => {
  const results = await fetch(`/api/v1/locations?search=${query}`);
  // ...
}, 500); // 500ms задержка

// 3. Exponential backoff для ошибок
let retryCount = 0;
const MAX_RETRIES = 5;

async function startChargingWithRetry(data) {
  try {
    const response = await fetch('/api/v1/charging/start', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed');

    retryCount = 0; // Сброс при успехе
    return await response.json();

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
      retryCount++;

      await new Promise(resolve => setTimeout(resolve, delay));
      return startChargingWithRetry(data);
    }

    throw error;
  }
}
```

### Response коды (если будет реализован rate limiting)

```typescript
// 429 Too Many Requests (НЕ РЕАЛИЗОВАНО сейчас)
{
  "error": "rate_limit_exceeded",
  "message": "Слишком много запросов. Попробуйте через 60 секунд",
  "retry_after": 60 // секунды
}

// Headers (планируются):
X-RateLimit-Limit: 100       // Максимум запросов в окне
X-RateLimit-Remaining: 85    // Осталось запросов
X-RateLimit-Reset: 1696073200 // Unix timestamp сброса счетчика
```

### Рекомендации

1. **Для статуса зарядки**: Polling не чаще 10 секунд
2. **Для списка станций**: Используйте WebSocket, а не polling
3. **Для баланса**: Кэшируйте локально, обновляйте после платежей/зарядок
4. **Для оплаты**: Проверка статуса платежа - каждые 3 секунды (максимум 20 раз)
5. **Для истории**: Pagination + infinite scroll, а не загрузка всего сразу

### Будущие планы (v1.1)

```yaml
Планируется реализовать:
  - Rate Limiting: 100 запросов в минуту на client_id
  - Sliding Window Counter алгоритм
  - Redis для хранения счетчиков
  - 429 response с Retry-After header
  - Whitelist для внутренних сервисов
```

---

## 10. Мониторинг и логирование на бэкенде

### ✅ Реализовано

**Код**: `/backend/app/core/logging_config.py`, `/backend/app/main.py:26-35`

### Структура логирования

```python
# Настроенные логгеры:
OCPPHandler   - INFO   # OCPP протокол и станции
OCPP          - INFO   # Библиотека ocpp
websockets    - INFO   # WebSocket соединения
fastapi       - INFO   # FastAPI события
uvicorn       - INFO   # HTTP сервер
payment       - INFO   # Платежные операции (добавлен PaymentAuditMiddleware)
security      - INFO   # Безопасность (добавлен SecurityMiddleware)
```

### Что логируется

#### 1. Запросы от мобильного приложения

**Код**: `/backend/app/core/security_middleware.py`

```python
# Каждый HTTP запрос логируется:
# - Method, URL, client IP
# - Request headers
# - Response status code
# - Duration (время выполнения)

# Пример лога:
[2025-09-30 12:34:56] INFO - POST /api/v1/charging/start - 200 OK - 245ms - IP: 192.168.1.100
```

#### 2. Платежные операции

**Код**: `/backend/app/core/payment_audit.py`

```python
# Аудит всех платежных операций:
# - /balance/topup-qr
# - /balance/topup-card
# - /payment/status/*
# - /charging/start (резервирование)
# - /charging/stop (списание/возврат)

# Пример лога:
[2025-09-30 12:35:00] INFO - 💳 TOPUP: client_id=uuid, amount=100.00, invoice_id=INV123, provider=OBANK
[2025-09-30 12:40:00] INFO - 💳 CHARGE_RESERVE: session_id=uuid, amount=270.00, client_id=uuid
[2025-09-30 13:00:00] INFO - 💳 CHARGE_REFUND: session_id=uuid, refund=67.50, client_id=uuid
```

#### 3. OCPP события

```python
# Все OCPP сообщения от станций:
[2025-09-30 12:00:00] INFO - BootNotification: station=EVP-001-01, vendor=ChargePoint, model=Express250
[2025-09-30 12:01:00] INFO - Heartbeat: station=EVP-001-01
[2025-09-30 12:35:00] INFO - StatusNotification: station=EVP-001-01, connector=1, status=Charging
[2025-09-30 12:35:00] INFO - StartTransaction: station=EVP-001-01, connector=1, id_tag=+996555123456
[2025-09-30 13:00:00] INFO - StopTransaction: station=EVP-001-01, transaction_id=123, meter=15000Wh
```

#### 4. Ошибки и исключения

```python
# Все ошибки с полным traceback:
[2025-09-30 12:35:00] ERROR - Ошибка старта зарядки: Connector not available
Traceback (most recent call last):
  File "/backend/app/api/v1/charging/start.py", line 45, in start_charging
    ...
```

### Статистика ошибок и успешных запросов

#### Получение из логов:

```bash
# Подключитесь к серверу и используйте grep:

# 1. Ошибки за последний час
docker logs evpower-backend --since 1h 2>&1 | grep ERROR

# 2. Успешные запросы /charging/start
docker logs evpower-backend --since 1d 2>&1 | grep "POST /api/v1/charging/start" | grep "200 OK"

# 3. Платежные операции
docker logs evpower-backend --since 1d 2>&1 | grep "💳"

# 4. Статистика по кодам ответа
docker logs evpower-backend --since 1d 2>&1 | grep -oP '\d{3} \w+' | sort | uniq -c
```

#### Получение из БД:

```sql
-- Статистика зарядок за сегодня
SELECT
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'started') as active,
  COUNT(*) FILTER (WHERE status = 'stopped') as completed,
  COUNT(*) FILTER (WHERE status = 'error') as failed,
  SUM(amount) as total_revenue,
  SUM(energy) as total_energy_kwh
FROM charging_sessions
WHERE DATE(start_time) = CURRENT_DATE;

-- Популярные станции
SELECT
  s.serial_number,
  COUNT(cs.id) as sessions_count,
  SUM(cs.amount) as revenue
FROM charging_sessions cs
JOIN stations s ON cs.station_id = s.id
WHERE cs.start_time >= NOW() - INTERVAL '7 days'
GROUP BY s.id, s.serial_number
ORDER BY sessions_count DESC
LIMIT 10;

-- Статистика платежей
SELECT
  DATE(created_at) as date,
  COUNT(*) as transactions_count,
  SUM(amount) FILTER (WHERE amount > 0) as total_topup,
  SUM(ABS(amount)) FILTER (WHERE amount < 0) as total_spent
FROM payment_transactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Dashboard для мониторинга

**❌ НЕТ встроенного dashboard**

**Рекомендуется**:
1. **Grafana** + **Prometheus** - для метрик в реальном времени
2. **Supabase Dashboard** - для SQL запросов к данным
3. **Coolify Logs** - для просмотра логов контейнера

### Куда писать при проблемах

```yaml
# Технические проблемы API:
Email: support@evpower.kg
GitHub Issues: https://github.com/evpower/backend/issues (если есть)

# Проблемы Supabase:
Supabase Dashboard: https://app.supabase.com/project/YOUR_PROJECT

# Проблемы OCPP станций:
Лог-файлы: docker logs evpower-backend
Мониторинг: GET /health
```

### Access to logs

```bash
# Если у вас есть SSH доступ:
ssh user@ocpp.evpower.kg

# Логи контейнера
docker logs -f evpower-backend

# Логи в файл (если настроено)
tail -f /var/log/evpower-ocpp/app.log

# Поиск по логам
grep "client_id=YOUR_UUID" /var/log/evpower-ocpp/app.log

# Последние 100 строк с ошибками
docker logs evpower-backend 2>&1 | grep ERROR | tail -100
```

---

## 11. Планы по развитию API

### Breaking Changes

**❌ НЕ ПЛАНИРУЮТСЯ в ближайшие 6 месяцев**

**Гарантия обратной совместимости**: Минимум 6 месяцев для v1 API

### Версионирование API

```typescript
// Текущая версия
/api/v1/...          // ✅ Стабильная, production ready

// Legacy (deprecated)
/api/...             // ⚠️ Deprecated, используйте v1

// Будущие версии (когда потребуются)
/api/v2/...          // 🔮 Планируется при major changes
```

### Правила версионирования

1. **Minor changes** (новые поля, endpoints) - добавляются в текущую версию v1
2. **Bug fixes** - обновляются в текущей версии без изменения версии
3. **Breaking changes** - только в новой версии (v2, v3...)

### Как будут анонсироваться изменения

```yaml
# 1. CHANGELOG.md в репозитории
https://github.com/evpower/backend/blob/main/CHANGELOG.md

# 2. API Response Header (планируется)
X-API-Version: 1.0
X-API-Deprecated-Warning: "Этот endpoint будет удален в v2 (2026-01-01)"

# 3. Email уведомления за 3 месяца до breaking changes

# 4. Документация
https://docs.evpower.kg/api/changelog
```

### Roadmap на ближайшие 3-6 месяцев

#### Q4 2025 (Октябрь - Декабрь)

```yaml
v1.1 (Ноябрь 2025):
  Новые функции:
    - ✅ Rate Limiting (100 req/min)
    - ✅ Push уведомления через Firebase
    - ✅ История зарядок API endpoint (пока только через Supabase)
    - ✅ Фильтры для локаций (по типу коннектора, мощности)
    - ✅ Избранные станции (favorites)

  Улучшения:
    - 🔧 Валидация client_id через Supabase JWT
    - 🔧 Расширенная статистика в /charging/status
    - 🔧 Поддержка бонусных программ (loyalty points)

  Безопасность:
    - 🔒 HTTPS везде (уже есть)
    - 🔒 Проверка подписи webhook от платежных систем
    - 🔒 IP whitelist для административных endpoints

v1.2 (Декабрь 2025):
  Новые функции:
    - 🆕 Резервирование станций (reservation)
    - 🆕 Групповая зарядка (split payment)
    - 🆕 Подписки (subscription plans)
    - 🆕 Реферальная программа

  Платежи:
    - 💳 Сохраненные карты (tokenization)
    - 💳 Apple Pay / Google Pay
    - 💳 Автоплатеж при низком балансе

  OCPP:
    - ⚡ OCPP 2.0.1 support (планируется)
    - ⚡ Smart Charging (управление мощностью)
```

#### Q1 2026 (Январь - Март)

```yaml
v1.3:
  - Интеграция с навигацией (routes to stations)
  - Прогноз доступности станций (ML)
  - Динамическое ценообразование (peak/off-peak)
  - Корпоративные аккаунты (fleet management)
  - API для партнеров (third-party integrations)
```

### Deprecated Features

**Нет deprecated features в текущей версии**

Когда появятся:
```typescript
// Пример deprecated endpoint (в будущем)
GET /api/v1/balance/{client_id}
// Headers:
X-Deprecated: true
X-Deprecated-Message: "Используйте /api/v2/wallet/balance"
X-Deprecated-Sunset: "2026-06-01"  // Дата удаления
```

### Как быть в курсе изменений

```yaml
# 1. Подпишитесь на changelog:
https://docs.evpower.kg/api/changelog/subscribe

# 2. Проверяйте response headers:
X-API-Version: 1.0
X-API-Latest-Version: 1.1
X-API-Upgrade-Available: true

# 3. GitHub Watch:
https://github.com/evpower/backend (если публичный)

# 4. Email рассылка для разработчиков:
Отправьте email на dev-subscribe@evpower.kg
```

---

## 12. Тестовое окружение

### ⚠️ Нет отдельного staging окружения (пока)

**Текущая ситуация**:
- **Production**: `https://ocpp.evpower.kg` - единственное окружение
- **Staging**: Отсутствует (планируется)

### Рекомендации для тестирования

#### Подход 1: Используйте тестовые платежи на production

```yaml
# OBANK тестовые карты (работают на production):
Успешная оплата:
  Номер: 4169 5855 1234 5678
  Срок: 12/25
  CVV: 123
  Имя: TEST CARD

3DS аутентификация:
  Номер: 4169 5855 8765 4321
  Срок: 12/25
  CVV: 123
  (Появится экран 3DS, используйте любой код)

Отклоненная карта:
  Номер: 4169 5855 1111 1111
  Срок: 12/25
  CVV: 123

# Тестовый режим OBANK:
Сертификат: test-rakhmet.dengi.kg:4431
Point ID: 4354 (тестовый)
Service ID: 1331 (тестовый)
```

#### Подход 2: Используйте тестовые станции

```yaml
# Тестовые станции (если настроены):
Станция: EVP-TEST-01
  Serial: TEST-001
  Location: Test Location
  Connectors: 2 × GBT
  Статус: Всегда online (симулятор)

Как подключиться к тестовой станции:
  1. Скачайте OCPP 1.6 симулятор:
     https://github.com/mobilityhouse/ocpp-simulator

  2. Настройте подключение:
     URL: ws://ocpp.evpower.kg/ws/YOUR-TEST-STATION-ID
     Protocol: ocpp1.6

  3. Отправьте BootNotification:
     {
       "chargePointVendor": "Test",
       "chargePointModel": "Simulator"
     }
```

#### Подход 3: Используйте тестовые client_id

```typescript
// Создайте тестового пользователя в Supabase:
const { data, error } = await supabase.auth.signUp({
  email: 'test+' + Date.now() + '@evpower.kg',
  password: 'TestPass123!',
  options: {
    data: {
      name: 'Test User',
      phone: '+996555000001'  // Тестовый номер
    }
  }
});

const testClientId = data.user.id;

// Пополните баланс через тестовую карту:
await fetch('https://ocpp.evpower.kg/api/v1/balance/topup-card', {
  method: 'POST',
  body: JSON.stringify({
    client_id: testClientId,
    amount: 1000,  // Тестовая сумма
    card_pan: '4169585512345678',  // Тестовая карта
    // ...
  })
});
```

### Планируется: Staging окружение (Q4 2025)

```yaml
Staging URL (планируется):
  API: https://staging.ocpp.evpower.kg
  WebSocket: wss://staging.ocpp.evpower.kg
  База данных: Отдельная Supabase project (staging)

Особенности:
  - Копия production данных (anonymized)
  - Тестовые платежные шлюзы
  - Симуляторы станций
  - Быстрый reset данных
  - Swagger UI enabled (в staging)

Доступ:
  Запросите через: dev-access@evpower.kg
  Получите:
    - staging_client_id
    - staging_api_key
    - доступ к Postman collection
```

### Текущие возможности для QA

```yaml
1. Unit тесты:
   /backend/tests/*.py
   Запуск: pytest backend/tests/

2. Postman коллекция:
   Запросите: dev@evpower.kg
   Включает:
     - Все endpoints
     - Примеры запросов
     - Тестовые данные
     - Environment variables

3. OCPP симулятор:
   Репозиторий: (запросите у команды)
   Позволяет:
     - Симулировать станции
     - Тестировать зарядку
     - Отправлять OCPP команды

4. Supabase local development:
   npx supabase start
   Локальная копия БД для разработки
```

### Best Practices для тестирования на production

```typescript
// 1. Используйте префикс для тестовых данных
const testEmail = `test+${Date.now()}@evpower.kg`;
const testPhone = '+996555999' + Math.floor(Math.random() * 1000);

// 2. Ограничивайте суммы
const MAX_TEST_AMOUNT = 10; // Максимум 10 сом для тестов

// 3. Логируйте все тестовые операции
console.log('[TEST]', operation, { clientId, amount, stationId });

// 4. Cleanup после тестов
afterEach(async () => {
  // Остановите активные сессии
  await stopAllTestSessions();

  // Удалите тестовые данные (если нужно)
  await cleanupTestData();
});

// 5. Используйте feature flags
const IS_TEST_USER = userEmail.startsWith('test+');
if (IS_TEST_USER) {
  // Особая логика для тестовых пользователей
  enableDebugMode();
}
```

### Контакт для доступа к тестированию

```yaml
Email: dev@evpower.kg
Telegram: @evpower_dev
Запросите:
  - Postman collection
  - OCPP simulator setup
  - Тестовые данные станций
  - Доступ к staging (когда появится)
```

---

## 📋 ИТОГОВЫЙ ЧЕКЛИСТ ДЛЯ ИНТЕГРАЦИИ

### ✅ Что точно работает и готово к использованию

- [x] **WebSocket для локаций** - `wss://ocpp.evpower.kg/api/v1/ws/locations`
- [x] **REST API для всех операций** - Все endpoints `/api/v1/*`
- [x] **Статусы станций real-time** - Обновляются мгновенно
- [x] **Пополнение баланса** - QR (O!Dengi) и Карты (OBANK)
- [x] **Зарядка** - Start/Stop/Status с резервированием
- [x] **Динамическое ценообразование** - Гибкие тарифы
- [x] **Аутентификация через Supabase** - Простая интеграция
- [x] **Логирование и мониторинг** - Все запросы/платежи логируются

### ⚠️ Что требует внимания

- [ ] **Аутентификация** - Нужна интеграция Supabase SDK
- [ ] **История зарядок** - Только через Supabase, нет REST endpoint
- [ ] **История платежей** - Только через Supabase, нет REST endpoint
- [ ] **Push уведомления** - Не реализованы, используйте WebSocket
- [ ] **Rate Limiting** - Не реализован, делайте на клиенте
- [ ] **Локализация** - Не реализована, делайте на клиенте

### 🔧 Рекомендации по реализации

1. **Используйте гибридный подход для данных**:
   - Список станций: Supabase + WebSocket для обновлений
   - Детали станции: REST API `/station/status/:id`
   - История: Прямые запросы к Supabase

2. **Кэшируйте разумно**:
   - Список локаций: 30 секунд
   - Детали станции: 10 секунд при активной зарядке
   - Баланс: Обновляйте после платежей/зарядок

3. **Обрабатывайте offline режим**:
   - Показывайте последние данные из кэша
   - Индикатор "Данные могут быть устаревшими"
   - Retry с exponential backoff

4. **Показывайте пользователю детали финансов**:
   - Зарезервированная сумма во время зарядки
   - Возврат средств после зарядки
   - Прозрачные расчеты стоимости

5. **Реализуйте reconnect для WebSocket**:
   - Exponential backoff (5s, 10s, 20s...)
   - Максимум 5 попыток
   - Показывайте статус подключения

### 📞 КОНТАКТЫ

**По техническим вопросам API:**
- Email: support@evpower.kg
- Документация: Этот файл + API_INTEGRATION_ANSWERS.md

**По вопросам Supabase:**
- Документация: https://supabase.com/docs
- Dashboard: https://app.supabase.com

**По вопросам OCPP:**
- Спецификация: OCPP 1.6J
- Код: `/backend/ocpp_ws_server/`

---

**Последнее обновление**: 2025-09-30
**Версия документа**: 2.0
**Автор**: Backend Team EvPower
**Статус**: Production Ready
