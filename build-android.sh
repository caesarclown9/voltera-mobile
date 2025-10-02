#!/bin/bash

# Простой скрипт для сборки Android APK

echo "🚀 Building EvPower Android APK"
echo "================================"

# Проверяем Java
if ! command -v java &> /dev/null; then
    echo "❌ Java не установлена. Установите JDK 17+"
    exit 1
fi

# Проверяем keytool
if ! command -v keytool &> /dev/null; then
    echo "❌ keytool не найден. Установите JDK"
    exit 1
fi

# Генерируем keystore если его нет
KEYSTORE_FILE="android/app/evpower.keystore"
if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "📝 Создаем новый keystore..."
    echo "Используйте пароль: evpower123 (или свой)"

    keytool -genkey -v \
        -keystore "$KEYSTORE_FILE" \
        -alias evpower \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=EvPower, OU=Mobile, O=EvPower, L=Bishkek, ST=Chui, C=KG"

    echo "✅ Keystore создан: $KEYSTORE_FILE"
    echo "⚠️  ВАЖНО: Сохраните keystore и пароли!"
else
    echo "✅ Используем существующий keystore"
fi

# Собираем APK
echo "🔨 Собираем APK..."
cd android

# Debug версия (без подписи)
echo "📦 Собираем Debug APK..."
./gradlew assembleDebug

if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
    echo "✅ Debug APK готов: android/app/build/outputs/apk/debug/app-debug.apk"

    # Копируем в корень для удобства
    cp app/build/outputs/apk/debug/app-debug.apk ../evpower-debug.apk
    echo "📱 APK скопирован: evpower-debug.apk"

    # Показываем размер
    SIZE=$(du -h ../evpower-debug.apk | cut -f1)
    echo "📏 Размер: $SIZE"
else
    echo "❌ Сборка не удалась"
    exit 1
fi

cd ..

echo ""
echo "✅ Готово!"
echo ""
echo "Для установки на устройство:"
echo "  adb install evpower-debug.apk"
echo ""
echo "Или перенесите APK на телефон и установите вручную"
echo "(нужно разрешить установку из неизвестных источников)"