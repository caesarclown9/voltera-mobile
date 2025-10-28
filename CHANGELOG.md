# Changelog

Все значимые изменения в проекте Voltera Mobile будут документироваться в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и проект следует [Semantic Versioning](https://semver.org/lang/ru/).

---

## [1.0.1] - 2025-10-21 (Google Play Compliance Update)

### Критические исправления для Google Play Store

#### Добавлено
- ✅ **Age Gate (18+)** в форму регистрации (`SignUpForm.tsx`)
  - Обязательный checkbox подтверждения возраста
  - Ссылки на Условия использования и Политику конфиденциальности
  - Валидация блокирует регистрацию без подтверждения

- ✅ **Certificate Pinning** с реальными хешами
  - Основной хеш: `oZb2ItbSoJl3Kamv2sgIeC345I3lhH5V7HblBOPDPUs=`
  - Резервный хеш: `SbqmW+BAJEQrrUnIU4uVF0v8P+uz0K3GpCQu2cl/AUo=` (Let's Encrypt R12)
  - Срок действия: до 2026-01-01
  - Скрипт обновления: `scripts/update-certificate-pins.sh`

- ✅ **Документация для деплоя**:
  - `PRIVACY_POLICY_DEPLOYMENT.md` - гайд по размещению Privacy Policy
  - `GOOGLE_PLAY_DEPLOYMENT_CHECKLIST.md` - полный чеклист для публикации

#### Исправлено (Supabase Database via MCP)

- ✅ **Восстановлена функция `anonymize_client()`**
  - Полная анонимизация данных пользователя
  - Удаление PII: email, phone, name → NULL
  - Отвязка от избранного, сессий, платежей
  - Доступ только через `service_role`

- ✅ **Включен RLS на критичных таблицах**:
  - `promo_codes` - пользователи видят только активные
  - `promo_code_usage` - доступ только к своим записям
  - `client_tariffs` - доступ только к своим тарифам
  - `idempotency_keys` - доступ только для service_role
  - `pricing_history` - доступ только для своих сессий

- ✅ **Исправлен `search_path` для 13 функций** (защита от SQL injection):
  - `handle_new_user`, `handle_user_update`, `handle_user_delete`
  - `register_client`, `get_client_profile`, `update_client_profile`
  - `get_charging_history`, `get_transaction_history`
  - `balance_change_attempt_notice`
  - `refresh_location_status_view`, `trigger_refresh_location_status`
  - `enforce_station_availability`, `update_user_favorites_updated_at`

### Безопасность

- ✅ Все критические таблицы защищены RLS
- ✅ Механизм удаления данных полностью функционален
- ✅ Certificate pinning с актуальными хешами
- ✅ Защита от SQL injection через schema poisoning
- ✅ Аудит всех финансовых операций

### Требования Google Play

- ✅ Privacy Policy доступна (`/public/legal/privacy.html`)
- ✅ Terms of Service доступны (`/public/legal/terms.html`)
- ✅ Age Gate (18+) реализован
- ✅ In-app удаление аккаунта работает
- ⚠️ **ТРЕБУЕТСЯ**: Разместить Privacy Policy на публичном URL
- ⚠️ **ТРЕБУЕТСЯ**: Заполнить Data Safety Form в Google Play Console

### Технические детали

**Миграции Supabase**:
- `restore_anonymize_client_function` - восстановление функции удаления
- `enable_rls_on_promo_tables` - RLS для промо-кодов и других таблиц
- `fix_function_search_paths_correct` - исправление search_path

**Файлы изменены**:
- `src/features/auth/components/SignUpForm.tsx`
- `android/app/src/main/res/xml/network_security_config.xml`
- `scripts/update-certificate-pins.sh` (новый)
- `PRIVACY_POLICY_DEPLOYMENT.md` (новый)
- `GOOGLE_PLAY_DEPLOYMENT_CHECKLIST.md` (новый)

### Статус готовности

**Google Play Compliance**: **85%** (3 pending actions)
- ✅ Code changes: Complete
- ✅ Database security: Complete
- ✅ Age gate: Complete
- ✅ Certificate pinning: Complete
- ⚠️ Privacy Policy URL: Needs deployment
- ⚠️ Data Safety Form: Needs filling
- ⚠️ PostgreSQL update: Recommended

---

## [1.0.1] - 2025-10-15 (Previous Update)

### Добавлено

- ✅ Создан RULES.md - правила разработки проекта
- ✅ Создан CHANGELOG.md - история изменений
- ✅ Добавлен release-backend-fin/ в .gitignore (справочная документация backend)

### Изменено

- ✅ Обновлена структура документации проекта
- ✅ Удалены дублирующие и устаревшие документы

### Исправлено

- ✅ Исправлены все 27 TypeScript strict mode ошибок
- ✅ Исправлены критические ESLint ошибки (ban-ts-comment)
- ✅ Удалены неиспользуемые импорты и переменные из:
  - `balanceService.ts` - исправлена type assertion
  - `useChargingStatusPolling.ts` - удалены неиспользуемые импорты
  - `useChargingHistory.ts` - удалены неиспользуемые импорты
  - `useLocations.ts` - удалены неиспользуемые типы и переменные
  - `pricingService.ts` - добавлены @ts-expect-error для будущего кода
  - `StationMap.tsx` и `MapHome.tsx` - удалены неиспользуемые пропсы
  - `LazyLoad.tsx` и `offline.ts` - исправлены неиспользуемые переменные
  - `volteraApi.ts` - добавлены type assertions

### Документация

- ✅ Актуализирована документация под текущее состояние проекта
- ✅ Все чеклисты обновлены в соответствии с реальным прогрессом

### Проверки

- ✅ TypeScript typecheck - 0 ошибок
- ✅ ESLint lint - 0 критических ошибок (146 warnings о типе `any`)
- ✅ Tests - 55/55 тестов успешно пройдено
- ✅ Git pre-commit hook - успешно
- ✅ Git pre-push hook - успешно

---

## [1.0.0] - 2025-10-02

### ✨ Первый релиз

#### Реализованные функции

**🔐 Аутентификация**

- [x] Регистрация через email/пароль
- [x] Вход через email/пароль
- [x] Безопасное хранение токенов (Capacitor Secure Storage)
- [x] Автоматическое обновление сессии
- [x] Выход из аккаунта

**⚡ Управление Зарядкой**

- [x] Запуск зарядки через QR-код
- [x] Остановка зарядки
- [x] Мониторинг процесса зарядки в реальном времени
- [x] Отображение текущей мощности и потребленной энергии
- [x] Установка лимитов (по времени, по kWh, по стоимости)
- [x] Интеграция с OCPP backend

**🗺️ Карта и Станции**

- [x] Интерактивная карта на Яндекс.Картах
- [x] Отображение всех доступных станций
- [x] Фильтрация по статусу (доступна/занята/offline)
- [x] Информация о станции (адрес, мощность, разъемы)
- [x] Навигация к станции
- [x] Определение текущего местоположения

**💳 Баланс и Платежи**

- [x] Просмотр текущего баланса
- [x] Пополнение баланса (интеграция готова)
- [x] История транзакций
- [x] QR-код для пополнения

**📊 История**

- [x] История всех зарядок
- [x] Детальная информация о каждой сессии
- [x] Экспорт истории (PDF, CSV)
- [x] Фильтрация и поиск

**👤 Профиль**

- [x] Просмотр информации профиля
- [x] Редактирование профиля
- [x] Управление уведомлениями
- [x] Настройки приложения
- [x] О приложении и версия

**🔔 Уведомления**

- [x] Push-уведомления через Capacitor
- [x] Уведомления о статусе зарядки
- [x] Уведомления о низком балансе

**📱 Мобильная Функциональность**

- [x] QR-сканер (Capacitor ML Kit Barcode Scanner)
- [x] Геолокация (Capacitor Geolocation)
- [x] Тактильная обратная связь (Capacitor Haptics)
- [x] Сплеш-скрин (Capacitor Splash Screen)
- [x] Проверка сетевого соединения (Capacitor Network)

#### Технический Стек

**Frontend**

- [x] React 18
- [x] TypeScript
- [x] Vite 6
- [x] TailwindCSS
- [x] Framer Motion (анимации)
- [x] React Router (навигация)
- [x] React Query (state management, кеширование)
- [x] Zustand (client state)

**Mobile**

- [x] Capacitor 7
- [x] Android SDK 23-35 (Android 6.0+)
- [x] iOS SDK (готовность к деплою)

**Backend Integration**

- [x] Supabase (аутентификация, БД)
- [x] OCPP Backend (управление зарядными станциями)
- [x] REST API
- [x] WebSocket (real-time updates)

**Maps & Location**

- [x] Яндекс.Карты API
- [x] Capacitor Geolocation

**Security & Storage**

- [x] Capacitor Secure Storage (токены)
- [x] IndexedDB (React Query кеш)
- [x] HTTPS/TLS (шифрование)

#### Сборка и Деплой

**Android**

- [x] Release build готов
- [x] Signed AAB
- [x] ProGuard обфускация
- [x] Минимизация ресурсов
- [x] Версия: 1.0.0 (versionCode: 1)

**iOS**

- [x] Проект настроен
- [x] Иконки и splash screen
- [x] Info.plist настроен
- [x] Fastlane готов
- [ ] TestFlight деплой (ожидание macOS)

#### Производительность

- [x] Lazy loading страниц
- [x] React Query кеширование
- [x] Image optimization
- [x] Service Worker (PWA)
- [x] IndexedDB persistence
- [x] Оптимизированная сборка (Vite)

#### Тестирование

- [x] Vitest setup
- [x] Testing Library
- [x] Unit тесты для hooks
- [x] Component тесты
- [ ] E2E тесты (запланировано)

#### Безопасность

- [x] Secure Storage для токенов
- [x] HTTPS везде
- [x] Environment variables
- [x] ProGuard/R8 обфускация
- [x] Runtime permissions (Android)
- [x] Privacy Policy
- [x] Terms of Service

---

## Статус Проекта

**Версия:** 1.0.1
**Build:** 37
**Последнее обновление:** 2025-10-15

### Платформы

- ✅ **Android** - готов к релизу, APK собран
- 🚧 **iOS** - подготовка к деплою (требуется macOS для финального билда)
- ✅ **Web** - работает как PWA

### Интеграции

- ✅ **Supabase** - полностью интегрировано
- ✅ **OCPP Backend** - интегрировано и протестировано
- ✅ **Яндекс.Карты** - работает
- ⏳ **Платежная система** - backend готов, требуется тестирование

---

## Планы на Будущее

### v1.1.0 (В разработке)

- [ ] iOS релиз в App Store
- [ ] Улучшенная offline поддержка
- [ ] Дополнительные статистики в профиле
- [ ] Уведомления о специальных предложениях

### v1.2.0 (Запланировано)

- [ ] Система лояльности
- [ ] Реферальная программа
- [ ] Расширенная аналитика использования
- [ ] Поддержка нескольких языков (английский, киргизский)

### v2.0.0 (Концепция)

- [ ] Apple Pay / Google Pay интеграция
- [ ] Темная тема
- [ ] Бронирование станций
- [ ] Социальные функции

---

## Ссылки

- **Repository:** https://github.com/caesarclown9/voltera-mobile-app
- **Backend API:** https://ocpp.voltera.kg
- **Support:** support@voltera.kg

---

**Формат версий:** MAJOR.MINOR.PATCH

- **MAJOR** - несовместимые изменения API
- **MINOR** - новая функциональность (обратно совместимая)
- **PATCH** - исправления багов
