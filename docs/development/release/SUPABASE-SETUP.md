# 🔧 Supabase Configuration Guide - EvPower

## 📋 СОДЕРЖАНИЕ
1. [Создание проекта](#создание-проекта)
2. [Настройка базы данных](#настройка-базы-данных)
3. [Настройка аутентификации](#настройка-аутентификации)
4. [Row Level Security](#row-level-security)
5. [Realtime настройки](#realtime-настройки)
6. [Environment переменные](#environment-переменные)

---

## 🚀 СОЗДАНИЕ ПРОЕКТА

### 1. Создание нового проекта Supabase
```
1. Перейти на https://supabase.com
2. Sign In / Sign Up
3. New Project
4. Настройки:
   - Name: evpower-production
   - Database Password: [Сгенерировать сложный пароль]
   - Region: Frankfurt (eu-central-1) или ближайший
   - Pricing Plan: Free для начала, Pro для production
```

### 2. Получение ключей
```
Project Settings → API →
- URL: https://xxxxx.supabase.co
- anon/public key: eyJhbGc...
- service_role key: eyJhbGc... (НИКОГДА не использовать на клиенте!)
```

---

## 📊 НАСТРОЙКА БАЗЫ ДАННЫХ

### Структура таблиц

```sql
-- 1. Таблица клиентов (пользователей)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email VARCHAR(255),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    balance DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    favorite_stations TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица локаций
CREATE TABLE locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Kyrgyzstan',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица станций
CREATE TABLE stations (
    id VARCHAR(50) PRIMARY KEY,
    location_id VARCHAR(50) REFERENCES locations(id),
    serial_number VARCHAR(100) UNIQUE,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    power_capacity INTEGER,
    connector_types TEXT[],
    status VARCHAR(50) DEFAULT 'active',
    price_per_kwh DECIMAL(10,2),
    session_fee DECIMAL(10,2) DEFAULT 0,
    firmware_version VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Таблица коннекторов
CREATE TABLE connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id VARCHAR(50) REFERENCES stations(id),
    connector_number INTEGER NOT NULL,
    connector_type VARCHAR(50),
    power_kw INTEGER,
    status VARCHAR(50) DEFAULT 'available',
    error_code VARCHAR(100),
    UNIQUE(station_id, connector_number),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Таблица сессий зарядки
CREATE TABLE charging_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    station_id VARCHAR(50) REFERENCES stations(id),
    connector_id INTEGER,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    energy_consumed DECIMAL(10,3),
    total_cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'active',
    limit_type VARCHAR(20),
    limit_value DECIMAL(10,2),
    reserved_amount DECIMAL(10,2),
    ocpp_transaction_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Таблица транзакций
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2),
    balance_after DECIMAL(10,2),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    invoice_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Таблица платежей O!Dengi
CREATE TABLE payment_transactions_odengi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    invoice_id VARCHAR(100) UNIQUE,
    order_id VARCHAR(100),
    amount DECIMAL(10,2),
    status INTEGER DEFAULT 0,
    status_text VARCHAR(50),
    qr_code TEXT,
    qr_code_url TEXT,
    app_link TEXT,
    qr_expires_at TIMESTAMPTZ,
    invoice_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Таблица избранных станций (NEW!)
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    -- ВАЖНО: user_id VARCHAR(255) для совместимости с auth.uid()::text в RLS
    -- TODO v1.1: Рассмотреть миграцию к UUID для лучшей производительности
    location_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, location_id)
);

-- Индексы для производительности
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_stations_location ON stations(location_id);
CREATE INDEX idx_connectors_station ON connectors(station_id);
CREATE INDEX idx_sessions_client ON charging_sessions(client_id);
CREATE INDEX idx_sessions_status ON charging_sessions(status);
CREATE INDEX idx_transactions_client ON transactions(client_id);
CREATE INDEX idx_payments_invoice ON payment_transactions_odengi(invoice_id);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_location_id ON user_favorites(location_id);

-- Триггеры для updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_favorites_updated_at BEFORE UPDATE ON user_favorites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 🔐 НАСТРОЙКА АУТЕНТИФИКАЦИИ

### 1. Включение Phone Auth
```
Authentication → Providers → Phone →
- Enable Phone provider: ✅
- SMS Provider: Twilio (или другой)
- Twilio Settings:
  - Account SID: [из Twilio Console]
  - Auth Token: [из Twilio Console]
  - Message Service SID: [из Twilio Console]
```

### 2. Настройка SMS шаблона
```
Authentication → Templates → SMS Message →

Текст сообщения:
"Ваш код подтверждения для EvPower: {{.Code}}"
```

### 3. Auth настройки
```
Authentication → Settings →
- Site URL: https://evpower.kg
- Redirect URLs:
  - https://evpower.kg/*
  - evpower://auth-callback
  - com.evpower.app://auth-callback
- JWT Expiry: 3600 (1 час)
- Enable signup: ✅
```

---

## 🔒 ROW LEVEL SECURITY (RLS)

### Включение RLS для всех таблиц
```sql
-- Включить RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE charging_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions_odengi ENABLE ROW LEVEL SECURITY;
```

### Политики безопасности
```sql
-- Clients: пользователи видят только свои данные
CREATE POLICY "Users can view own profile" ON clients
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON clients
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Stations: все видят все станции
CREATE POLICY "Stations are viewable by everyone" ON stations
    FOR SELECT USING (true);

-- Locations: все видят все локации
CREATE POLICY "Locations are viewable by everyone" ON locations
    FOR SELECT USING (true);

-- Connectors: все видят все коннекторы
CREATE POLICY "Connectors are viewable by everyone" ON connectors
    FOR SELECT USING (true);

-- Charging sessions: пользователи видят только свои
CREATE POLICY "Users can view own sessions" ON charging_sessions
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Users can create own sessions" ON charging_sessions
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Transactions: пользователи видят только свои
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = client_id);

-- Payment transactions: пользователи видят только свои
CREATE POLICY "Users can view own payments" ON payment_transactions_odengi
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Users can create own payments" ON payment_transactions_odengi
    FOR INSERT WITH CHECK (auth.uid() = client_id);

-- User favorites: пользователи управляют только своими избранными
CREATE POLICY "Users can view own favorites" ON user_favorites
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own favorites" ON user_favorites
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own favorites" ON user_favorites
    FOR DELETE USING (auth.uid()::text = user_id);

-- Admins can view all favorites
CREATE POLICY "Admins can view all favorites" ON user_favorites
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id::text = auth.uid()::text
            AND u.role IN ('admin', 'superadmin', 'operator')
            AND u.is_active = true
        )
    );
```

---

## 📡 REALTIME НАСТРОЙКИ

### Включение Realtime
```sql
-- Включить realtime для таблиц
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE user_favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE charging_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
```

### Настройка в Dashboard
```
Database → Replication →
Включить для таблиц:
- clients (для баланса)
- user_favorites (для избранного) ⭐ NEW
- charging_sessions (для статуса зарядки)
- transactions (для истории)
```

---

## 🔧 ENVIRONMENT ПЕРЕМЕННЫЕ

### Development (.env.local)
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# API Configuration
VITE_API_URL=https://ocpp.evpower.kg/api

# Google Maps (optional)
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

### Production (на сервере)
```bash
# То же самое, но production ключи
VITE_SUPABASE_URL=https://production.supabase.co
VITE_SUPABASE_ANON_KEY=production_anon_key

# НИКОГДА не добавлять service_role ключ на клиент!
```

---

## 📊 МИГРАЦИИ И SEED DATA

### Начальные данные (seed.sql)
```sql
-- Тестовые локации
INSERT INTO locations (id, name, address, city, latitude, longitude) VALUES
('LOC-0001', 'EVION Глобус Медерова', 'ул. Медерова 3', 'Бишкек', 42.8746, 74.5698),
('LOC-0003', 'EVION Car Box', 'ул. Ибраимова 42', 'Бишкек', 42.8656, 74.5833),
('LOC-0009', 'Байтур', 'ул. Жанышерова', 'Бишкек', 42.82, 74.6),
('LOC-0011', 'Ажыбек баатыра', 'ул. Ажыбек баатыра', 'Бишкек', 42.84, 74.58),
('LOC-0013', 'Глобус Жал', 'ул. Жалыла', 'Бишкек', 42.83, 74.59);

-- Тестовые станции
INSERT INTO stations (id, location_id, serial_number, model, manufacturer, power_capacity, connector_types, price_per_kwh) VALUES
('EVI-0001', 'LOC-0001', 'EVI-0001', 'DC-120', 'EVION', 120, ARRAY['CCS2', 'CHAdeMO'], 12.00),
('EVI-0003', 'LOC-0003', 'EVI-0003', 'DC-120', 'EVION', 120, ARRAY['CCS2'], 12.00),
('EVI-0009', 'LOC-0009', 'EVI-0009', 'DC-120', 'EVION', 120, ARRAY['CCS2'], 12.00),
('EVI-0011', 'LOC-0011', 'EVI-0011', 'AC-25', 'EVION', 25, ARRAY['Type2'], 9.00),
('EVI-0013', 'LOC-0013', 'EVI-0013', 'DC-120', 'EVION', 120, ARRAY['CHAdeMO'], 12.00);

-- Тестовые коннекторы
INSERT INTO connectors (station_id, connector_number, connector_type, power_kw, status) VALUES
('EVI-0001', 1, 'CCS2', 120, 'available'),
('EVI-0001', 2, 'CHAdeMO', 120, 'available'),
('EVI-0003', 1, 'CCS2', 120, 'available'),
('EVI-0009', 1, 'CCS2', 120, 'occupied'),
('EVI-0011', 1, 'Type2', 25, 'available'),
('EVI-0013', 1, 'CHAdeMO', 120, 'occupied');
```

---

## 🔄 BACKUP И ВОССТАНОВЛЕНИЕ

### Создание backup
```bash
# Через Supabase CLI
supabase db dump > backup.sql

# Через Dashboard
Settings → Backups → Download
```

### Восстановление
```bash
# Через Supabase CLI
supabase db reset
psql -h db.xxxxx.supabase.co -U postgres < backup.sql
```

---

## 📈 МОНИТОРИНГ

### Метрики для отслеживания
1. **Database**:
   - Размер БД
   - Количество подключений
   - Slow queries

2. **Auth**:
   - Количество регистраций
   - Failed auth attempts
   - SMS delivery rate

3. **Realtime**:
   - Активные подписки
   - Message throughput
   - Connection errors

### Настройка алертов
```
Project Settings → Integrations →
- Webhook для критических событий
- Email уведомления для превышения лимитов
```

---

## 🚨 ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **НИКОГДА** не использовать service_role ключ на клиенте
2. **ВСЕГДА** использовать RLS для защиты данных
3. **РЕГУЛЯРНО** делать backup базы данных
4. **МОНИТОРИТЬ** использование и лимиты
5. **ТЕСТИРОВАТЬ** RLS политики перед production

---

## 📝 ЧЕКЛИСТ НАСТРОЙКИ

- [ ] Проект создан
- [ ] Ключи получены и сохранены
- [ ] Таблицы созданы
- [ ] RLS включен и настроен
- [ ] Phone Auth настроен
- [ ] Realtime включен
- [ ] Seed data загружен
- [ ] Backup настроен
- [ ] Environment переменные установлены
- [ ] Тестирование проведено

---

**Документ обновлен**: 2025-09-30
**Версия Supabase**: Latest
**Последние изменения**:
- Добавлена таблица user_favorites с RLS политиками
- Добавлен комментарий про тип user_id (VARCHAR vs UUID)
- Обновлены Realtime настройки