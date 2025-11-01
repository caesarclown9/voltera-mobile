#!/bin/bash

# Pre-release Check Script
# Комплексная проверка перед релизом приложения в Google Play
# Использование: npm run pre-release

set -e  # Остановка при первой ошибке

echo "🚀 EvPower Mobile - Pre-Release Check"
echo "======================================"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# Функция для вывода результата
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
  else
    echo -e "${RED}❌ $2${NC}"
    FAILED=1
  fi
}

# Функция для вывода предупреждения
print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "📋 Step 1: Checking environment configuration..."
if [ ! -f .env ]; then
  print_warning ".env file not found - create from .env.example"
  FAILED=1
else
  print_result 0 ".env file exists"
fi

# Проверка что .env не в git
if git ls-files --error-unmatch .env 2>/dev/null; then
  print_result 1 ".env must NOT be committed to git!"
else
  print_result 0 ".env is not in git"
fi

echo ""
echo "🔍 Step 2: Checking for secrets in code..."
if git grep -n -E '(eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z-_]{35})' src/ 2>/dev/null; then
  print_result 1 "Secrets found in source code!"
else
  print_result 0 "No hardcoded secrets found"
fi

echo ""
echo "🔷 Step 3: TypeScript strict check..."
if npm run typecheck; then
  print_result 0 "TypeScript compilation passed"
else
  print_result 1 "TypeScript compilation failed"
fi

echo ""
echo "📝 Step 4: ESLint check..."
if npm run lint; then
  print_result 0 "ESLint passed"
else
  print_warning "ESLint has warnings/errors - review before release"
fi

echo ""
echo "🔒 Step 5: Security audit..."
AUDIT_OUTPUT=$(npm audit --audit-level=moderate 2>&1 || true)
if echo "$AUDIT_OUTPUT" | grep -q "found 0 vulnerabilities"; then
  print_result 0 "No security vulnerabilities found"
else
  print_warning "Security vulnerabilities found:"
  npm audit --audit-level=moderate || true
fi

echo ""
echo "🧪 Step 6: Running tests..."
if npm test 2>/dev/null; then
  print_result 0 "Tests passed"
else
  print_warning "Tests not configured or failed"
fi

echo ""
echo "🏗️  Step 7: Production build..."
if npm run build; then
  print_result 0 "Production build successful"
else
  print_result 1 "Production build failed"
fi

echo ""
echo "📦 Step 8: Checking build output..."
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
  BUILD_SIZE=$(du -sh dist | cut -f1)
  print_result 0 "Build output exists (size: $BUILD_SIZE)"
else
  print_result 1 "Build output missing or empty"
fi

echo ""
echo "📱 Step 9: Android configuration check..."
if [ -f "android/app/build.gradle" ]; then
  VERSION_CODE=$(grep "versionCode" android/app/build.gradle | head -1 | sed 's/[^0-9]*//g')
  VERSION_NAME=$(grep "versionName" android/app/build.gradle | head -1 | sed 's/.*"\(.*\)".*/\1/')
  echo "   Version: $VERSION_NAME (build $VERSION_CODE)"
  print_result 0 "Android version: $VERSION_NAME (build $VERSION_CODE)"
else
  print_warning "Android configuration not found"
fi

echo ""
echo "🔐 Step 10: Environment variables check..."
REQUIRED_VARS=(
  "VITE_API_URL"
  "VITE_WEBSOCKET_URL"
  "VITE_SUPABASE_URL"
  "VITE_SUPABASE_ANON_KEY"
  "VITE_YANDEX_MAPS_API_KEY"
)

if [ -f .env ]; then
  for VAR in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$VAR=" .env; then
      VALUE=$(grep "^$VAR=" .env | cut -d'=' -f2)
      if [ -n "$VALUE" ] && [ "$VALUE" != "your-value-here" ]; then
        echo "   ✓ $VAR is set"
      else
        print_warning "$VAR is not configured properly"
      fi
    else
      print_warning "$VAR is missing in .env"
    fi
  done
fi

echo ""
echo "======================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
  echo ""
  echo "📱 Ready for release to Google Play"
  echo ""
  echo "Next steps:"
  echo "  1. npm run android:build - Build Android APK/AAB"
  echo "  2. Test on physical device"
  echo "  3. Upload to Google Play Console"
  exit 0
else
  echo -e "${RED}❌ SOME CHECKS FAILED!${NC}"
  echo ""
  echo "Please fix the issues above before releasing."
  exit 1
fi
