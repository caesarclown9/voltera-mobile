#!/bin/bash

# Script to prepare assets for Google Play Store
# Generates required images and screenshots

set -e

echo "📱 Preparing Store Assets for Voltera Mobile"
echo "==========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create directories
mkdir -p store-listings/google-play/images/{screenshots,graphics}
mkdir -p store-listings/google-play/images/screenshots/{phone,tablet,wear}

# Function to check dependencies
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"

    # Check for ImageMagick
    if ! command -v convert &> /dev/null; then
        echo "ImageMagick is not installed. Installing..."
        sudo apt-get update && sudo apt-get install -y imagemagick
    fi

    # Check for optipng
    if ! command -v optipng &> /dev/null; then
        echo "optipng is not installed. Installing..."
        sudo apt-get install -y optipng
    fi

    echo -e "${GREEN}✓ Dependencies ready${NC}"
}

# Function to create app icon variations
create_icons() {
    echo -e "${YELLOW}Creating app icon variations...${NC}"

    # Source icon (should be 1024x1024)
    SOURCE_ICON="public/icon.png"

    if [ ! -f "$SOURCE_ICON" ]; then
        echo "Warning: Source icon not found at $SOURCE_ICON"
        echo "Creating placeholder icon..."

        # Create a placeholder icon with ImageMagick
        convert -size 1024x1024 xc:'#00BCD4' \
            -gravity center -fill white \
            -font Arial -pointsize 400 \
            -annotate +0+0 'EV' \
            "$SOURCE_ICON"
    fi

    # High-res icon for store (512x512)
    convert "$SOURCE_ICON" -resize 512x512 \
        "store-listings/google-play/images/ic_launcher-playstore.png"

    # Optimize
    optipng -o7 "store-listings/google-play/images/ic_launcher-playstore.png"

    echo -e "${GREEN}✓ Icons created${NC}"
}

# Function to create feature graphic
create_feature_graphic() {
    echo -e "${YELLOW}Creating feature graphic (1024x500)...${NC}"

    OUTPUT="store-listings/google-play/images/graphics/feature-graphic.png"

    # Create feature graphic with branding
    convert -size 1024x500 \
        'gradient:#00BCD4-#0097A7' \
        -gravity center \
        -fill white -font Arial-Bold -pointsize 72 \
        -annotate +0-50 'Voltera' \
        -fill white -font Arial -pointsize 36 \
        -annotate +0+50 'Зарядка для электромобилей' \
        "$OUTPUT"

    # Add logo overlay if exists
    if [ -f "public/icon.png" ]; then
        convert "$OUTPUT" \
            \( "public/icon.png" -resize 150x150 \) \
            -gravity west -geometry +50+0 \
            -composite "$OUTPUT"
    fi

    optipng -o7 "$OUTPUT"
    echo -e "${GREEN}✓ Feature graphic created${NC}"
}

# Function to create placeholder screenshots
create_screenshots() {
    echo -e "${YELLOW}Creating placeholder screenshots...${NC}"

    # Phone screenshots (1080x1920)
    PHONE_SCREENS=(
        "map:Карта станций:Найдите ближайшую станцию"
        "charging:Процесс зарядки:Контролируйте зарядку в реальном времени"
        "payment:Оплата:Удобное пополнение баланса"
        "history:История:Все ваши зарядки в одном месте"
        "profile:Профиль:Управление аккаунтом"
    )

    for i in "${!PHONE_SCREENS[@]}"; do
        IFS=':' read -r name title subtitle <<< "${PHONE_SCREENS[$i]}"
        OUTPUT="store-listings/google-play/images/screenshots/phone/screen_${i}_${name}.png"

        # Create screenshot background
        convert -size 1080x1920 \
            'gradient:#F5F5F5-#E0E0E0' \
            -gravity north \
            -fill '#333333' -font Arial-Bold -pointsize 48 \
            -annotate +0+200 "$title" \
            -fill '#666666' -font Arial -pointsize 32 \
            -annotate +0+280 "$subtitle" \
            "$OUTPUT"

        # Add device frame mockup area
        convert "$OUTPUT" \
            -fill white \
            -draw "roundrectangle 40,400 1040,1800 20,20" \
            "$OUTPUT"

        # Add app UI placeholder
        convert "$OUTPUT" \
            -fill '#00BCD4' \
            -draw "rectangle 40,400 1040,520" \
            -gravity north -fill white -font Arial -pointsize 36 \
            -annotate +0+445 "$title" \
            "$OUTPUT"

        optipng -o7 "$OUTPUT"
        echo -e "${GREEN}✓ Created screenshot: $name${NC}"
    done

    # Tablet screenshots (1920x1200)
    echo -e "${YELLOW}Creating tablet screenshots...${NC}"

    for i in "${!PHONE_SCREENS[@]}"; do
        IFS=':' read -r name title subtitle <<< "${PHONE_SCREENS[$i]}"
        PHONE="store-listings/google-play/images/screenshots/phone/screen_${i}_${name}.png"
        TABLET="store-listings/google-play/images/screenshots/tablet/screen_${i}_${name}.png"

        # Convert phone screenshot to tablet aspect ratio
        convert "$PHONE" -resize 1920x1200! "$TABLET"
        optipng -o7 "$TABLET"
    done

    echo -e "${GREEN}✓ Screenshots created${NC}"
}

