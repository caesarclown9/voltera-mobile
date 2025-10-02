# 🔐 Создание Android Keystore для EvPower

## 📋 Предварительные требования

### 1. Проверка Java в PowerShell:
```powershell
# Проверить установку Java
java -version

# Если Java не найдена, проверить JAVA_HOME
echo $env:JAVA_HOME

# Проверить путь к keytool
where.exe keytool

# Альтернативный путь к keytool (обычно)
# C:\Program Files\Java\jdk-{version}\bin\keytool.exe
# C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe
```

## 🔑 Генерация Production Keystore

### Вариант 1: Если keytool в PATH
```powershell
# Перейти в папку android/app
cd D:\Projects\Evpower-mobile\android\app

# Создать keystore (ОДНОЙ КОМАНДОЙ - скопируй полностью)
keytool -genkeypair -v `
  -keystore evpower-release.keystore `
  -alias evpower `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storepass "EvPower2024Secure!" `
  -keypass "EvPower2024Secure!" `
  -dname "CN=EvPower, OU=Mobile Development, O=EvPower, L=Bishkek, ST=Chui, C=KG"
```

### Вариант 2: Если keytool НЕ в PATH (Android Studio)
```powershell
# Перейти в папку android/app
cd D:\Projects\Evpower-mobile\android\app

# Использовать полный путь к keytool от Android Studio
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v `
  -keystore evpower-release.keystore `
  -alias evpower `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storepass "EvPower2024Secure!" `
  -keypass "EvPower2024Secure!" `
  -dname "CN=EvPower, OU=Mobile Development, O=EvPower, L=Bishkek, ST=Chui, C=KG"
```

### Вариант 3: Интерактивный режим (вводишь данные вручную)
```powershell
cd D:\Projects\Evpower-mobile\android\app

keytool -genkeypair -v -keystore evpower-release.keystore -alias evpower -keyalg RSA -keysize 2048 -validity 10000
```
Система запросит:
- Пароль keystore: **EvPower2024Secure!**
- Повтор пароля: **EvPower2024Secure!**
- Имя и фамилия: **EvPower**
- Подразделение: **Mobile Development**
- Организация: **EvPower**
- Город: **Bishkek**
- Область/край: **Chui**
- Код страны: **KG**
- Подтвердить: **yes**
- Пароль для alias: **[Enter для того же пароля]**

## ✅ Проверка созданного Keystore

```powershell
# Проверить что файл создан
dir evpower-release.keystore

# Посмотреть информацию о keystore
keytool -list -v -keystore evpower-release.keystore -storepass "EvPower2024Secure!"

# Проверить SHA1 и SHA256 (для Google Play Console)
keytool -list -v -keystore evpower-release.keystore -alias evpower -storepass "EvPower2024Secure!" | Select-String "SHA1:", "SHA256:"
```

## 📝 Создание файла конфигурации

### 1. Создать файл `android/keystore.properties`:
```powershell
# Создать файл с настройками (PowerShell)
@"
storePassword=EvPower2024Secure!
keyPassword=EvPower2024Secure!
keyAlias=evpower
storeFile=evpower-release.keystore
"@ | Out-File -FilePath "D:\Projects\Evpower-mobile\android\keystore.properties" -Encoding UTF8
```

### 2. Проверить что файл в .gitignore:
```powershell
# Проверить .gitignore
Select-String -Path "D:\Projects\Evpower-mobile\.gitignore" -Pattern "keystore"
```

## 🔧 Настройка Gradle

### Файл уже настроен в `android/app/build.gradle`:
```gradle
// Загрузка конфигурации keystore
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('keystore.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ...
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...
        }
    }
}
```

## 🚀 Сборка подписанного APK

```powershell
# Перейти в корень проекта
cd D:\Projects\Evpower-mobile

# Синхронизировать Capacitor
npx cap sync android

# Открыть в Android Studio для сборки
npx cap open android

# ИЛИ собрать через командную строку
cd android
.\gradlew.bat assembleRelease

# APK будет в:
# android\app\build\outputs\apk\release\app-release.apk
```

## 🛡️ ВАЖНО: Безопасность Keystore

### ⚠️ КРИТИЧЕСКИ ВАЖНО:
1. **НИКОГДА** не коммитить `evpower-release.keystore` в Git
2. **НИКОГДА** не коммитить `keystore.properties` в Git
3. **СОХРАНИТЬ** keystore в безопасном месте (минимум 3 копии):
   - Локально в защищенной папке
   - В облачном хранилище с шифрованием
   - На внешнем носителе в сейфе

### 📦 Рекомендуемое хранение:
```powershell
# Создать резервную копию с паролями
$date = Get-Date -Format "yyyy-MM-dd"
$backupDir = "C:\SecureBackup\EvPower"

# Создать директорию для бэкапа
New-Item -ItemType Directory -Force -Path $backupDir

# Копировать keystore
Copy-Item "D:\Projects\Evpower-mobile\android\app\evpower-release.keystore" `
          "$backupDir\evpower-release-$date.keystore"

# Сохранить информацию (в защищенный файл)
@"
EVPOWER ANDROID KEYSTORE INFO
Generated: $date
============================
Keystore: evpower-release.keystore
Alias: evpower
Store Password: EvPower2024Secure!
Key Password: EvPower2024Secure!

SHA1 Fingerprint: [будет после генерации]
SHA256 Fingerprint: [будет после генерации]

ВАЖНО: Без этого keystore невозможно обновить приложение в Google Play!
"@ | Out-File -FilePath "$backupDir\keystore-info-$date.txt" -Encoding UTF8

Write-Host "Backup created at: $backupDir" -ForegroundColor Green
```

## 📱 Google Play Console

После создания keystore получи SHA сертификаты для Google Play:

```powershell
# Получить SHA1 (для Google Play Console)
keytool -list -v -keystore evpower-release.keystore -alias evpower -storepass "EvPower2024Secure!" | Select-String "SHA1:"

# Получить SHA256 (для Google Play App Signing)
keytool -list -v -keystore evpower-release.keystore -alias evpower -storepass "EvPower2024Secure!" | Select-String "SHA256:"

# Получить MD5 (иногда требуется)
keytool -list -v -keystore evpower-release.keystore -alias evpower -storepass "EvPower2024Secure!" | Select-String "MD5:"
```

## 🔄 Альтернативные пароли

Если хочешь использовать свои пароли, замени:
- `EvPower2024Secure!` на свой пароль (минимум 8 символов)
- Используй одинаковый пароль для storepass и keypass (упрощает управление)

---

**⚠️ ПОМНИ**: Потеря keystore = невозможность обновить приложение в Google Play!