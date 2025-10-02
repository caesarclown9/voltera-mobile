# 🔑 Требуемые Credentials для EvPower Mobile v1.0.0

**Дата создания**: 2025-09-29
**КРИТИЧНО**: Без этих данных приложение не будет работать!

---

## 1. 🔴 ОБЯЗАТЕЛЬНЫЕ ДАННЫЕ (блокируют работу)

### 1.1 Supabase Configuration

**Где взять**: Supabase Dashboard → Settings → API

```env
# URL вашего Supabase проекта
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Публичный anon ключ (безопасно использовать в клиенте)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeHh4eHh4eHh4eCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjI3MjA4NTM0LCJleHAiOjE5NDI3ODQ1MzR9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Формат**:
- `SUPABASE_URL`: Полный URL в формате `https://[project-ref].supabase.co`
- `SUPABASE_ANON_KEY`: JWT токен длиной ~200-250 символов, начинается с `eyJ`

**Где найти в Supabase**:
1. Войдите в https://app.supabase.com
2. Выберите ваш проект
3. Settings (слева внизу) → API
4. Скопируйте:
   - `URL` из раздела "Project URL"
   - `anon public` ключ из раздела "Project API keys"

⚠️ **ВАЖНО**:
- Используйте ТОЛЬКО `anon` ключ, НЕ `service_role`!
- `service_role` ключ НИКОГДА не должен быть в клиентском приложении!

---

## 2. 🟡 ВАЖНЫЕ ДАННЫЕ (влияют на функционал)

### 2.1 API Configuration

```env
# Backend API URL (уже известен)
VITE_API_URL=https://ocpp.evpower.kg
```

### 2.2 Яндекс Карты (если используется)

**Где взять**: https://developer.tech.yandex.ru/

```env
# API ключ для Яндекс.Карт
VITE_YANDEX_MAPS_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Как получить**:
1. Зарегистрируйтесь на https://developer.tech.yandex.ru/
2. Создайте новый ключ в Кабинете разработчика
3. Выберите сервис "JavaScript API и HTTP Геокодер"
4. Укажите домены/приложения

---

## 3. 🟢 ОПЦИОНАЛЬНЫЕ ДАННЫЕ

### 3.1 Analytics & Monitoring

```env
# Sentry DSN для отслеживания ошибок
VITE_SENTRY_DSN=https://xxxxxxxxxxxxxxxxxx@oxxxxxxx.ingest.sentry.io/xxxxxxx

# Google Analytics
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
```

### 3.2 Push Notifications (планируется)

```env
# Firebase Cloud Messaging
VITE_FCM_SENDER_ID=xxxxxxxxxxxx
VITE_FCM_VAPID_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 4. 🔧 ANDROID ПОДПИСАНИЕ

### 4.1 Создание Keystore

```bash
# Команда для создания нового keystore
keytool -genkey -v -keystore evpower-release.keystore \
  -alias evpower \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Вам будут заданы вопросы:
# - Пароль keystore (минимум 6 символов)
# - Имя и фамилия
# - Организация
# - Город, область, страна
# - Пароль для alias (можно тот же)
```

### 4.2 Настройка переменных окружения

```bash
# Linux/Mac (.bashrc или .zshrc)
export KEYSTORE_FILE=/path/to/evpower-release.keystore
export KEYSTORE_PASSWORD=ваш_пароль_keystore
export KEY_ALIAS=evpower
export KEY_PASSWORD=ваш_пароль_ключа

# Windows (переменные среды)
KEYSTORE_FILE=C:\path\to\evpower-release.keystore
KEYSTORE_PASSWORD=ваш_пароль_keystore
KEY_ALIAS=evpower
KEY_PASSWORD=ваш_пароль_ключа
```

⚠️ **КРИТИЧЕСКИ ВАЖНО**:
- Сохраните keystore в 3 разных местах!
- Запишите пароли в менеджер паролей!
- БЕЗ keystore невозможно обновить приложение в Google Play!

---

