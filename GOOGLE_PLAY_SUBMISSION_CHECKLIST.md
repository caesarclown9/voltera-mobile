# Google Play Submission Checklist
## ✅ Полная проверка перед публикацией

**App:** EvPower - EV Charging
**Target Date:** TBD
**Version:** 1.0.0

---

## 🔴 КРИТИЧНО - Может привести к бану

### 1. Политики и документация
- [ ] **Privacy Policy** создана и доступна онлайн
  - URL: _________________
  - Проверено: [ ]

- [ ] **Terms of Service** созданы и доступны онлайн
  - URL: _________________
  - Проверено: [ ]

- [ ] **Контактная информация** актуальна
  - Email: support@evpower.kg
  - Адрес: Бишкек, Кыргызстан
  - Телефон: _________________ (ЗАПОЛНИТЕ!)

### 2. Permissions (разрешения)
- [ ] **Все permissions объяснены** в Data Safety form
- [ ] **Нет лишних permissions** которые не используются
- [ ] **Dangerous permissions** (Location, Camera) запрашиваются runtime
- [ ] **Обоснование** каждого permission документировано

Текущие permissions:
- ✅ INTERNET (обязательно)
- ✅ ACCESS_FINE_LOCATION (для поиска станций)
- ✅ ACCESS_COARSE_LOCATION (для поиска станций)
- ✅ CAMERA (для QR сканирования - опционально)
- ✅ POST_NOTIFICATIONS (для уведомлений - опционально)

### 3. Безопасность данных
- [ ] **HTTPS везде** - нет HTTP запросов
- [ ] **API keys** не хардкоднуты в коде
- [ ] **Пароли хешируются** (через Supabase Auth)
- [ ] **Токены безопасно хранятся** (Secure Storage)
- [ ] **Нет SQL injection** уязвимостей
- [ ] **XSS защита** включена

### 4. Контент
- [ ] **Нет adult content**
- [ ] **Нет hate speech, насилия**
- [ ] **Нет азартных игр**
- [ ] **Возрастной рейтинг:** 18+ (из-за платежей)
- [ ] **Весь контент соответствует** Google Play Policies

---

## 🟡 ВАЖНО - Может привести к отклонению

### 5. App Quality
- [ ] **Нет крашей** при тестировании
- [ ] **UI корректно** на разных экранах
  - Телефон (маленький экран)
  - Телефон (большой экран)
  - Планшет (опционально)

- [ ] **Навигация работает** корректно
- [ ] **Back button** работает везде
- [ ] **Rotation** поддерживается (или отключена где нужно)

