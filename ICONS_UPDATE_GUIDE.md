# 📱 Инструкция по обновлению иконок Voltera

## Текущий статус

✅ **Favicon (веб):** Обновлен на логотип Voltera (SVG)
⚠️ **Android/iOS иконки:** Требуют ручной генерации из-за ограничений WSL

---

## 🌐 Web (Favicon) - ГОТОВО ✅

Favicon уже обновлен:

- `public/favicon.svg` - SVG логотип Voltera (поддерживается всеми современными браузерами)
- Fallback: PNG иконки из `/public/icons/icon-*.png`

---

## 📱 Android иконки - ТРЕБУЕТСЯ ОБНОВЛЕНИЕ

### Способ 1: Использовать Android Studio (Рекомендуется)

1. Откройте проект в Android Studio:

   ```bash
   cd android
   open -a "Android Studio" .  # macOS
   # или двойной клик на android/ в Windows
   ```

2. Перейдите в `res/` → ПКМ → `New` → `Image Asset`

3. Настройте параметры:
   - **Asset Type:** Image
   - **Path:** Выберите `public/icons/voltera-logo-square.svg`
   - **Icon Type:** Launcher Icons (Adaptive and Legacy)
   - **Background:** `#3B82F6` (primary blue)
   - **Foreground:** Логотип Voltera
   - **Shape:** Circle или Squircle

4. Нажмите **Next** → **Finish**

5. Android Studio автоматически создаст все нужные размеры:
   - `mipmap-mdpi/` (48x48)
   - `mipmap-hdpi/` (72x72)
   - `mipmap-xhdpi/` (96x96)
   - `mipmap-xxhdpi/` (144x144)
   - `mipmap-xxxhdpi/` (192x192)
   - Adaptive icon XML (Android 8.0+)

### Способ 2: Онлайн генератор

1. Зайдите на https://icon.kitchen/ или https://easyappicon.com/

2. Загрузите `public/icons/voltera-logo-square.svg`

3. Настройте:
   - Platform: Android
   - Background: `#3B82F6`
   - Padding: 15-20%

4. Скачайте архив и замените файлы в:
   ```
   android/app/src/main/res/mipmap-*/ic_launcher.png
   android/app/src/main/res/mipmap-*/ic_launcher_round.png
   ```

### Способ 3: Использовать скрипт (требует native библиотеки)

Если у вас macOS или нативный Linux:

```bash
# Установить зависимости (если нужно)
npm install --include=optional sharp

# Конвертировать SVG в PNG
node scripts/convert-logo-svg-to-png.cjs

# Сгенерировать все иконки
node scripts/generate-icons.cjs
```

---

## 🍎 iOS иконки - ТРЕБУЕТСЯ ОБНОВЛЕНИЕ

### Способ 1: Использовать Xcode (Рекомендуется)

1. Откройте проект в Xcode:

   ```bash
   cd ios/App
   open App.xcworkspace
   ```

2. В навигаторе проекта выберите `App` → `Assets.xcassets` → `AppIcon`

3. Перетащите изображения в соответствующие слоты:
   - iPhone: 60pt@2x (120x120), 60pt@3x (180x180)
   - iPad: 76pt@1x (76x76), 76pt@2x (152x152)
   - App Store: 1024pt@1x (1024x1024)

4. Xcode автоматически адаптирует под все нужные размеры

### Способ 2: Онлайн генератор

1. Зайдите на https://appicon.co/ или https://makeappicon.com/

2. Загрузите `public/icons/voltera-logo-square.svg` или PNG версию (2048x2048)

3. Скачайте архив для iOS

4. Замените файлы в `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

---

## 🚀 PWA иконки (manifest.json)

PWA иконки уже настроены в `public/manifest.json` и указывают на:

- `/icons/icon-72x72.png`
- `/icons/icon-96x96.png`
- `/icons/icon-128x128.png`
- ... и т.д. до 512x512

**Для обновления:**

1. Сгенерируйте PNG иконки из SVG любым способом выше

2. Замените файлы в `public/icons/icon-*.png`

3. Или используйте скрипт генерации:
   ```bash
   node scripts/generate-icons.cjs
   ```

---

## 🎨 Текущие логотипы Voltera

Доступны в проекте:

- `public/icons/voltera-logo-square.svg` - квадратный логотип (для иконок)
- `public/icons/voltera-logo-horizontal.svg` - горизонтальный логотип (для заставок)

**Цвета бренда:**

- Primary Blue: `#3B82F6`
- Accent Purple: `#8B5CF6`
- Dark: `#2B2A29`

---

## ✅ Чеклист обновления иконок

### Web:

- [x] Favicon SVG (`public/favicon.svg`)
- [x] Fallback PNG (`public/icons/icon-192x192.png`)
- [x] Apple Touch Icon
- [x] Manifest.json theme_color обновлен

### Android:

- [ ] `mipmap-mdpi/ic_launcher.png` (48x48)
- [ ] `mipmap-hdpi/ic_launcher.png` (72x72)
- [ ] `mipmap-xhdpi/ic_launcher.png` (96x96)
- [ ] `mipmap-xxhdpi/ic_launcher.png` (144x144)
- [ ] `mipmap-xxxhdpi/ic_launcher.png` (192x192)
- [ ] Adaptive icon (foreground/background XML)

### iOS:

- [ ] AppIcon.appiconset/\*.png (все размеры)
- [ ] App Store icon (1024x1024)

### PWA:

- [ ] Все иконки в `public/icons/icon-*.png` обновлены на Voltera

---

## 💡 Рекомендация

**Для быстрого деплоя:**

1. ✅ **Web:** Уже готово (SVG favicon работает)

2. **Android:** Используйте Android Studio Image Asset Tool (5 минут)

3. **iOS:** Используйте Xcode AppIcon (5 минут)

**Общее время:** ~10-15 минут на обе платформы

---

## 🔧 Автоматизация (для будущего)

Для автоматической генерации иконок в CI/CD:

```yaml
# .github/workflows/generate-icons.yml
- name: Generate icons
  run: |
    npm install --include=optional sharp
    node scripts/convert-logo-svg-to-png.cjs
    node scripts/generate-icons.cjs
    npx cap sync
```

---

**Дата:** 2025-11-04
**Проект:** Voltera Mobile v1.0.1
