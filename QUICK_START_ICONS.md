# 🎯 БЫСТРЫЙ СТАРТ: Замена иконок на Voltera

## Текущая ситуация

- ✅ **Favicon (веб):** Уже обновлен на Voltera
- ⚠️ **Иконка приложения Android:** Показывает evpower (требуется замена)
- ⚠️ **Иконка приложения iOS:** Показывает evpower (требуется замена)

---

## 🚀 САМЫЙ БЫСТРЫЙ СПОСОБ (5 минут)

### 1. Откройте https://easyappicon.com/

### 2. Загрузите файл:

```
public/icons/voltera-logo-square.svg
```

### 3. Настройки:

- **Platform:** Select All
- **Background:** `#3B82F6`
- **Padding:** 20%

### 4. Нажмите "Generate" и скачайте архив

### 5. Распакуйте и скопируйте:

**Windows PowerShell:**

```powershell
# Android
Copy-Item -Path "downloaded-icons\android\*" -Destination "android\app\src\main\res\" -Recurse -Force

# iOS
Copy-Item -Path "downloaded-icons\ios\*" -Destination "ios\App\App\Assets.xcassets\AppIcon.appiconset\" -Recurse -Force

# Web
Copy-Item -Path "downloaded-icons\web\icon-*.png" -Destination "public\icons\" -Force
```

**Linux/macOS/WSL:**

```bash
# Android
cp -r downloaded-icons/android/* android/app/src/main/res/

# iOS
cp -r downloaded-icons/ios/* ios/App/App/Assets.xcassets/AppIcon.appiconset/

# Web
cp downloaded-icons/web/icon-*.png public/icons/
```

### 6. Синхронизируйте:

```bash
npx cap sync
```

### 7. Пересоберите:

```bash
npm run build
```

---

## ✅ ГОТОВО!

Теперь приложение использует логотип Voltera!

---

## 📖 Детальные инструкции

Если нужны подробности, смотрите:

- `URGENT_ICONS_UPDATE.md` - полная инструкция
- `ICONS_UPDATE_GUIDE.md` - техническая документация
