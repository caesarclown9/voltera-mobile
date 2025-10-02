# Release Checklist v1.0.0 - EvPower Mobile App (ОБНОВЛЕН)

## 📋 Общая информация
- **Версия**: 1.0.0
- **Платформы**: Android, iOS (+ планшеты)
- **Backend API**: https://ocpp.evpower.kg/api/v1/
- **Аутентификация**: Supabase Auth
- **App ID**: kg.evpower.app
- **Языки**: Русский, English, Кыргызча
- **Дата обновления**: 2025-09-29

---

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ В АРХИТЕКТУРЕ

### Аутентификация
- ❌ **НЕТ JWT токенов от бэкенда**
- ✅ **Supabase Auth для всей авторизации**
- ✅ **client_id = Supabase User UUID**
- ✅ **Передача client_id напрямую в запросах**

### API Endpoints
- ✅ Использовать `/api/v1/*` (не legacy `/api/*`)
- ❌ Нет endpoints для auth на OCPP сервере
- ✅ История через Supabase (не через API)

---

## 1. ✅ КОДОВАЯ БАЗА

### 1.1 TypeScript типы - ТРЕБУЮТ ПЕРЕРАБОТКИ
- [ ] Удалить поля `email` и `avatar` из `Client` интерфейса
- [ ] Изменить `balance` на number (сомы, не копейки)
- [ ] Добавить `status: 'active' | 'inactive' | 'blocked'` в Client
- [ ] Обновить статусы коннекторов согласно OCPP
- [ ] Обновить статусы зарядных сессий: `'started' | 'stopped' | 'error'`
- [ ] Удалить несуществующие поля из типов

### 1.2 API Сервисы - ПОЛНАЯ ПЕРЕРАБОТКА
- [ ] Удалить все auth endpoints (login, register, refresh)
- [ ] Переписать сервисы под структуру `/api/v1/*`
- [ ] Добавить передачу `client_id` во все запросы
- [ ] Убрать Bearer токены из заголовков
- [ ] Реализовать получение истории через Supabase

### 1.3 Supabase интеграция
- [ ] Проверить подключение Supabase Client
- [ ] Настроить Supabase Auth
- [ ] Реализовать получение client_id из Supabase User
- [ ] Настроить Realtime подписки для обновлений
- [ ] Реализовать запросы к таблицам истории

### 1.4 Компиляция и качество кода
- [ ] Исправить все TypeScript ошибки
- [ ] Пройти ESLint проверку
- [ ] Удалить console.log для продакшена
- [ ] Удалить закомментированный код
- [ ] Проверить все импорты

---

## 2. 🔧 КОНФИГУРАЦИЯ

### 2.1 Версионирование
- [ ] package.json: версия 1.0.0
- [ ] Android build.gradle: versionName "1.0.0", versionCode 1
- [ ] iOS Info.plist: CFBundleShortVersionString 1.0.0
- [ ] capacitor.config.ts: проверить настройки

### 2.2 Environment переменные
```env
# .env.production
VITE_API_URL=https://ocpp.evpower.kg
VITE_SUPABASE_URL=<получить от команды>
VITE_SUPABASE_ANON_KEY=<получить от команды>
```
- [ ] Создать .env.production
- [ ] Настроить Supabase credentials
- [ ] Убрать все dev/test URL

### 2.3 Локализация (на клиенте)
- [ ] Создать файлы локализации: ru.json, en.json, ky.json
- [ ] Реализовать маппинг ошибок API на локальные строки
- [ ] Добавить переключение языков в настройки
- [ ] Проверить все UI тексты

---

## 3. 📱 ANDROID

### 3.1 Конфигурация
- [ ] minSdkVersion: 24
- [ ] targetSdkVersion: 34
- [ ] compileSdkVersion: 34
- [ ] Поддержка планшетов в AndroidManifest

### 3.2 Подписание
- [ ] Создать production keystore
- [ ] Настроить signing config через env переменные
- [ ] Сохранить keystore в безопасном месте (3 копии)
- [ ] НЕ коммитить пароли

### 3.3 Permissions в AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### 3.4 Безопасность
- [ ] ProGuard правила настроены
- [ ] webContentsDebuggingEnabled: false
- [ ] Network security config для HTTPS only
- [ ] Обфускация включена для release

---

## 4. 🍎 iOS

### 4.1 Конфигурация
- [ ] Minimum iOS: 13.0
- [ ] Поддержка iPad в Info.plist
- [ ] Universal app настройки

### 4.2 Подписание
- [ ] ✅ Apple Developer account (есть)
- [ ] App ID создан
- [ ] Provisioning profiles
- [ ] Certificates установлены

### 4.3 Info.plist разрешения
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Для показа ближайших зарядных станций</string>
<key>NSCameraUsageDescription</key>
<string>Для сканирования QR-кода станции</string>
```

### 4.4 Capabilities
- [ ] Push Notifications (планируется)
- [ ] Background Modes (если нужно для tracking)

---

## 5. 🔌 ИНТЕГРАЦИЯ С API

### 5.1 Зарядка - endpoints готовы
- [ ] POST /api/v1/charging/start - с client_id
- [ ] GET /api/v1/charging/status/{session_id}
- [ ] POST /api/v1/charging/stop
- [ ] Обработка всех статусов и ошибок

### 5.2 Платежи - endpoints готовы
- [ ] POST /api/v1/balance/topup-qr (O!Dengi)
- [ ] POST /api/v1/balance/topup-card (OBank с 3DS)
- [ ] GET /api/v1/payment/status/{invoice_id}
- [ ] Таймауты платежей (5 мин QR, 10 мин invoice)

### 5.3 Станции и локации
- [ ] GET /api/v1/locations?include_stations=true
- [ ] GET /api/v1/station/status/{station_id}
- [ ] WebSocket для realtime обновлений
- [ ] Кэширование 30 секунд

### 5.4 История (через Supabase)
```typescript
// Зарядные сессии
supabase.from('charging_sessions')
  .select('*')
  .eq('user_id', client_id)
  .order('created_at', { ascending: false })

