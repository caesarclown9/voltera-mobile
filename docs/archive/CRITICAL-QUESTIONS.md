# КРИТИЧЕСКИЕ ВОПРОСЫ ДЛЯ УТОЧНЕНИЯ

## 🔴 БЛОКИРУЮЩИЕ ВОПРОСЫ (без ответов невозможно продолжить)

### 1. Схема управления пользователями

**Текущая путаница:**
- В коде приложения: создание записей в Supabase таблице `clients`
- В ответах API: клиенты управляются на OCPP сервере с полями (id, name, phone, balance, status)
- Supabase Auth для авторизации, но где хранятся данные клиента?

**ВОПРОСЫ:**
1. Где создается запись клиента при регистрации?
   - [ ] В Supabase таблице `clients`?
   - [ ] На OCPP сервере через API?
   - [ ] Автоматически при первом запросе с client_id?

2. Как синхронизируются данные между Supabase и OCPP сервером?
   - [ ] OCPP сервер читает из Supabase?
   - [ ] Supabase синхронизирует с OCPP?
   - [ ] Нет синхронизации, данные дублируются?

3. Откуда брать актуальный баланс?
   - [ ] GET /api/v1/balance/{client_id} с OCPP сервера?
   - [ ] Из Supabase таблицы `clients`?
   - [ ] Синхронизированы автоматически?

### 2. Процесс регистрации нового пользователя

**Какой правильный flow?**

#### Вариант A (через Supabase):
```typescript
1. supabase.auth.signUp({ email, password })
2. Получаем user.id
3. Создаем запись в Supabase clients таблице
4. OCPP сервер автоматически узнает о новом клиенте?
```

#### Вариант B (через OCPP API):
```typescript
1. supabase.auth.signUp({ email, password })
2. Получаем user.id
3. POST /api/v1/clients/register с данными?
4. OCPP сервер создает клиента
```

#### Вариант C (автоматически):
```typescript
1. supabase.auth.signUp({ email, password })
2. При первом запросе с client_id OCPP создает клиента автоматически?
```

### 3. Структура таблиц Supabase

**Какие таблицы существуют и используются?**

```sql
-- Эти таблицы точно есть?
clients (id, email, phone, name, balance, ...)
charging_sessions (id, user_id, station_id, ...)
payment_transactions_odengi (id, client_id, amount, ...)

-- Или другая структура?
```

### 4. История операций

**В ответах сказано использовать Supabase для истории:**

```sql
SELECT * FROM charging_sessions WHERE user_id = ?
SELECT * FROM payment_transactions_odengi WHERE client_id = ?
```

**ВОПРОСЫ:**
1. `user_id` в charging_sessions это тот же `client_id`?
2. Кто записывает данные в эти таблицы?
   - [ ] OCPP сервер через Supabase Admin API?
   - [ ] Triggers в Supabase?
   - [ ] Приложение само должно записывать?

### 5. Получение client_id

**Текущий код:**
```typescript
const { user } = await supabase.auth.signIn(...)
const client_id = user.id // UUID от Supabase Auth
```

**Это правильно?**
- [ ] Да, client_id = Supabase Auth User ID
- [ ] Нет, client_id генерируется отдельно
- [ ] client_id берется из таблицы clients

### 6. Тестовые credentials для Supabase

**Нужны для разработки:**
```env
VITE_SUPABASE_URL=?
VITE_SUPABASE_ANON_KEY=?

# Тестовый аккаунт
TEST_EMAIL=?
TEST_PASSWORD=?
TEST_CLIENT_ID=?
```

## 📝 ЧТО НУЖНО СДЕЛАТЬ ПОСЛЕ ПОЛУЧЕНИЯ ОТВЕТОВ

1. **Если клиенты в Supabase:**
   - Оставить текущий код создания в таблице clients
   - Настроить RLS правила
   - Синхронизировать структуру с OCPP

2. **Если клиенты только на OCPP:**
   - Удалить создание в Supabase
   - Реализовать endpoint регистрации (если есть)
   - Использовать только client_id от Auth

3. **Если гибридная схема:**
   - Понять что где хранится
   - Настроить синхронизацию
   - Определить источник истины для каждого поля

## ⚠️ РИСКИ БЕЗ УТОЧНЕНИЯ

1. **Дублирование данных** - клиент создается и в Supabase и на OCPP
2. **Рассинхронизация баланса** - разные значения в разных местах
3. **Потеря истории** - записи не попадают в нужные таблицы
4. **Ошибки авторизации** - неправильный client_id
5. **Невозможность зарядки** - OCPP не знает о клиенте

---

**КРИТИЧНО:** Без ответов на эти вопросы невозможно правильно настроить интеграцию!

**Дата**: 2025-09-29