### 6. Функциональность
- [ ] **Backend доступен** (https://ocpp.evpower.kg)
- [ ] **Регистрация работает**
- [ ] **Вход работает**
- [ ] **Список станций загружается**
- [ ] **Карта отображается**
- [ ] **Запуск зарядки работает**
- [ ] **Оплата работает**
- [ ] **История загружается**

### 7. Store Listing Materials

#### Screenshots (обязательно!)
- [ ] **Phone screenshots:** минимум 2, максимум 8
  - Размер: 16:9 или 9:16 ratio
  - Разрешение: минимум 320px по короткой стороне
  - Формат: PNG или JPG

Нужны скриншоты:
- [ ] Главная карта с станциями
- [ ] Детали станции
- [ ] Процесс зарядки
- [ ] История зарядок
- [ ] Профиль пользователя

#### App Icon
- [ ] **Icon 512x512** PNG
- [ ] **Фон не прозрачный**
- [ ] **Качественный дизайн**
- [ ] **Не нарушает авторские права**

#### Feature Graphic (обязательно!)
- [ ] Размер: 1024x500 px
- [ ] PNG или JPG
- [ ] Без прозрачности
- [ ] Качественный дизайн

#### Video (опционально, но рекомендуется)
- [ ] YouTube video демонстрация
- [ ] Длительность 30-120 секунд

### 8. Store Listing Text

- [ ] **Title** (до 30 символов):
  ```
  EvPower - EV Charging
  ```

- [ ] **Short description** (до 80 символов):
  ```
  Найти и оплатить зарядку для электромобиля в Кыргызстане
  ```

- [ ] **Full description** (до 4000 символов):
  - ✅ Описывает функции
  - ✅ Понятно для пользователя
  - ✅ Нет спама/повторений keywords
  - ✅ Грамматически правильно

### 9. App Categories
- [ ] **Primary category:** Tools или Maps & Navigation
- [ ] **Tags:** electric vehicle, charging, ev, станции

---

## 🟢 РЕКОМЕНДУЕТСЯ

### 10. Testing
- [ ] **Internal Testing** проведено (Google Play)
- [ ] **Минимум 20 установок** в Internal Testing
- [ ] **Обратная связь** от тестеров собрана
- [ ] **Критичные баги** исправлены

### 11. Analytics & Monitoring
- [ ] **Crash reporting** настроен
- [ ] **Analytics** настроен (опционально)
- [ ] **Performance monitoring** настроен

### 12. Monetization
- [ ] **In-app billing** настроен корректно
- [ ] **Pricing** указан правильно
- [ ] **Refund policy** описана

---

## 📱 Technical Requirements

### APK/AAB Requirements
- [ ] **Format:** AAB (Android App Bundle) - **обязательно для новых приложений!**
- [ ] **Minimum SDK:** 23 (Android 6.0)
- [ ] **Target SDK:** 34+ (Android 14)
- [ ] **Подписан** release keystore
- [ ] **ProGuard/R8** включен для release
- [ ] **Размер APK:** < 150 MB (чем меньше, тем лучше)

### Version Info
- [ ] **versionCode:** 1
- [ ] **versionName:** 1.0.0
- [ ] **Package name:** kg.evpower.app (НЕЛЬЗЯ изменить потом!)

---

## 🔒 Security Checklist

### Code Security
- [ ] **No hardcoded secrets** (API keys, passwords)
- [ ] **Environment variables** используются
- [ ] **Minification** включено
- [ ] **Obfuscation** включено (ProGuard/R8)

### Network Security
- [ ] **Certificate pinning** (опционально)
- [ ] **Network security config** настроен
- [ ] **Все запросы HTTPS**

---

## 🎯 Google Play Specific

### 1. Developer Account
- [ ] **Account verified**
- [ ] **One-time fee paid** ($25)
- [ ] **Email verified**
- [ ] **2FA enabled** (рекомендуется)

### 2. App Content
- [ ] **Content rating** заполнен
  - Насилие: Нет
  - Сексуальный контент: Нет
  - Ненормативная лексика: Нет
  - Азартные игры: Нет

- [ ] **Target audience:** 18+
- [ ] **App access:** Требуется аккаунт (Login required)

### 3. Ads Declaration
- [ ] Приложение **БЕЗ рекламы** - указано в форме

### 4. COVID-19 Contact Tracing
- [ ] **Not applicable** (приложение НЕ для contact tracing)

---

## ⚠️ Common Rejection Reasons (чего ИЗБЕГАТЬ)

### ❌ НЕ ДОПУСКАЙТЕ:
1. **Копирование других приложений**
2. **Спам в описании** (повторение keywords)
3. **Вводящие в заблуждение claims** (напр., "Лучшее приложение в мире")
4. **Нерабочий функционал**
5. **Краши при запуске**
6. **Отсутствующий Privacy Policy**
7. **Сбор данных без объяснения**
8. **Опасные permissions без обоснования**
9. **Нарушение авторских прав** (иконки, изображения)
10. **Низкое качество UI/UX**

---

## 📋 Pre-Submission Final Check

### День перед сабмитом:
- [ ] Скачать APK из Internal Testing
- [ ] Установить на чистое устройство
- [ ] Пройти весь user flow
- [ ] Проверить все screens
- [ ] Проверить все permissions dialogs
- [ ] Убедиться что нет крашей
- [ ] Проверить быстродействие

### Утро сабмита:
- [ ] Backend работает (https://ocpp.evpower.kg)
- [ ] Privacy Policy доступна онлайн
- [ ] Terms of Service доступны онлайн
- [ ] Все материалы подготовлены
- [ ] Team готова к быстрым фиксам

---

## 📞 Emergency Contacts

### Если приложение отклонено:
1. **Читать rejection email ВНИМАТЕЛЬНО**
2. **Исправить указанные проблемы**
3. **Добавить Appeal пояснение**
4. **Повторно отправить**

### Support:
- Google Play Support: через Console
- Developer Community: https://support.google.com/googleplay/android-developer

---

## ✅ Sign-Off

**Проверено:**
- [ ] Backend Developer: ________________
- [ ] Frontend Developer: ________________
- [ ] QA Tester: ________________
- [ ] Project Manager: ________________

**Дата проверки:** ________________

**Готово к публикации:** [ ] YES / [ ] NO

---

## 🚀 ПОСЛЕ ПУБЛИКАЦИИ

### Monitoring (первые 48 часов):
- [ ] Проверять краш-репорты каждые 4 часа
- [ ] Отвечать на отзывы пользователей
- [ ] Мониторить загрузки
- [ ] Проверять rating

### Первая неделя:
- [ ] Анализировать feedback
- [ ] Собирать баг-репорты
- [ ] Планировать hotfix если нужно

---

**Version:** 1.0
**Last Updated:** 2 октября 2025
**Status:** 📝 In Progress