# Function to generate notification icon
create_notification_icon() {
    echo -e "${YELLOW}Creating notification icon...${NC}"

    SOURCE="public/icon.png"
    OUTPUT="store-listings/google-play/images/ic_notification.png"

    # Create monochrome notification icon
    convert "$SOURCE" -resize 96x96 \
        -colorspace Gray \
        -fill white -colorize 100% \
        -transparent white \
        "$OUTPUT"

    optipng -o7 "$OUTPUT"
    echo -e "${GREEN}✓ Notification icon created${NC}"
}

# Function to create promotional banner
create_promo_banner() {
    echo -e "${YELLOW}Creating promotional banner (1024x500)...${NC}"

    OUTPUT="store-listings/google-play/images/graphics/promo-banner.png"

    # Create promotional banner
    convert -size 1024x500 \
        'gradient:#4CAF50-#2E7D32' \
        -gravity center \
        -fill white -font Arial-Bold -pointsize 64 \
        -annotate +0-40 'Скидка 50%' \
        -fill white -font Arial -pointsize 32 \
        -annotate +0+40 'На первую зарядку для новых пользователей' \
        "$OUTPUT"

    optipng -o7 "$OUTPUT"
    echo -e "${GREEN}✓ Promotional banner created${NC}"
}

# Function to create TV banner
create_tv_banner() {
    echo -e "${YELLOW}Creating TV banner (1280x720)...${NC}"

    OUTPUT="store-listings/google-play/images/graphics/tv-banner.png"

    convert -size 1280x720 \
        'gradient:#00BCD4-#0097A7' \
        -gravity center \
        -fill white -font Arial-Bold -pointsize 96 \
        -annotate +0+0 'Voltera' \
        "$OUTPUT"

    optipng -o7 "$OUTPUT"
    echo -e "${GREEN}✓ TV banner created${NC}"
}

# Function to optimize all existing images
optimize_images() {
    echo -e "${YELLOW}Optimizing all images...${NC}"

    # Find and optimize all PNG files
    find public -name "*.png" -exec optipng -o7 {} \;
    find src -name "*.png" -exec optipng -o7 {} \;

    # Convert and optimize JPG files
    find public -name "*.jpg" -exec convert {} -quality 85 {} \;
    find src -name "*.jpg" -exec convert {} -quality 85 {} \;

    echo -e "${GREEN}✓ Images optimized${NC}"
}

# Function to create README
create_readme() {
    echo -e "${YELLOW}Creating assets README...${NC}"

    cat > store-listings/google-play/images/README.md << EOF
# Google Play Store Assets

## Required Images

### App Icon
- **File:** ic_launcher-playstore.png
- **Size:** 512x512px
- **Format:** 32-bit PNG (with alpha)

### Feature Graphic
- **File:** graphics/feature-graphic.png
- **Size:** 1024x500px
- **Format:** 24-bit PNG or JPEG (no alpha)

### Screenshots
- **Phone:** screenshots/phone/*.png (2-8 images)
  - Size: 1080x1920px (or similar 16:9)
- **Tablet:** screenshots/tablet/*.png (optional, up to 8)
  - Size: 1920x1200px (or similar 16:10)

### Promotional Graphics (Optional)
- **Promo Graphic:** graphics/promo-banner.png (180x120px)
- **TV Banner:** graphics/tv-banner.png (1280x720px)

## Image Guidelines

1. **No alpha channels** in feature graphic
2. **No text borders** or promotional content in app icon
3. **Screenshots** must show actual app UI
4. **Localize** screenshots for each language
5. **Optimize** file sizes (use PNG crush/optipng)

## Next Steps

1. Replace placeholder screenshots with actual app screenshots
2. Create professional feature graphic with proper branding
3. Ensure all images meet Google Play guidelines
4. Test on various devices for quality

## Tools Used
- ImageMagick for image generation
- optipng for optimization

## Regenerate Assets
Run: \`./scripts/prepare-store-assets.sh\`
EOF

    echo -e "${GREEN}✓ README created${NC}"
}

# Main execution
main() {
    check_dependencies
    create_icons
    create_feature_graphic
    create_screenshots
    create_notification_icon
    create_promo_banner
    create_tv_banner
    optimize_images
    create_readme

    echo
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}✓ Store assets prepared successfully!${NC}"
    echo -e "${GREEN}======================================${NC}"
    echo
    echo "Assets location: store-listings/google-play/images/"
    echo
    echo "Next steps:"
    echo "1. Replace placeholder screenshots with actual app screenshots"
    echo "2. Review and update feature graphic with proper branding"
    echo "3. Ensure all images meet Google Play requirements"
    echo "4. Upload to Google Play Console"
}

# Run main function
main