// Платежи
supabase.from('payment_transactions_odengi')
  .select('*')
  .eq('client_id', client_id)
  .order('created_at', { ascending: false })
```

---

## 6. 🧪 ТЕСТИРОВАНИЕ

### 6.1 Функциональные тесты

#### Авторизация (Supabase)
- [ ] Регистрация через Supabase Auth
- [ ] Вход по email/паролю
- [ ] Восстановление пароля
- [ ] Сохранение сессии
- [ ] Автологин при запуске

#### Зарядка
- [ ] Получение списка станций
- [ ] Фильтрация по статусу
- [ ] QR сканирование (если используется)
- [ ] Старт зарядки с лимитами
- [ ] Отслеживание статуса
- [ ] Остановка зарядки
- [ ] Расчет финальной стоимости

#### Платежи
- [ ] Пополнение через QR (O!Dengi)
- [ ] Пополнение картой (3DS flow)
- [ ] Проверка статуса платежа
- [ ] Обработка таймаутов
- [ ] Возврат средств при отмене

### 6.2 Интеграционные тесты
- [ ] Полный flow: авторизация → пополнение → зарядка
- [ ] Обработка ошибок сети
- [ ] Работа в офлайн режиме
- [ ] WebSocket переподключение

### 6.3 Тестовое окружение
```yaml
# Использовать для тестирования:
Test Server: https://test-ocpp.evpower.kg/ (уточнить)
Test Client ID: "test-client-123"
Test Stations: ["TEST-STATION-001", "TEST-STATION-002"]

# Тестовые карты OBank:
Успешная: 4169 5855 1234 5678
3DS: 4169 5855 8765 4321
Отклоненная: 4169 5855 1111 1111
```

---

## 7. 🎨 UI/UX

### 7.1 Адаптивность
- [ ] Телефоны 5-7"
- [ ] Планшеты 8-13"
- [ ] Landscape ориентация
- [ ] Safe areas (notches)

### 7.2 Производительность
- [ ] Загрузка < 3 сек
- [ ] FPS > 60
- [ ] Оптимизированные изображения
- [ ] Lazy loading списков

### 7.3 Обработка состояний
- [ ] Loading индикаторы
- [ ] Пустые состояния
- [ ] Ошибки с retry
- [ ] Офлайн режим

---

## 8. 🔒 БЕЗОПАСНОСТЬ

### 8.1 Критические проверки
- [ ] НЕТ хардкод API ключей
- [ ] НЕТ хардкод client_id
- [ ] НЕТ логирования токенов
- [ ] Secure Storage для sensitive данных

### 8.2 Сетевая безопасность
- [ ] HTTPS only
- [ ] Certificate pinning (опционально)
- [ ] Валидация SSL

### 8.3 Обфускация
- [ ] ProGuard для Android
- [ ] Минификация JS кода
- [ ] Source maps отключены в prod

---

## 9. 🚀 СБОРКА И ДЕПЛОЙ

### 9.1 Pre-release checklist
- [ ] Все тесты пройдены
- [ ] Версия 1.0.0 везде
- [ ] Production env настроен
- [ ] Git tag v1.0.0

### 9.2 Android сборка
```bash
# Обновить версию
# versionCode 1, versionName "1.0.0"

# Сборка
npm run build
npx cap sync android
cd android
./gradlew bundleRelease

# Проверка
adb install app-release.apk
```

### 9.3 iOS сборка
```bash
# Обновить версию
# CFBundleVersion 1, CFBundleShortVersionString 1.0.0

# Сборка
npm run build
npx cap sync ios
# Открыть Xcode
# Product → Archive → Validate → Upload
```

### 9.4 Store материалы
- [ ] Screenshots (телефоны + планшеты)
- [ ] Описания (ru, en, ky)
- [ ] Privacy Policy URL
- [ ] Support email
- [ ] Категории приложения

---

## 10. 📊 МОНИТОРИНГ

### 10.1 Crash reporting
- [ ] Sentry настроен
- [ ] Source maps загружены
- [ ] User context включен

### 10.2 Analytics
- [ ] Ключевые события
- [ ] User properties
- [ ] Конверсии

### 10.3 Performance
- [ ] API метрики
- [ ] Startup time
- [ ] Memory usage

---

## ⚠️ БЛОКЕРЫ ДЛЯ РЕЛИЗА

1. **TypeScript ошибки компиляции** - нужно исправить все типы
2. **API сервисы устарели** - переписать под v1 API
3. **Нет production env** - настроить Supabase credentials
4. **Android keystore** - создать для подписи
5. **Версия 0.0.0** - обновить на 1.0.0

---

## ✅ ЧТО УЖЕ ГОТОВО

- ✅ Capacitor настроен
- ✅ Основные плагины подключены
- ✅ Структура проекта
- ✅ API документация получена
- ✅ Apple Developer account

---

## 📌 ПРИОРИТЕТЫ

### Срочно (блокирует релиз):
1. Исправить TypeScript типы под актуальный API
2. Переписать API сервисы на v1 endpoints
3. Настроить Supabase Auth правильно
4. Создать production окружение

### Важно (до релиза):
1. Полное тестирование flows
2. Локализация на 3 языка
3. Подготовить store материалы
4. Performance оптимизация

### Можно после релиза:
1. Push уведомления
2. Дополнительные платежные методы
3. Расширенная аналитика

---

**Последнее обновление**: 2025-09-29
**Статус**: Требуется серьезная доработка интеграции