# 🍎 iOS Deployment Guide для Voltera Mobile

> **Полное руководство по деплою Voltera Mobile в App Store**
>
> Последнее обновление: 2025-10-15
> Версия проекта: 1.0.1

---

## 📋 Оглавление

1. [Предварительные Требования](#предварительные-требования)
2. [Подготовка Проекта](#подготовка-проекта)
3. [Настройка Apple Developer Account](#настройка-apple-developer-account)
4. [Конфигурация Xcode](#конфигурация-xcode)
5. [Fastlane Автоматизация](#fastlane-автоматизация)
6. [Ручной Деплой](#ручной-деплой)
7. [Автоматизированный Деплой](#автоматизированный-деплой)
8. [Проблемы и Решения](#проблемы-и-решения)
9. [Чеклист Перед Релизом](#чеклист-перед-релизом)

---

## Предварительные Требования

### ✅ Необходимое Окружение

**macOS:**

- macOS 14.0+ (Sonoma) или новее
- Xcode 15.0+ установлен
- Command Line Tools установлены

**Аккаунты:**

- Apple Developer Account ($99/year)
- Доступ к App Store Connect
- Git репозиторий для сертификатов (для Fastlane Match)

**Инструменты:**

- Node.js >= 18.0.0
- npm >= 9.0.0
- CocoaPods >= 1.15
- Fastlane >= 2.220
- Homebrew (рекомендуется)

### Установка Инструментов

```bash
# Xcode Command Line Tools
xcode-select --install

# Homebrew (если еще не установлен)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# CocoaPods
sudo gem install cocoapods

# Fastlane
brew install fastlane

# Проверка версий
xcodebuild -version
pod --version
fastlane --version
```

---

## Подготовка Проекта

### 1. Клонирование и Установка

```bash
# Клонировать репозиторий
git clone https://github.com/caesarclown9/voltera-mobile-app.git
cd voltera-mobile-app

# Установить зависимости
npm ci

# Установить iOS зависимости
cd ios/App
pod install
cd ../..
```

### 2. Environment Variables

Создайте `.env.production` с production конфигурацией:

```bash
# .env.production
VITE_API_URL=https://ocpp.voltera.kg
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key
VITE_YANDEX_MAPS_API_KEY=your_yandex_maps_api_key
VITE_APP_VERSION=1.0.1
VITE_ENABLE_PUSH_NOTIFICATIONS=true
VITE_ENABLE_ANALYTICS=false
```

**⚠️ ВАЖНО:** Никогда не коммитьте `.env.production` в git!

### 3. Обновление Версии

```bash
# Обновить версию в package.json
npm version 1.0.1  # или 1.0.2, 1.1.0 и т.д.

# Собрать production bundle
npm run build

# Синхронизировать с iOS
npx cap sync ios
```

### 4. Проверка Конфигурации

Проверьте `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "kg.voltera.app", // ✅ Bundle ID
  appName: "Voltera", // ✅ Название приложения
  webDir: "dist",
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#10B981",
      // ...
    },
  },
};
```

Проверьте `ios/App/App/Info.plist`:

```xml
<key>CFBundleDisplayName</key>
<string>Voltera</string>

<key>NSCameraUsageDescription</key>
<string>Сканирование QR‑кода для начала/оплаты зарядки.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Поиск ближайших зарядных станций рядом с вами.</string>
```

---

## Настройка Apple Developer Account

### 1. Создание App ID

1. Перейдите на [Apple Developer Portal](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Нажмите **+** для создания нового App ID
4. Выберите **App IDs**
5. Выберите **App** тип
6. Заполните:
   - **Description:** Voltera Mobile App
   - **Bundle ID:** `kg.voltera.app` (Explicit)
7. Включите Capabilities:
   - ✅ Push Notifications
   - ✅ Sign in with Apple (если планируется)
8. Нажмите **Continue** → **Register**

### 2. Создание Certificates

#### Distribution Certificate (для App Store)

```bash
# Через Xcode (автоматически)
# Xcode → Preferences → Accounts → Manage Certificates → +
# Выберите "Apple Distribution"
```

Или вручную:

1. **Certificates** → **+**
2. Выберите **Apple Distribution**
3. Создайте CSR (Certificate Signing Request):
   ```bash
   # Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
   # Email: your-email@example.com
   # Common Name: Your Name
   # Saved to disk
   ```
4. Загрузите CSR
5. Скачайте сертификат и установите (двойной клик)

### 3. Создание Provisioning Profile

1. **Profiles** → **+**
2. Выберите **App Store**
3. Выберите App ID: `kg.voltera.app`
4. Выберите Distribution Certificate
5. Имя: **Voltera App Store Profile**
6. Скачайте и установите

---

## Конфигурация Xcode

### 1. Открытие Проекта

```bash
# Открыть workspace (НЕ .xcodeproj!)
open ios/App/App.xcworkspace
```

### 2. Настройки Проекта

#### General Tab

1. Выберите **App** target
2. **Display Name:** Voltera
3. **Bundle Identifier:** kg.voltera.app
4. **Version:** 1.0.1 (из package.json)
5. **Build:** 1 (или увеличивайте при каждом билде)

#### Signing & Capabilities Tab

1. **Automatically manage signing:** ❌ Отключить (для manual signing)

   **Или**

2. **Automatically manage signing:** ✅ Включить (для автоматического)
   - **Team:** Выберите вашу команду
   - Xcode автоматически создаст provisioning profiles

3. **Debug:**
   - Provisioning Profile: Xcode Managed Profile (Debug)
   - Signing Certificate: Apple Development

4. **Release:**
   - Provisioning Profile: Voltera App Store Profile
   - Signing Certificate: Apple Distribution

5. **Capabilities:**
   - ✅ Push Notifications
   - ✅ Background Modes (Remote notifications)

#### Build Settings

Поиск "Code Signing":

```
Code Signing Identity (Release): Apple Distribution
Code Signing Identity (Debug): Apple Development
Provisioning Profile (Release): Voltera App Store Profile
```

### 3. Иконки и Assets

Убедитесь что все иконки присутствуют:

```bash
ls -la ios/App/App/Assets.xcassets/AppIcon.appiconset/

# Должны быть все размеры:
# AppIcon-1024x1024@1x.png
# AppIcon-20x20@2x.png
# AppIcon-20x20@3x.png
# ... и так далее
```

Если иконок нет, сгенерируйте:

```bash
npm run generate-icons  # если есть такой скрипт
```

### 4. Splash Screen

Проверьте:

```bash
ls -la ios/App/App/Assets.xcassets/Splash.imageset/

# splash-2732x2732.png (должен существовать)
```

---

## Fastlane Автоматизация

### 1. Проверка Fastlane Setup

Файл `ios/Gemfile` должен содержать:

```ruby
source "https://rubygems.org"

gem "fastlane", "~> 2.220"
gem "cocoapods", "~> 1.15"
```

Установка:

```bash
cd ios
bundle install
cd ..
```

### 2. Конфигурация Fastlane

Проверьте `ios/fastlane/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  desc "Release to App Store"
  lane :release do
    # Get API Key
    api_key_path = File.expand_path("~/private_keys/AuthKey_#{ENV['APP_STORE_CONNECT_API_KEY_KEY_ID']}.p8")

    api_key = app_store_connect_api_key(
      key_id: ENV['APP_STORE_CONNECT_API_KEY_KEY_ID'],
      issuer_id: ENV['APP_STORE_CONNECT_API_KEY_ISSUER_ID'],
      key_filepath: api_key_path,
      in_house: false
    )

    # Sync code signing (Match)
    match(
      type: "appstore",
      readonly: true,
      api_key: api_key
    )

    # Update code signing
    update_code_signing_settings(
      use_automatic_signing: false,
      path: "App/App.xcodeproj",
      team_id: ENV["APPLE_TEAM_ID"],
      profile_name: "match AppStore kg.voltera.app",
      code_sign_identity: "iPhone Distribution"
    )

    # Build
    build_app(
      workspace: "App/App.xcworkspace",
      scheme: "App",
      export_method: "app-store",
      output_directory: "./build",
      output_name: "Voltera.ipa"
    )

    # Upload to TestFlight
    upload_to_testflight(
      api_key: api_key,
      skip_waiting_for_build_processing: true
    )

    UI.success("✅ Successfully uploaded to TestFlight!")
  end
end
```

### 3. App Store Connect API Key

Создайте API ключ для автоматизации:

1. [App Store Connect](https://appstoreconnect.apple.com/) → **Users and Access**
2. **Keys** tab → **+** (Request Access если нужно)
3. **Name:** Voltera Fastlane Key
4. **Access:** Admin или App Manager
5. Скачайте `.p8` файл (только один раз!)
6. Сохраните в `~/private_keys/AuthKey_XXXXXXXXXX.p8`

Запишите:

- **Key ID:** XXXXXXXXXX
- **Issuer ID:** xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

### 4. Environment Variables для Fastlane

Создайте `.env` в `ios/`:

```bash
# ios/.env
APP_STORE_CONNECT_API_KEY_KEY_ID=XXXXXXXXXX
APP_STORE_CONNECT_API_KEY_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
APPLE_TEAM_ID=YYYYYYYYYY
FASTLANE_USER=your-apple-id@example.com
MATCH_PASSWORD=your-match-password  # для Match
```

**⚠️ НЕ КОММИТЬТЕ .env в git!**

---

## Ручной Деплой

### Шаг 1: Подготовка

```bash
# Обновить версию
npm version 1.0.1

# Production build
npm run build

# Sync с iOS
npx cap sync ios
```

### Шаг 2: Открыть Xcode

```bash
open ios/App/App.xcworkspace
```

### Шаг 3: Выбрать Device

В Xcode toolbar:

- Выберите **Any iOS Device (arm64)** или реальное устройство

### Шаг 4: Clean Build

1. **Product** → **Clean Build Folder** (Cmd+Shift+K)
2. Подождите завершения

### Шаг 5: Archive

1. **Product** → **Archive** (Cmd+B затем Archive)
2. Подождите сборки (может занять 5-10 минут)
3. Organizer откроется автоматически

### Шаг 6: Validate

1. В Organizer выберите созданный архив
2. Нажмите **Validate App**
3. Выберите Distribution Certificate
4. Подождите валидации
5. Должно быть: "App validated successfully"

### Шаг 7: Distribute

1. Нажмите **Distribute App**
2. Выберите **App Store Connect**
3. Выберите **Upload**
4. Выберите правильные signing options
5. Нажмите **Upload**
6. Подождите загрузки (может занять 10-20 минут)

### Шаг 8: App Store Connect

1. Перейдите на [App Store Connect](https://appstoreconnect.apple.com/)
2. **My Apps** → выберите Voltera
3. Билд должен появиться в **TestFlight** → **iOS Builds**
4. Подождите обработки Apple (~10-30 минут)

### Шаг 9: TestFlight Testing

1. Добавьте Internal Testers:
   - **TestFlight** → **Internal Testing**
   - Add testers
2. Или External Testers (требует review от Apple)

### Шаг 10: Submit for Review

Когда готовы к релизу:

1. **App Store** tab → **+** Version
2. Заполните все метаданные
3. Выберите билд из TestFlight
4. **Submit for Review**

---

## Автоматизированный Деплой

### Использование Fastlane

```bash
# Перейти в ios/
cd ios

# Запустить release lane
bundle exec fastlane release
```

Fastlane автоматически:

1. ✅ Синхронизирует code signing (Match)
2. ✅ Соберет архив
3. ✅ Загрузит в TestFlight
4. ✅ Отправит уведомление

### Использование скрипта

Запустите подготовленный скрипт:

```bash
# В корне проекта
./scripts/prepare-ios-release.sh
```

Скрипт:

1. Спросит новую версию
2. Обновит `package.json`
3. Соберет production bundle
4. Синхронизирует с iOS
5. Откроет Xcode для финальной сборки

---

## Проблемы и Решения

### ❌ "No signing certificate found"

**Решение:**

```bash
# Проверьте сертификаты в Keychain
open ~/Library/Keychains/login.keychain-db

# Должны быть:
# - Apple Development (для Debug)
# - Apple Distribution (для Release)

# Если нет, скачайте с developer.apple.com
```

### ❌ "Provisioning profile doesn't match"

**Решение:**

1. Xcode → **Preferences** → **Accounts**
2. Выберите аккаунт → **Download Manual Profiles**
3. Или используйте Automatic Signing

### ❌ "Build failed with code signing error"

**Решение:**

```bash
# Очистить derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Переоткрыть проект
open ios/App/App.xcworkspace
```

### ❌ "CocoaPods dependencies error"

**Решение:**

```bash
cd ios/App
pod deintegrate
pod install
cd ../..
npx cap sync ios
```

### ❌ "Archive не содержит правильные entitlements"

**Решение:**
Проверьте `App.entitlements`:

```xml
<key>aps-environment</key>
<string>production</string>
```

### ❌ "Fastlane Match ошибка"

**Решение:**

```bash
# Обновить Match
cd ios
bundle exec fastlane match appstore --readonly

# Если не работает, создать новые сертификаты
bundle exec fastlane match appstore --force_for_new_devices
```

---

## Чеклист Перед Релизом

### Код и Build

```
□ Версия обновлена в package.json
□ npm run build выполнен успешно
□ npx cap sync ios выполнен
□ Все environment variables правильные
□ .env.production содержит production ключи
□ Нет console.log в production коде
□ ESLint не показывает ошибок
□ TypeScript компилируется без ошибок
□ Тесты проходят (npm run test)
```

### Xcode Configuration

```
□ Bundle ID: kg.voltera.app
□ Display Name: Voltera
□ Version синхронизирован с package.json
□ Build number увеличен
□ Signing настроен (Distribution certificate)
□ Provisioning profile правильный
□ All icon sizes присутствуют
□ Splash screen корректный
□ Info.plist permissions описаны
□ Capabilities включены (Push Notifications)
```

### App Store Connect

```
□ App создано в App Store Connect
□ Bundle ID совпадает (kg.voltera.app)
□ Metadata заполнена:
  - App Name
  - Subtitle
  - Description (русский/английский)
  - Keywords
  - Support URL
  - Marketing URL
  - Privacy Policy URL
□ Screenshots загружены (все размеры)
□ App Icon (1024x1024) загружен
□ Age Rating настроен
□ Pricing настроен
□ Contact Information
```

### Legal

```
□ Privacy Policy опубликована
□ Terms of Service опубликованы
□ App Store Review Guidelines проверены
□ Экспортные ограничения (Export Compliance)
```

### Testing

```
□ Протестировано на реальном iPhone
□ Протестировано на iPad (если поддерживается)
□ Все основные функции работают
□ Push notifications работают
□ QR scanner работает
□ Geolocation работает
□ Нет крашей
□ Offline mode работает (если есть)
□ TestFlight testing пройден
```

### Финальная Проверка

```
□ Build validation прошла успешно
□ Archive загружен в App Store Connect
□ Build обработан Apple (зеленый статус)
□ TestFlight invite отправлен тестерам
□ Feedback от тестеров получен
□ Критичные баги исправлены
□ Готов к Submit for Review
```

---

## 🎯 Финальные Шаги

### После Approval

Когда Apple одобрит приложение:

1. **Выберите Release Option:**
   - Manual Release - вы контролируете дату
   - Automatic Release - сразу после approval

2. **Phased Release (рекомендуется):**
   - Постепенный rollout к пользователям
   - 1% → 2% → 5% → 10% → 25% → 50% → 100% за 7 дней

3. **Мониторинг:**
   - App Store Connect → **Analytics**
   - Crashlytics (если интегрировано)
   - User Reviews

4. **Hotfixes:**
   - Если критичный баг, можете expedite review
   - Обычно ~1-2 дня на review

---

## 📞 Контакты и Поддержка

**Technical Issues:**

- Email: support@voltera.kg
- GitHub Issues: https://github.com/caesarclown9/voltera-mobile-app/issues

**Apple Developer Support:**

- https://developer.apple.com/contact/
- Phone: через Developer Portal

---

## 🔗 Полезные Ссылки

- [Apple Developer Portal](https://developer.apple.com/account/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

**Последнее обновление:** 2025-10-15
**Автор:** Voltera Development Team

**Удачи с релизом! 🚀**
