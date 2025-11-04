#!/bin/bash
# ============================================================================
# EvPower Mobile App - Main Build Script
# ============================================================================
# Wrapper script to call specific build scripts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

show_help() {
    echo "EvPower Mobile - Build Script"
    echo ""
    echo "Usage: ./build.sh [command]"
    echo ""
    echo "Commands:"
    echo "  debug          Build debug APK (for testing)"
    echo "  release        Build release AAB (for Google Play)"
    echo "  setup          Run setup checks"
    echo "  help           Show this help"
    echo ""
    echo "Examples:"
    echo "  ./build.sh debug    # Build debug APK"
    echo "  ./build.sh release  # Build release AAB"
    echo ""
}

case "$1" in
    debug)
        echo "🔨 Building debug APK..."
        bash "$SCRIPT_DIR/scripts/build/android-debug.sh"
        ;;
    release)
        echo "📦 Building release AAB..."
        bash "$SCRIPT_DIR/scripts/build/android-release.sh"
        ;;
    setup)
        echo "⚙️  Running setup checks..."
        bash "$SCRIPT_DIR/scripts/setup/check-environment.sh"
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
