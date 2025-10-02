# 📋 EvPower Mobile - Development Roadmap & TODO

## 📊 Общий прогресс: ~92% готовности

---

## ✅ Реализовано (Completed)

### 🏗 Архитектура и инфраструктура
- [x] React 18 + TypeScript
- [x] Capacitor 7 для native wrapper
- [x] Vite для сборки
- [x] TanStack Query для data fetching
- [x] Zustand для state management
- [x] Tailwind CSS для стилей
- [x] Service Worker для PWA
- [x] Маршрутизация с React Router

### 🔐 Аутентификация
- [x] Интеграция с Supabase Auth
- [x] Регистрация по email
- [x] Вход по email/телефону
- [x] Восстановление пароля
- [x] Управление сессиями
- [x] Secure Storage для токенов (native)
- [x] Session Storage для веб (временное решение)

### 📱 Native функциональность
- [x] QR Scanner (MLKit для native, html5-qrcode для web)
- [x] Геолокация с permissions
- [x] Network status detection
- [x] Push notifications инфраструктура (FCM/APNs)
- [x] Secure Storage (iOS Keychain/Android Keystore)
- [x] Platform abstraction layer

### 🗺 Локации и станции
- [x] Список всех локаций
- [x] Детальная информация о локации
- [x] Статусы станций (available/occupied/maintenance/offline)
- [x] Информация о коннекторах
- [x] Поиск ближайших станций по GPS
- [x] Избранные станции
- [x] Кэширование данных (30 сек TTL)

### ⚡ Базовое управление зарядкой
- [x] QR сканирование для идентификации станции
- [x] API интеграция для старта зарядки
- [x] API интеграция для остановки зарядки
- [x] Получение статуса зарядной сессии
- [x] Real-time обновления статуса (polling 3 сек)
- [x] Сохранение активной сессии в Secure Storage
- [x] Проверка доступности станции перед стартом

### 💰 Баланс и пополнение (частично)
- [x] Просмотр текущего баланса
- [x] QR-код пополнение через O!Dengi
- [x] Генерация QR кода для оплаты
- [x] Мониторинг статуса платежа (polling)
- [x] UI компонент QRTopup с таймером
- [x] Обработка успешной оплаты

### 🔌 WebSocket интеграция
- [x] WebSocketManager класс
- [x] Real-time обновления локаций
- [x] Автоматическое переподключение
- [x] Exponential backoff стратегия
- [x] Подписка/отписка на каналы

### 🎨 UI/UX
- [x] Responsive дизайн
- [x] Bottom navigation
- [x] Skeleton loaders
- [x] Error boundaries
- [x] Loading states
- [x] Offline режим с Service Worker

---

## ✅ Завершено в текущей сессии разработки

### ⚡ Расширенное управление зарядкой
- [x] UI для выбора лимитов зарядки
  - [x] Ввод количества кВт⋅ч
  - [x] Ввод суммы в сомах
  - [x] Переключатель между режимами
  - [x] Валидация минимальных значений
- [x] Отображение расчёта стоимости до старта
  - [x] Показ тарифа за кВт⋅ч
  - [x] Расчёт примерной стоимости
  - [x] Отображение сессионной платы
- [x] Улучшенный UI процесса зарядки
  - [x] Отображение лимитов во время зарядки
  - [x] Показ оставшегося лимита
  - [x] Детальная информация о процессе

### 📊 История и статистика
- [x] Страница истории зарядок
  - [x] Список завершённых сессий (мок данные)
  - [x] Фильтры по дате (UI готов)
  - [x] Детали каждой сессии
  - [ ] Экспорт в PDF/CSV
- [x] История транзакций
  - [x] Пополнения баланса
  - [x] Списания за зарядку
  - [x] Возвраты средств
- [x] Статистика использования
  - [x] График потребления по месяцам
  - [x] Суммарные расходы
  - [x] Любимые станции

---

## 📝 TODO - Высокий приоритет

### 🔐 Безопасность
- [ ] Миграция веб-токенов на HttpOnly cookies
  - [ ] Backend: реализовать cookie-based auth
  - [ ] Frontend: обновить auth flow
  - [ ] Тестирование CSRF защиты
- [ ] Certificate pinning для API вызовов
- [ ] Обфускация кода для production

### 💳 Платёжная система - Банковские карты (ОТЛОЖЕНО)
> ⚠️ **Статус:** Планируется в будущих версиях
- [ ] Интеграция OBANK H2H
  - [ ] UI форма ввода данных карты
  - [ ] Валидация номера карты (Luhn algorithm)
  - [ ] Маскирование CVV
  - [ ] 3D Secure поддержка
- [ ] Токенизация карт
  - [ ] Сохранение токенов карт
  - [ ] UI управления сохранёнными картами
  - [ ] Быстрая оплата токеном
- [ ] Webhook обработка
  - [ ] Endpoint для приёма webhook
  - [ ] Валидация подписи
  - [ ] Мгновенное зачисление

### 💰 Тарификация и промо (ОТЛОЖЕНО)
> ⚠️ **Статус:** Планируется в будущих версиях
- [ ] Динамическое ценообразование
  - [ ] Отображение тарифов по времени суток
  - [ ] Пиковые/непиковые часы
  - [ ] Выходные тарифы
- [ ] VIP/Корпоративные тарифы
  - [ ] Определение типа клиента
  - [ ] Применение специальных цен
  - [ ] Отображение скидки
- [ ] Промо-коды
  - [ ] UI ввода промо-кода
  - [ ] Валидация на backend
  - [ ] Отображение скидки