## 5. 🍎 iOS СЕРТИФИКАТЫ

### 5.1 Apple Developer Account

- **Есть**: ✅
- **Apple ID**: ваш_email@example.com
- **Team ID**: XXXXXXXXXX (найти в Apple Developer → Membership)

### 5.2 Необходимые сертификаты

1. **iOS Distribution Certificate**
2. **Provisioning Profile (App Store)**
3. **Push Notification Certificate** (если используется)

---

## 6. 📝 ТЕСТОВЫЕ ДАННЫЕ

### 6.1 Тестовый пользователь

```typescript
// Для разработки и тестирования
const TEST_CREDENTIALS = {
  email: "test@evpower.kg",
  password: "Test123456",
  phone: "+996555000001"
};
```

### 6.2 Тестовые платежные карты (OBank)

```typescript
const TEST_CARDS = {
  // Успешная оплата
  success: {
    number: "4169585512345678",
    name: "TEST USER",
    cvv: "123",
    expiry: "12/25"
  },

  // С 3D Secure
  with3ds: {
    number: "4169585587654321",
    name: "TEST USER",
    cvv: "456",
    expiry: "12/25"
  },

  // Отклоненная
  declined: {
    number: "4169585511111111",
    name: "TEST USER",
    cvv: "789",
    expiry: "12/25"
  }
};
```

---

## 7. 📋 ЧЕКЛИСТ НАСТРОЙКИ

### Для начала разработки:

- [ ] Получить Supabase URL и anon key
- [ ] Создать файл `.env.local`:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_URL=https://ocpp.evpower.kg
```

### Для production сборки:

- [ ] Создать файл `.env.production` с production данными
- [ ] Создать Android keystore
- [ ] Настроить переменные окружения для keystore
- [ ] Получить iOS сертификаты
- [ ] Настроить Sentry (опционально)

### Для тестирования:

- [ ] Создать тестового пользователя в Supabase
- [ ] Проверить тестовые станции на бэкенде
- [ ] Настроить тестовый режим платежей

---

## 8. 🚨 БЕЗОПАСНОСТЬ

### ЧТО НИКОГДА НЕ ДЕЛАТЬ:

1. ❌ НЕ коммитить `.env` файлы в git
2. ❌ НЕ использовать `service_role` ключ в клиенте
3. ❌ НЕ хранить пароли в коде
4. ❌ НЕ публиковать keystore файлы
5. ❌ НЕ делиться production credentials

### ЧТО ДЕЛАТЬ:

1. ✅ Использовать `.env.example` файлы без реальных данных
2. ✅ Добавить `.env*` в `.gitignore`
3. ✅ Хранить credentials в менеджере паролей
4. ✅ Использовать CI/CD переменные для автоматизации
5. ✅ Регулярно ротировать ключи

---

## 9. 🆘 TROUBLESHOOTING

### Ошибка: "Missing Supabase configuration"

```bash
# Проверьте что файл .env существует
ls -la .env*

# Проверьте что переменные загружены
npm run dev
# В консоли браузера:
console.log(import.meta.env.VITE_SUPABASE_URL)
```

### Ошибка: "Invalid API key"

- Проверьте что используете `anon` ключ, не `service_role`
- Проверьте что ключ полностью скопирован (200+ символов)
- Проверьте что нет лишних пробелов

### Ошибка при сборке Android

```bash
# Проверьте переменные окружения
echo $KEYSTORE_FILE
echo $KEY_ALIAS

# Проверьте что keystore существует
ls -la $KEYSTORE_FILE
```

---

## 10. 📞 КОНТАКТЫ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ

### Supabase credentials:
- Ответственный: Backend Team
- Доступ: Supabase Dashboard

### API endpoints:
- Документация: API_INTEGRATION_ANSWERS.md
- Тестовый сервер: уточнить у DevOps

### Сертификаты:
- iOS: Apple Developer account owner
- Android: создать самостоятельно

---

**Последнее обновление**: 2025-09-29
**Версия документа**: 1.0