# Отчет о переименовании проекта EvPower → Voltera

**Дата:** 2025-10-22  
**Статус:** ✅ Завершено

## Выполненные изменения

### 1. Конфигурационные файлы
- ✅ `package.json` - имя пакета изменено на `voltera-pwa`
- ✅ `capacitor.config.ts` - appId: `kg.voltera.app`, appName: `Voltera`
- ✅ `vite.config.ts` - все упоминания EvPower заменены на Voltera
- ✅ `public/manifest.json` - название приложения, ID, protocol handlers обновлены

### 2. Исходный код
- ✅ Все `.ts` и `.tsx` файлы в `/src` - полная замена evpower → voltera
- ✅ Переименован файл `src/services/evpowerApi.ts` → `volteraApi.ts`
- ✅ CSS файлы обновлены

### 3. Документация
- ✅ Все `.md` файлы (README, RULES, CHANGELOG, и т.д.)
- ✅ Legal файлы (privacy.html, terms.html, delete-account.html)
- ✅ Deployment документация

### 4. Android Native
- ✅ `android/app/build.gradle` - namespace и applicationId: `kg.voltera.app`
- ✅ `android/app/src/main/res/values/strings.xml` - app_name: `Voltera`
- ✅ Java package переименован: `kg.evpower.app` → `kg.voltera.app`
- ✅ `MainActivity.java` перемещен в новый package
- ✅ ProGuard rules, XML конфигурации обновлены
- ✅ Keystore references: `voltera-release.keystore`, alias: `voltera`

### 5. iOS Native
- ✅ `ios/App/App.xcodeproj/project.pbxproj` - все упоминания обновлены
- ✅ `Info.plist` файлы - bundle identifier: `kg.voltera.app`
- ✅ `Info.plist.additions` - certificate pinning domains обновлены
- ✅ Fastlane конфигурации (Fastfile, Matchfile)

### 6. Public и конфигурационные файлы
- ✅ `.well-known/apple-app-site-association` - appID обновлен
- ✅ `.well-known/assetlinks.json` - package_name: `kg.voltera.app`
- ✅ Все HTML файлы в `/public`
- ✅ `.env.example` и `.env.production.example`

### 7. Скрипты
- ✅ PowerShell скрипты (`.ps1`)
- ✅ Bash скрипты (`.sh`)
- ✅ JavaScript скрипты (`.cjs`, `.mjs`)
- ✅ SQL файлы

### 8. Переименованные файлы
- ✅ `src/services/evpowerApi.ts` → `volteraApi.ts`
- ✅ `public/icons/evpower-logo-*` → `voltera-logo-*`

### 9. API Endpoints и Domains
Все API endpoints обновлены с `evpower.kg` на `voltera.kg`:
- ✅ `ocpp.evpower.kg` → `ocpp.voltera.kg`
- ✅ `api.evpower.kg` → `api.voltera.kg`
- ✅ Protocol handler: `web+evpower` → `web+voltera`

## Финальная верификация

```bash
Упоминаний EvPower/evpower: 0
Упоминаний kg.evpower: 0
```

✅ Все упоминания EvPower успешно заменены на Voltera

## Важные замечания

### Что НЕ было изменено:
- ❌ Git remote URL (остался https://github.com/caesarclown9/Evpower-GP.git)
  - Это правильно, так как это ссылка на исходный репозиторий
- ❌ Папка `release-backend-fin` намеренно не изменялась
  - Это справочная документация backend проекта EvPower

### Следующие шаги:

1. **Backend:**
   - Склонировать backend EvPower
   - Переименовать в Voltera backend
   - Настроить домены `ocpp.voltera.kg` и `api.voltera.kg`

2. **Сборка:**
   - Выполнить `npm install` для обновления зависимостей
   - Запустить `npx cap sync` для синхронизации с native проектами
   - Пересобрать Android и iOS проекты

3. **Тестирование:**
   - Проверить сборку проекта: `npm run build`
   - Проверить TypeScript: `npm run typecheck`
   - Запустить тесты: `npm run test`
   - Протестировать на Android/iOS устройствах

4. **Deployment:**
   - Создать новые keystore файлы для Android (`voltera-release.keystore`)
   - Обновить signing конфигурации
   - Зарегистрировать новый bundle identifier в Apple Developer
   - Обновить Google Play Console с новым package name

## Структура изменений

**Всего файлов изменено:** 87+  
**Категории изменений:**
- Конфигурационные файлы: 10+
- Исходный код: 50+
- Документация: 10+
- Native код (Android/iOS): 15+
- Public файлы: 5+
- Скрипты: 7+

---

**Готово к продолжению разработки!** 🚀
