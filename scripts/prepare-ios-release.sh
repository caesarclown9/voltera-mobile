#!/bin/bash

# 🚀 EvPower iOS Release Preparation Script
# Автоматизирует подготовку к релизу в App Store

set -e  # Exit on error

echo "🚀 EvPower iOS Release Preparation"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Текущая версия в package.json: ${GREEN}${CURRENT_VERSION}${NC}"
echo ""

# Ask for new version
echo "❓ Какую версию хотите выпустить?"
echo "   Текущая: ${CURRENT_VERSION}"
read -p "   Новая версия (например, 1.0.2): " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    echo "${RED}❌ Версия не указана. Выход.${NC}"
    exit 1
fi

echo ""
echo "🔍 Проверяем новую версию: ${NEW_VERSION}"

# Update package.json version
echo "📝 Обновляем package.json..."
npm version $NEW_VERSION --no-git-tag-version

echo ""
echo "🔨 Проверяем зависимости..."
npm install

echo ""
echo "🏗️  Собираем production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo "${RED}❌ Ошибка при сборке! Проверьте код.${NC}"
    exit 1
fi

echo ""
echo "📱 Синхронизируем с iOS..."
npx cap sync ios

if [ $? -ne 0 ]; then
    echo "${RED}❌ Ошибка при синхронизации с iOS!${NC}"
    exit 1
fi

echo ""
echo "${GREEN}✅ Подготовка завершена успешно!${NC}"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Откройте Xcode:"
echo "      ${YELLOW}open ios/App/App.xcworkspace${NC}"
echo ""
echo "   2. В Xcode обновите Version и Build:"
echo "      App target → General"
echo "      - Version: ${GREEN}${NEW_VERSION}${NC}"
echo "      - Build: ${YELLOW}(увеличьте на 1)${NC}"
echo ""
echo "   3. Настройте Signing:"
echo "      App target → Signing & Capabilities"
echo "      - Team: ✅ Ваша команда"
echo "      - Signing Certificate: ✅ iOS Distribution"
echo ""
echo "   4. Создайте архив:"
echo "      - Выберите: ${YELLOW}Any iOS Device (arm64)${NC}"
echo "      - Product → Clean Build Folder"
echo "      - Product → Archive"
echo ""
echo "   5. Загрузите в App Store Connect через Organizer"
echo ""
echo "${GREEN}🎉 Удачи с релизом!${NC}"
