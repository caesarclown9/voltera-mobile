# EvPower - EV Charging Mobile App

<div align="center">

**Мобильное приложение для поиска и оплаты зарядки электромобилей в Кыргызстане**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/caesarclown9/evpower-mobile-app)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-lightgrey.svg)](https://capacitorjs.com)

</div>

---

## 📱 О проекте

EvPower - это современное кроссплатформенное мобильное приложение для владельцев электромобилей в Кыргызстане. Приложение позволяет находить ближайшие зарядные станции, управлять процессом зарядки, отслеживать расходы и управлять балансом.

### ✨ Основные возможности

- 🗺️ **Интерактивная карта** - поиск ближайших зарядных станций на карте (Яндекс.Карты)
- ⚡ **Управление зарядкой** - удаленный запуск/остановка зарядки через OCPP протокол
- 💳 **Управление балансом** - пополнение счета и оплата зарядки
- 📊 **История зарядок** - детальная статистика и история всех сессий
- 🔔 **Push-уведомления** - оповещения о статусе зарядки
- 📱 **QR-сканирование** - быстрый доступ к станциям через QR-код
- 🌓 **Темная тема** - адаптивный дизайн с поддержкой темной темы
- 🔒 **Безопасность** - шифрование данных, безопасное хранение токенов

---

## 🏗️ Технологический стек

### Frontend
- **React 18** - UI библиотека
- **TypeScript** - типизация
- **Vite** - быстрая сборка
- **TailwindCSS** - стилизация
- **Framer Motion** - анимации
- **React Router** - навигация
- **React Query** - управление состоянием и кеширование

### Mobile
- **Capacitor 7** - кроссплатформенная разработка
- **Android SDK 23-35** - поддержка Android 6.0+
- **iOS (планируется)** - поддержка iOS

### Backend Integration
- **Supabase** - аутентификация и база данных
- **OCPP Backend** - управление зарядными станциями
- **REST API** - взаимодействие с backend

### Maps & Location
- **Яндекс.Карты** - отображение карты и станций
- **Capacitor Geolocation** - определение местоположения

### Security & Storage
- **Capacitor Secure Storage** - безопасное хранение токенов
- **IndexedDB** - локальное кеширование данных
- **HTTPS/TLS** - шифрование передачи данных

---

## 📦 Установка и запуск

### Предварительные требования

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Java JDK** 17 (для Android)
- **Android Studio** (для разработки Android)
- **Xcode** (для разработки iOS, только macOS)

### Установка зависимостей

```bash
# Клонировать репозиторий
git clone https://github.com/caesarclown9/evpower-mobile-app.git
cd evpower-mobile-app

# Установить зависимости
npm install

# Синхронизировать Capacitor
npx cap sync

# ВАЖНО: После cap sync исправить Java версию
sed -i 's/VERSION_21/VERSION_17/g' android/app/capacitor.build.gradle
sed -i 's/VERSION_21/VERSION_17/g' android/capacitor-cordova-android-plugins/capacitor.build.gradle
```

### Настройка окружения

Создайте файл `.env` на основе `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OCPP_API_URL=https://ocpp.evpower.kg
VITE_YANDEX_MAPS_API_KEY=your_yandex_maps_key
```

### Разработка

```bash
# Запустить dev-сервер (web)
npm run dev

# Запустить на Android
npx cap run android

# Открыть в Android Studio
npx cap open android

# Запустить на iOS (только macOS)
npx cap run ios
```

### Сборка production

```bash
# Собрать web-версию
npm run build

# Собрать Android AAB (для Google Play)
cd android
./gradlew bundleRelease

# Собрать Android APK
./gradlew assembleRelease

# Файлы будут в:
# AAB: android/app/build/outputs/bundle/release/app-release.aab
# APK: android/app/build/outputs/apk/release/app-release.apk
```

---

## 🗂️ Структура проекта

```
evpower-mobile/
├── src/
│   ├── api/              # API типы и конфигурация
│   ├── components/       # Переиспользуемые компоненты
│   ├── features/         # Модули приложения
│   │   ├── auth/         # Аутентификация
│   │   ├── charging/     # Управление зарядкой
│   │   ├── locations/    # Карта и локации
│   │   ├── payments/     # Платежи и баланс
│   │   └── profile/      # Профиль пользователя
│   ├── services/         # Сервисы и API клиенты
│   ├── hooks/            # React хуки
│   ├── utils/            # Утилиты
│   └── App.tsx           # Главный компонент
├── android/              # Android проект
├── ios/                  # iOS проект (в разработке)
├── public/               # Статические файлы
├── PRIVACY_POLICY.md              # Privacy Policy
├── TERMS_OF_SERVICE.md            # Terms of Service
├── GOOGLE_PLAY_DATA_SAFETY.md     # Data Safety для Google Play
├── GOOGLE_PLAY_SUBMISSION_CHECKLIST.md  # Чеклист сабмита
└── capacitor.config.ts   # Capacitor конфигурация
```

---

## 🔐 Безопасность

### Защита данных

- ✅ **HTTPS везде** - все запросы через HTTPS/TLS
- ✅ **Шифрование паролей** - через Supabase Auth
- ✅ **Secure Storage** - токены хранятся в защищенном хранилище
- ✅ **No hardcoded secrets** - все ключи через переменные окружения
- ✅ **ProGuard/R8** - обфускация кода в production

### Permissions (разрешения)

Приложение запрашивает минимально необходимые разрешения:

- `INTERNET` - связь с серверами
- `ACCESS_FINE_LOCATION` - поиск ближайших станций
- `ACCESS_COARSE_LOCATION` - примерное местоположение
- `CAMERA` - QR-сканирование (опционально)
- `POST_NOTIFICATIONS` - уведомления о зарядке (опционально)

Все разрешения запрашиваются **runtime** и могут быть отозваны пользователем.

---

## 📄 Документация для App Stores

Перед публикацией в Google Play и App Store ознакомьтесь с документацией:

- 📋 [Google Play Submission Checklist](./GOOGLE_PLAY_SUBMISSION_CHECKLIST.md)
- 🔒 [Google Play Data Safety](./GOOGLE_PLAY_DATA_SAFETY.md)
- 📜 [Privacy Policy](./PRIVACY_POLICY.md)
- 📜 [Terms of Service](./TERMS_OF_SERVICE.md)

---

## 🚀 Деплой

### Google Play Console

1. Создать signed AAB:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

2. Файл будет в `android/app/build/outputs/bundle/release/app-release.aab`

3. Загрузить в Google Play Console → Internal Testing

### App Store (iOS)

*В разработке*

---

## 🛠️ Разработка

### Scripts

```bash
# Разработка
npm run dev              # Dev-сервер
npm run build            # Production сборка
npm run preview          # Preview production сборки

# Тестирование
npm run test             # Запустить тесты
npm run test:ui          # UI для тестов
npm run test:coverage    # Coverage отчет

# Линтинг
npm run lint             # ESLint проверка

# Capacitor
npx cap sync             # Синхронизация
npx cap open android     # Открыть Android Studio
npx cap run android      # Запустить на Android
```

### Git Workflow

```bash
# Создать feature branch
git checkout -b feature/new-feature

# Коммит
git add .
git commit -m "feat: add new feature"

# Push
git push origin feature/new-feature
```

---

## 🧪 Тестирование

```bash
# Запустить тесты
npm run test

# Запустить с UI
npm run test:ui

# Coverage отчет
npm run test:coverage
```

---

## 🐛 Debugging

### Android
- Chrome DevTools: `chrome://inspect`
- Android Studio Logcat для нативных логов

### iOS
- Safari Web Inspector для web debugging
- Xcode console для нативных логов

---

## 📊 Статус проекта

- ✅ **Android** - готово к релизу (v1.0.0)
- 🚧 **iOS** - в разработке
- ✅ **Backend Integration** - интегрировано
- ⏳ **OCPP Backend** - требует деплоя

---

## 🔗 Ссылки

- **Backend API:** https://ocpp.evpower.kg
- **Supabase:** https://supabase.com
- **Support:** support@evpower.kg

---

## 📝 Changelog

### v1.0.0 (2025-10-02)

- ✅ Первый релиз
- ✅ Android поддержка
- ✅ Интеграция с OCPP backend
- ✅ Supabase аутентификация
- ✅ Яндекс.Карты интеграция
- ✅ QR-сканирование
- ✅ Push-уведомления

---

## 📜 Лицензия

**Proprietary** - Все права защищены © 2025 EvPower

---

## 🤝 Поддержка

По вопросам:
- **Email:** support@evpower.kg
- **GitHub Issues:** [создать issue](https://github.com/caesarclown9/evpower-mobile-app/issues)

---

<div align="center">

**Сделано с ❤️ в Кыргызстане 🇰🇬**

</div>