### 🧪 Тестирование
- [ ] Unit тесты
  - [ ] Тесты для hooks
  - [ ] Тесты для utils
  - [ ] Тесты для API client
- [ ] Integration тесты
  - [ ] Auth flow
  - [ ] Payment flow
  - [ ] Charging flow
- [ ] E2E тесты
  - [ ] Cypress/Playwright setup
  - [ ] Основные user journeys
  - [ ] Cross-platform тесты

---

## 📱 Подготовка к публикации в магазинах

### 🤖 Google Play Store
- [ ] Подготовка приложения
  - [ ] Генерация signed APK/AAB
  - [ ] ProGuard/R8 настройка
  - [ ] Оптимизация размера APK
  - [ ] App Bundle подготовка
- [ ] Store Listing
  - [ ] Название и описание (RU/EN/KG)
  - [ ] Скриншоты (phone/tablet)
  - [ ] Feature graphic (1024x500)
  - [ ] Иконка (512x512)
  - [ ] Promotional видео
- [ ] Метаданные
  - [ ] Категория и теги
  - [ ] Content rating questionnaire
  - [ ] Privacy Policy URL
  - [ ] Terms of Service URL
- [ ] Технические требования
  - [ ] Target SDK 33+
  - [ ] Permissions обоснование
  - [ ] Data safety form
  - [ ] App signing by Google Play
- [ ] Тестирование
  - [ ] Internal testing track
  - [ ] Closed testing (beta)
  - [ ] Open testing
  - [ ] Production release

### 🍎 Apple App Store
- [ ] Подготовка приложения
  - [ ] Xcode archive build
  - [ ] Code signing certificates
  - [ ] Provisioning profiles
  - [ ] Bitcode включение
- [ ] App Store Connect
  - [ ] App Information
  - [ ] Pricing and Availability
  - [ ] App Privacy details
  - [ ] Age Rating
- [ ] Store Listing
  - [ ] Название и subtitle
  - [ ] Описание (RU/EN/KG)
  - [ ] Keywords для ASO
  - [ ] Screenshots (iPhone/iPad)
  - [ ] App Preview видео
- [ ] Метаданные
  - [ ] Support URL
  - [ ] Marketing URL
  - [ ] Privacy Policy URL
  - [ ] EULA (if custom)
- [ ] Review подготовка
  - [ ] Review notes
  - [ ] Demo account
  - [ ] Объяснение features
  - [ ] Compliance документы
- [ ] TestFlight
  - [ ] Internal testing
  - [ ] External testing (до 10000 users)
  - [ ] Сбор feedback
  - [ ] Crash reports анализ

### 📋 Общие требования для магазинов
- [ ] Локализация
  - [ ] Русский язык (основной)
  - [ ] Кыргызский язык
  - [ ] Английский язык
- [ ] Legal документы
  - [ ] Privacy Policy
  - [ ] Terms of Service
  - [ ] EULA
  - [ ] Cookies Policy
- [ ] Analytics и Monitoring
  - [ ] Firebase/Google Analytics
  - [ ] Crashlytics
  - [ ] Performance monitoring
  - [ ] User behavior tracking
- [ ] ASO (App Store Optimization)
  - [ ] Keyword research
  - [ ] A/B testing для листинга
  - [ ] Reviews management
  - [ ] Ratings optimization

---

## 🚀 Оптимизация и улучшения

### ⚡ Performance
- [ ] Code splitting для роутов
- [ ] Lazy loading компонентов
- [ ] Image optimization
- [ ] Bundle size анализ
- [ ] Memory leaks проверка
- [ ] Network requests батчинг

### 🎨 UX улучшения
- [ ] Анимации переходов
- [ ] Haptic feedback (iOS/Android)
- [ ] Pull-to-refresh
- [ ] Swipe gestures
- [ ] Dark mode поддержка
- [ ] Accessibility (a11y)

### 📊 Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance metrics
- [ ] User analytics
- [ ] API response times
- [ ] Crash reporting
- [ ] Session recording

---

## 🔄 Continuous Integration/Deployment

### 🛠 CI/CD Pipeline
- [ ] GitHub Actions setup
  - [ ] Lint на PR
  - [ ] Tests на PR
  - [ ] Build проверка
  - [ ] Security scanning
- [ ] Автоматическая сборка
  - [ ] Android APK/AAB
  - [ ] iOS IPA
  - [ ] Web bundle
- [ ] Deployment
  - [ ] TestFlight auto-upload
  - [ ] Google Play Internal track
  - [ ] Web hosting (Vercel/Netlify)
- [ ] Release management
  - [ ] Semantic versioning
  - [ ] Changelog generation
  - [ ] Tag creation
  - [ ] Release notes

---

## 📅 Временные оценки

### Фаза 1: MVP улучшения (1-2 недели)
- Лимиты зарядки UI
- История зарядок
- Безопасность (HttpOnly cookies)
- Базовое тестирование

### Фаза 2: Подготовка к релизу (2-3 недели)
- Store listings подготовка
- Локализация
- Legal документы
- Performance оптимизация
- Bug fixes

### Фаза 3: Публикация (1 неделя)
- Submission в магазины
- Review процесс
- Hotfixes при необходимости

### Фаза 4: Post-release (ongoing)
- Monitoring и analytics
- User feedback обработка
- Итеративные улучшения
- Новые features (карты, промо-коды)

---

## 📌 Заметки

- Приоритет на стабильности и безопасности перед новыми features
- Банковские карты и расширенная тарификация - для v2.0
- Важно собрать feedback от первых пользователей
- Регулярные обновления для поддержания рейтинга в магазинах
- Подготовить FAQ и документацию для support team

---

*Последнее обновление: 2025-09-25*