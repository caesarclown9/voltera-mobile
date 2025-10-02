@echo off
echo ======================================
echo Building EvPower Android APK
echo ======================================

REM Проверяем Java
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Java не установлена или не настроена в PATH
    echo Установите JDK 17 и добавьте в PATH
    pause
    exit /b 1
)

echo Java найдена:
java -version 2>&1 | findstr /i "version"

REM Проверяем keytool
where keytool >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: keytool не найден. Проверьте установку JDK
    pause
    exit /b 1
)

REM Генерируем keystore если его нет
set KEYSTORE_FILE=android\app\evpower.keystore
if not exist "%KEYSTORE_FILE%" (
    echo.
    echo Создаем новый keystore...
    echo Используйте пароль: evpower123 или свой

    keytool -genkey -v -keystore "%KEYSTORE_FILE%" -alias evpower -keyalg RSA -keysize 2048 -validity 10000

    if exist "%KEYSTORE_FILE%" (
        echo Keystore создан успешно!
        echo ВАЖНО: Сохраните keystore и пароли!
    )
) else (
    echo Используем существующий keystore
)

REM Переходим в android директорию
cd android

REM Собираем Debug APK
echo.
echo ======================================
echo Собираем Debug APK...
echo ======================================

REM Для Windows используем gradlew.bat
call gradlew.bat assembleDebug

REM Проверяем результат
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo SUCCESS: APK собран успешно!

    REM Копируем в корень
    copy "app\build\outputs\apk\debug\app-debug.apk" "..\evpower-debug.apk" >nul

    echo APK файл: evpower-debug.apk
    echo.

    REM Показываем размер файла
    for %%A in ("..\evpower-debug.apk") do echo Размер файла: %%~zA байт
) else (
    echo.
    echo ERROR: Сборка не удалась!
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo ======================================
echo Сборка завершена успешно!
echo ======================================
echo.
echo Для установки на устройство:
echo   adb install evpower-debug.apk
echo.
echo Или перенесите APK на телефон и установите вручную
echo (разрешите установку из неизвестных источников)
echo.
pause