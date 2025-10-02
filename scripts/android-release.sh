#!/bin/bash

# Script for building Android release APK and AAB for Google Play Store
# Usage: ./scripts/android-release.sh

set -e

echo "🚀 EvPower Mobile - Android Release Build Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to generate keystore
generate_keystore() {
    echo -e "${YELLOW}Generating release keystore...${NC}"

    KEYSTORE_FILE="android/app/evpower-release.keystore"

    if [ -f "$KEYSTORE_FILE" ]; then
        echo -e "${YELLOW}Keystore already exists at $KEYSTORE_FILE${NC}"
        read -p "Do you want to regenerate it? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi

    # Collect keystore information
    read -p "Enter your name or company name: " OWNER_NAME
    read -p "Enter organizational unit (e.g., Development): " ORG_UNIT
    read -p "Enter organization (e.g., EvPower): " ORGANIZATION
    read -p "Enter city: " CITY
    read -p "Enter state/province: " STATE
    read -p "Enter country code (e.g., KG): " COUNTRY

    # Generate keystore
    keytool -genkey -v \
        -keystore "$KEYSTORE_FILE" \
        -alias evpower \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=$OWNER_NAME, OU=$ORG_UNIT, O=$ORGANIZATION, L=$CITY, ST=$STATE, C=$COUNTRY"

    echo -e "${GREEN}✓ Keystore generated successfully${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Keep your keystore file and passwords safe!${NC}"
    echo -e "${YELLOW}⚠️  You'll need them for all future app updates${NC}"
}

# Function to setup environment
setup_environment() {
    echo -e "${YELLOW}Setting up build environment...${NC}"

    # Check for keystore
    KEYSTORE_FILE="android/app/evpower-release.keystore"
    if [ ! -f "$KEYSTORE_FILE" ]; then
        echo -e "${YELLOW}No keystore found. Let's create one.${NC}"
        generate_keystore
    fi

    # Get keystore passwords
    if [ -z "$KEYSTORE_PASSWORD" ]; then
        read -sp "Enter keystore password: " KEYSTORE_PASSWORD
        echo
        export KEYSTORE_PASSWORD
    fi

    if [ -z "$KEY_PASSWORD" ]; then
        read -sp "Enter key password (press Enter if same as keystore password): " KEY_PASSWORD
        echo
        if [ -z "$KEY_PASSWORD" ]; then
            KEY_PASSWORD=$KEYSTORE_PASSWORD
        fi
        export KEY_PASSWORD
    fi

    export KEYSTORE_FILE="evpower-release.keystore"
    export KEY_ALIAS="evpower"

    echo -e "${GREEN}✓ Environment configured${NC}"
}

# Function to build the web app
build_web() {
    echo -e "${YELLOW}Building web app...${NC}"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install
    fi

    # Build the web app
    npm run build

    # Sync with Capacitor
    npx cap sync android

    echo -e "${GREEN}✓ Web app built and synced${NC}"
}

# Function to increment version
increment_version() {
    echo -e "${YELLOW}Current version information:${NC}"

    # Read current version from build.gradle
    CURRENT_VERSION_CODE=$(grep "versionCode" android/app/build.gradle | head -1 | awk '{print $2}')
    CURRENT_VERSION_NAME=$(grep "versionName" android/app/build.gradle | head -1 | awk '{print $2}' | tr -d '"')

    echo "Version Code: $CURRENT_VERSION_CODE"
    echo "Version Name: $CURRENT_VERSION_NAME"

    read -p "Do you want to increment version? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter new version code (current: $CURRENT_VERSION_CODE): " NEW_VERSION_CODE
        read -p "Enter new version name (current: $CURRENT_VERSION_NAME): " NEW_VERSION_NAME

        if [ ! -z "$NEW_VERSION_CODE" ]; then
            sed -i "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEW_VERSION_CODE/" android/app/build.gradle
        fi

        if [ ! -z "$NEW_VERSION_NAME" ]; then
            sed -i "s/versionName \"$CURRENT_VERSION_NAME\"/versionName \"$NEW_VERSION_NAME\"/" android/app/build.gradle
        fi

        echo -e "${GREEN}✓ Version updated${NC}"
    fi
}

# Function to build APK
build_apk() {
    echo -e "${YELLOW}Building release APK...${NC}"

    cd android
    ./gradlew assembleRelease
    cd ..

    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        # Copy APK to output directory
        mkdir -p dist/android
        cp "$APK_PATH" "dist/android/evpower-release.apk"
        echo -e "${GREEN}✓ APK built successfully: dist/android/evpower-release.apk${NC}"

        # Show APK size
        APK_SIZE=$(du -h "dist/android/evpower-release.apk" | cut -f1)
        echo -e "${GREEN}  Size: $APK_SIZE${NC}"
    else
        echo -e "${RED}✗ APK build failed${NC}"
        exit 1
    fi
}

# Function to build AAB (App Bundle)
build_aab() {
    echo -e "${YELLOW}Building release AAB (App Bundle)...${NC}"

    cd android
    ./gradlew bundleRelease
    cd ..

    AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
    if [ -f "$AAB_PATH" ]; then
        # Copy AAB to output directory
        mkdir -p dist/android
        cp "$AAB_PATH" "dist/android/evpower-release.aab"
        echo -e "${GREEN}✓ AAB built successfully: dist/android/evpower-release.aab${NC}"

        # Show AAB size
        AAB_SIZE=$(du -h "dist/android/evpower-release.aab" | cut -f1)
        echo -e "${GREEN}  Size: $AAB_SIZE${NC}"
    else
        echo -e "${RED}✗ AAB build failed${NC}"
        exit 1
    fi
}

# Function to verify APK
verify_apk() {
    echo -e "${YELLOW}Verifying APK signature...${NC}"

    if [ -f "dist/android/evpower-release.apk" ]; then
        # Verify signature
        jarsigner -verify -verbose -certs "dist/android/evpower-release.apk" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ APK signature verified${NC}"
        else
            echo -e "${RED}✗ APK signature verification failed${NC}"
        fi

        # Check if zipaligned
        zipalign -c -v 4 "dist/android/evpower-release.apk" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ APK is zipaligned${NC}"
        else
            echo -e "${YELLOW}⚠ APK is not zipaligned, aligning...${NC}"
            zipalign -v 4 "dist/android/evpower-release.apk" "dist/android/evpower-release-aligned.apk"
            mv "dist/android/evpower-release-aligned.apk" "dist/android/evpower-release.apk"
            echo -e "${GREEN}✓ APK aligned${NC}"
        fi
    fi
}

# Main execution
main() {
    echo
    echo "Select build type:"
    echo "1) APK only (for testing)"
    echo "2) AAB only (for Google Play)"
    echo "3) Both APK and AAB"
    echo "4) Generate keystore only"
    read -p "Enter your choice (1-4): " choice

    case $choice in
        1)
            setup_environment
            increment_version
            build_web
            build_apk
            verify_apk
            ;;
        2)
            setup_environment
            increment_version
            build_web
            build_aab
            ;;
        3)
            setup_environment
            increment_version
            build_web
            build_apk
            build_aab
            verify_apk
            ;;
        4)
            generate_keystore
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac

    echo
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}✓ Build completed successfully!${NC}"
    echo -e "${GREEN}================================${NC}"

    if [ -d "dist/android" ]; then
        echo
        echo "Build artifacts:"
        ls -lh dist/android/

        echo
        echo "Next steps:"
        echo "1. Test the APK on real devices"
        echo "2. Upload AAB to Google Play Console"
        echo "3. Fill in store listing information"
        echo "4. Submit for review"
    fi
}

# Run main function
main