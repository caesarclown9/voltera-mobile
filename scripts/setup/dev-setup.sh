#!/bin/bash

echo "🚀 Voltera Mobile Development Setup"
echo "===================================="
echo ""
echo "Choose your development environment:"
echo "1) Browser (Web + PWA)"
echo "2) Android Emulator"
echo "3) iOS Simulator (macOS only)"
echo "4) Docker Container"
echo "5) Ngrok Tunnel (for real device testing)"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
  1)
    echo "🌐 Starting browser development server..."
    npm run dev
    ;;
  2)
    echo "📱 Setting up Android emulator..."
    npm run build
    npx cap sync android
    echo "Choose:"
    echo "a) Run on emulator"
    echo "b) Open in Android Studio"
    read -p "Enter choice (a/b): " android_choice
    if [ "$android_choice" = "a" ]; then
      npx cap run android
    else
      npx cap open android
    fi
    ;;
  3)
    echo "🍎 Setting up iOS simulator..."
    if [[ "$OSTYPE" != "darwin"* ]]; then
      echo "❌ iOS development requires macOS"
      exit 1
    fi
    npm run build
    npx cap sync ios
    npx cap run ios
    ;;
  4)
    echo "🐳 Starting Docker container..."
    docker-compose up --build
    ;;
  5)
    echo "🌍 Starting Ngrok tunnel..."
    npm run dev &
    sleep 3
    ngrok http 3000
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac