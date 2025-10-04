# 🚀 План развертывания - EvPower Mobile

## 📋 СОДЕРЖАНИЕ
1. [Google Play Store](#google-play-store)
2. [Apple App Store](#apple-app-store)
3. [Предварительные требования](#предварительные-требования)
4. [Пошаговый план деплоя](#пошаговый-план-деплоя)
5. [Чеклист перед релизом](#чеклист-перед-релизом)

---

## 📱 GOOGLE PLAY STORE

### 1. Подготовка Google Play Console
```
1. Создать аккаунт разработчика
   - Перейти на https://play.google.com/console
   - Оплатить $25 (одноразовый платеж)
   - Заполнить данные организации

2. Создать приложение
   - Create app → New app
   - App name: EvPower
   - Default language: Russian
   - App or game: App
   - Free or paid: Free
```

### 2. Настройка приложения
```
Main store listing:
- App name: EvPower - Зарядка электромобилей
- Short description: Найдите станцию, зарядите авто, управляйте балансом
- Full description: [см. ниже]
- App icon: 512x512px PNG
- Feature graphic: 1024x500px
- Screenshots: минимум 2 для телефона, 2 для планшета
- Video: опционально (YouTube URL)
```

### Полное описание для Google Play:
```
EvPower - удобное приложение для владельцев электромобилей в Кыргызстане.

🚗 Основные возможности:
• Карта всех зарядных станций
• QR-сканер для быстрого подключения
• Управление процессом зарядки
• Пополнение баланса через O!Dengi
• История зарядок и платежей
• Push-уведомления о статусе

⚡ Поддерживаемые типы зарядки:
• Type 2 (AC)
• CCS (DC быстрая зарядка)
• CHAdeMO
• GB/T

💳 Способы оплаты:
• QR-код O!Dengi
• Банковская карта (скоро)

📍 География:
Бишкек и другие города Кыргызстана

Поддержка: support@evpower.kg
```

### 3. Технические требования
```
App content:
- Content rating: PEGI 3 / Everyone
- Target audience: 18+
- Ads: No ads
- In-app purchases: No

App access:
- Special access: Not required
- Instructions: Open app → Register with phone → Use

Data safety:
- Data collected: Phone number, Name, Location
- Data sharing: No
- Data deletion: Yes, by request
```

### 4. Сборка и загрузка APK/AAB
```powershell
# 1. Подготовка
cd D:\Projects\Evpower-mobile
npm install
npx cap sync android

# 2. Сборка Release AAB (рекомендуется)
cd android
.\gradlew.bat bundleRelease

# Файл будет здесь:
# android\app\build\outputs\bundle\release\app-release.aab

# 3. ИЛИ сборка APK
.\gradlew.bat assembleRelease

# Файл будет здесь:
# android\app\build\outputs\apk\release\app-release.apk
```

### 5. Загрузка в Google Play
```
1. Production → Create new release
2. Upload AAB/APK
3. Release name: 1.0.0
4. Release notes:
   - Первый релиз приложения
   - Базовый функционал зарядки
   - Интеграция с O!Dengi

5. Review → Start rollout
```

---

## 🍎 APPLE APP STORE

### 1. Подготовка Apple Developer
```
1. Создать Apple Developer аккаунт
   - https://developer.apple.com
   - $99/год
   - Требует DUNS номер для организации

2. App Store Connect
   - https://appstoreconnect.apple.com
   - Create New App
   - Bundle ID: kg.evpower.app
```

### 2. Настройка в Xcode
```bash
# 1. Подготовка проекта
cd D:\Projects\Evpower-mobile
npm install
npx cap sync ios

# 2. Открыть в Xcode (на Mac)
npx cap open ios

# 3. В Xcode:
- Select team
- Set Bundle ID: kg.evpower.app
- Set version: 1.0.0
- Set build: 1
```

### 3. Сертификаты и Provisioning
```
1. Certificates, IDs & Profiles
   - Create iOS Distribution certificate
   - Create App ID: kg.evpower.app
   - Create Provisioning Profile

2. Capabilities:
   - Push Notifications
   - Background Modes
   - Camera Usage
   - Location Services
```

### 4. App Store информация
```
App Information:
- Name: EvPower
- Primary Language: Russian
- Bundle ID: kg.evpower.app
- SKU: EVPOWER001

Pricing: Free

App Review:
- Demo account: +996555123456
- Demo password: 1234
- Notes: Use test balance for charging demo
```

### 5. Сборка и загрузка
```bash
# В Xcode:
1. Product → Archive
2. Validate App
3. Distribute App → App Store Connect
4. Upload

# Или через CLI:
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build \
  -exportOptionsPlist ios/App/ExportOptions.plist
```

---

## ✅ ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ

### Готовность кода
- [x] TypeScript компиляция без ошибок
- [x] Нет критических уязвимостей
- [x] API интеграция работает
- [x] Keystore создан (Android)
- [ ] Сертификаты настроены (iOS)

### Ресурсы
- [x] Иконка приложения (1024x1024)
- [ ] Screenshots (минимум 2-8)
- [ ] Feature graphic (1024x500)
- [ ] Описания на русском
- [ ] Privacy Policy URL
- [ ] Terms of Service URL

### Backend
- [ ] Production Supabase настроен
- [ ] Production API endpoints работают
- [ ] SSL сертификаты настроены
- [ ] Мониторинг настроен

---

## 📝 ПОШАГОВЫЙ ПЛАН ДЕПЛОЯ

### Фаза 1: Подготовка (1-2 дня)
1. ✅ Создать keystore Android
2. ✅ Настроить Supabase с таблицей user_favorites
3. ⬜ Получить production credentials Supabase
4. ⬜ Настроить production окружение
5. ⬜ Подготовить графические материалы
6. ⬜ Написать Privacy Policy и Terms

### Фаза 2: Google Play (2-3 дня)
1. ⬜ Создать Google Play Developer аккаунт
2. ⬜ Настроить приложение в консоли
3. ⬜ Собрать production AAB
4. ⬜ Загрузить в Internal Testing
5. ⬜ Тестирование с командой
6. ⬜ Исправить найденные баги
7. ⬜ Загрузить в Production

### Фаза 3: App Store (5-7 дней)
1. ⬜ Создать Apple Developer аккаунт
2. ⬜ Настроить сертификаты
3. ⬜ Собрать iOS build
4. ⬜ TestFlight beta testing
5. ⬜ Подготовить для App Review
6. ⬜ Отправить на review
7. ⬜ Ответить на замечания

### Фаза 4: Запуск (1 день)
1. ⬜ Координированный релиз
2. ⬜ Мониторинг crash reports
3. ⬜ Поддержка пользователей
4. ⬜ Сбор отзывов

---

## 🎯 ЧЕКЛИСТ ПЕРЕД РЕЛИЗОМ

### Функциональность
- [ ] Регистрация/вход работает
- [ ] Карта станций загружается
- [ ] QR сканер работает
- [ ] Зарядка запускается/останавливается
- [ ] Баланс обновляется
- [ ] Пополнение через QR работает
- [ ] Пополнение картой (тестовый режим OBANK)
- [ ] Real-time обновления через WebSocket
- [ ] История отображается
- [x] Избранные станции работают

### Производительность
- [ ] Приложение запускается < 3 сек
- [ ] Нет утечек памяти
- [ ] Батарея не разряжается быстро
- [ ] Размер APK < 50MB

### Безопасность
- [ ] Нет хардкод credentials
- [ ] HTTPS везде
- [ ] Secure Storage для токенов
- [ ] ProGuard/R8 включен (Android)

### Совместимость
- [ ] Android 5.1+ (API 22+)
- [ ] iOS 13.0+
- [ ] Планшеты поддерживаются
- [ ] Разные размеры экранов

### Документация
- [ ] README обновлен
- [ ] API документирован
- [ ] Changelog подготовлен
- [ ] Support контакты указаны

---

## 📊 МЕТРИКИ УСПЕХА

### KPI первой недели
- Установок: 100+
- Активных пользователей: 50+
- Crash rate: <1%
- Рейтинг: 4.0+

### KPI первого месяца
- Установок: 1000+
- Retention Day 7: >30%
- Успешных зарядок: 500+
- Средний чек: 300 сом

---

## 🚨 ПЛАН ОТКАТА

Если критические баги после релиза:
1. Откатить версию в stores
2. Hotfix в течение 24 часов
3. Экстренное тестирование
4. Повторный релиз
5. Уведомление пользователей (через WebSocket или email)

---

## 📞 КОНТАКТЫ ПОДДЕРЖКИ

### Техническая поддержка
- Email: support@evpower.kg
- Telegram: @evpower_support
- Телефон: +996 XXX XXX XXX

### Время ответа
- Критические баги: 2 часа
- Обычные вопросы: 24 часа
- Feature requests: 72 часа

---

## 📅 TIMELINE

```
День 1-2:   Подготовка материалов
День 3-4:   Google Play submission
День 5-9:   iOS подготовка и submission
День 10-14: Review процесс
День 15:    🚀 РЕЛИЗ!
```

---

**Документ обновлен**: 2025-09-30
**Версия плана**: 1.0.0
**Последние изменения**:
- Добавлен чеклист для системы избранных станций
- Добавлены WebSocket real-time обновления
- Добавлено тестирование оплаты картой OBANK
- Убраны упоминания Firebase/Push (не используется)
**Следующее обновление**: После первого релиза