# 🚨 СРОЧНО: Замена иконок evpower на Voltera

## Проблема

Приложение использует старые иконки evpower, нужно заменить на логотип Voltera.

---

## ✅ БЫСТРОЕ РЕШЕНИЕ (10 минут)

### Шаг 1: Используйте онлайн генератор (РЕКОМЕНДУЕТСЯ)

#### Вариант A: easyappicon.com (Самый быстрый)

1. **Откройте:** https://easyappicon.com/

2. **Загрузите:** `public/icons/voltera-logo-square.svg`

3. **Настройки:**
   - Platform: Select All (Android + iOS + Web)
   - Background Color: `#3B82F6` (брендовый синий Voltera)
   - Padding: 20%

4. **Скачайте архив**

5. **Распакуйте и скопируйте:**

   **Для Android:**

   ```bash
   # Скопировать все файлы из архива android/* в:
   cp -r downloaded-icons/android/* android/app/src/main/res/
   ```

   **Для iOS:**

   ```bash
   # Скопировать все файлы из архива ios/* в:
   cp -r downloaded-icons/ios/* ios/App/App/Assets.xcassets/AppIcon.appiconset/
   ```

   **Для Web (PWA):**

   ```bash
   # Скопировать иконки в public/icons/
   cp downloaded-icons/web/icon-*.png public/icons/
   ```

#### Вариант B: icon.kitchen (Альтернатива)

1. **Откройте:** https://icon.kitchen/

2. **Загрузите:** `public/icons/voltera-logo-square.svg`

3. **Настройки:**
   - Background: Custom color `#3B82F6`
   - Shape: Circle или Squircle
   - Padding: Medium

4. Скачайте и распакуйте как в Варианте A

---

### Шаг 2: Синхронизируйте Capacitor

После копирования новых иконок:

```bash
npx cap sync
```

---

### Шаг 3: Пересоберите приложение

```bash
# Android
cd android
./gradlew clean assembleRelease

# iOS (на macOS)
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App archive
```

---

## 📋 Чеклист замены иконок

### Web (PWA):

- [ ] `public/icons/icon-72x72.png` - Voltera
- [ ] `public/icons/icon-96x96.png` - Voltera
- [ ] `public/icons/icon-128x128.png` - Voltera
- [ ] `public/icons/icon-144x144.png` - Voltera
- [ ] `public/icons/icon-152x152.png` - Voltera
- [ ] `public/icons/icon-192x192.png` - Voltera
- [ ] `public/icons/icon-384x384.png` - Voltera
- [ ] `public/icons/icon-512x512.png` - Voltera
- [x] `public/favicon.svg` - Voltera ✅ (УЖЕ ГОТОВО)

### Android:

- [ ] `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` - Voltera
- [ ] `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` - Voltera
- [ ] `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` - Voltera
- [ ] `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` - Voltera
- [ ] `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` - Voltera
- [ ] Все `ic_launcher_round.png` в каждой папке
- [ ] Все `ic_launcher_foreground.png` в каждой папке

### iOS:

- [ ] `ios/App/App/Assets.xcassets/AppIcon.appiconset/*.png` - Все размеры Voltera

---

## 🎨 Параметры генерации

### Цвета:

- **Background:** `#3B82F6` (Primary Blue Voltera)
- **Foreground:** Логотип Voltera (черный/темный)

### Размеры:

**PWA/Web:**

- 72, 96, 128, 144, 152, 192, 384, 512

**Android:**

- mdpi: 48x48
- hdpi: 72x72
- xhdpi: 96x96
- xxhdpi: 144x144
- xxxhdpi: 192x192

**iOS:**

- 20@2x, 20@3x, 29@2x, 29@3x, 40@2x, 40@3x
- 60@2x, 60@3x, 76@1x, 76@2x, 83.5@2x
- App Store: 1024x1024

---

## 🚀 Альтернативный метод: Android Studio (если есть доступ)

1. Откройте проект в Android Studio:

   ```bash
   cd android
   # Открыть в Android Studio
   ```

2. ПКМ на `res/` → **New** → **Image Asset**

3. Параметры:
   - Asset Type: **Image**
   - Path: Выберите `public/icons/voltera-logo-square.svg`
   - Icon Type: **Launcher Icons (Adaptive and Legacy)**
   - Foreground Layer:
     - Source Asset: `public/icons/voltera-logo-square.svg`
     - Resize: 80%
   - Background Layer:
     - Color: `#3B82F6`

4. **Next** → **Finish**

Android Studio автоматически создаст все размеры!

---

## ⏱️ Время выполнения

- **Онлайн генератор:** 5 минут
- **Копирование файлов:** 2 минуты
- **Синхронизация:** 1 минута
- **Пересборка:** 5 минут

**Итого:** ~15 минут

---

## ✅ Проверка результата

После обновления иконок:

1. **Web:** Очистите кеш браузера (Ctrl+Shift+Delete) и обновите страницу
   - Favicon должен показывать логотип Voltera ✅

2. **Android:** Переустановите APK

   ```bash
   adb uninstall kg.voltera.app
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

   - Иконка приложения должна показывать логотип Voltera

3. **iOS:** Переустановите приложение через Xcode
   - Иконка должна показывать логотип Voltera

---

## 🔗 Полезные ссылки

- **easyappicon.com** - https://easyappicon.com/ (Рекомендуется)
- **icon.kitchen** - https://icon.kitchen/
- **appicon.co** - https://appicon.co/ (для iOS)
- **CloudConvert** - https://cloudconvert.com/svg-to-png (SVG → PNG)

---

## 📞 Если нужна помощь

Если возникли проблемы:

1. Убедитесь что используете файл `public/icons/voltera-logo-square.svg`
2. Проверьте что background color установлен `#3B82F6`
3. Убедитесь что padding установлен 15-20%
4. После копирования обязательно запустите `npx cap sync`

---

**Дата:** 2025-11-04
**Приоритет:** 🔥 ВЫСОКИЙ
**Время:** ~15 минут

**После выполнения этих шагов приложение будет использовать логотип Voltera вместо evpower!**
