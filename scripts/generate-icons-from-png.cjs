#!/usr/bin/env node
/**
 * Generate all app icons from the provided Voltera PNG logo
 * Uses sharp library to resize the logo to all required sizes
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceLogo = path.join(__dirname, '../temp logos/VOLTERA.KG.png');
const androidResDir = path.join(__dirname, '../android/app/src/main/res');
const iosIconDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');
const publicIconsDir = path.join(__dirname, '../public/icons');

// Android icon sizes (mipmap densities)
const androidIcons = [
  { density: 'mipmap-mdpi', size: 48 },
  { density: 'mipmap-hdpi', size: 72 },
  { density: 'mipmap-xhdpi', size: 96 },
  { density: 'mipmap-xxhdpi', size: 144 },
  { density: 'mipmap-xxxhdpi', size: 192 },
];

// iOS icon sizes (AppIcon.appiconset)
const iosIcons = [
  { name: 'AppIcon-20x20@2x.png', size: 40 },
  { name: 'AppIcon-20x20@3x.png', size: 60 },
  { name: 'AppIcon-29x29@2x.png', size: 58 },
  { name: 'AppIcon-29x29@3x.png', size: 87 },
  { name: 'AppIcon-40x40@2x.png', size: 80 },
  { name: 'AppIcon-40x40@3x.png', size: 120 },
  { name: 'AppIcon-60x60@2x.png', size: 120 },
  { name: 'AppIcon-60x60@3x.png', size: 180 },
  { name: 'AppIcon-76x76@1x.png', size: 76 },
  { name: 'AppIcon-76x76@2x.png', size: 152 },
  { name: 'AppIcon-83.5x83.5@2x.png', size: 167 },
  { name: 'AppIcon-1024x1024@1x.png', size: 1024 },
];

// PWA icon sizes
const pwaIcons = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  console.log('🎨 Generating Voltera app icons...\n');

  // Check if source logo exists
  if (!fs.existsSync(sourceLogo)) {
    console.error('❌ Source logo not found:', sourceLogo);
    process.exit(1);
  }

  console.log('✓ Source logo found:', sourceLogo);

  try {
    // Generate Android icons
    console.log('\n📱 Generating Android icons...');
    for (const { density, size } of androidIcons) {
      const densityDir = path.join(androidResDir, density);

      // Create directory if it doesn't exist
      if (!fs.existsSync(densityDir)) {
        fs.mkdirSync(densityDir, { recursive: true });
      }

      // Generate ic_launcher.png
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 59, g: 130, b: 246, alpha: 1 } // #3B82F6
        })
        .png()
        .toFile(path.join(densityDir, 'ic_launcher.png'));

      // Generate ic_launcher_round.png
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 59, g: 130, b: 246, alpha: 1 }
        })
        .png()
        .toFile(path.join(densityDir, 'ic_launcher_round.png'));

      // Generate ic_launcher_foreground.png (adaptive icon)
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent
        })
        .png()
        .toFile(path.join(densityDir, 'ic_launcher_foreground.png'));

      console.log(`  ✓ ${density} (${size}x${size})`);
    }

    // Generate iOS icons
    console.log('\n🍎 Generating iOS icons...');

    // Create directory if it doesn't exist
    if (!fs.existsSync(iosIconDir)) {
      fs.mkdirSync(iosIconDir, { recursive: true });
    }

    for (const { name, size } of iosIcons) {
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 59, g: 130, b: 246, alpha: 1 } // #3B82F6
        })
        .png()
        .toFile(path.join(iosIconDir, name));

      console.log(`  ✓ ${name} (${size}x${size})`);
    }

    // Generate PWA icons
    console.log('\n🌐 Generating PWA icons...');

    // Create directory if it doesn't exist
    if (!fs.existsSync(publicIconsDir)) {
      fs.mkdirSync(publicIconsDir, { recursive: true });
    }

    for (const size of pwaIcons) {
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 59, g: 130, b: 246, alpha: 1 } // #3B82F6
        })
        .png()
        .toFile(path.join(publicIconsDir, `icon-${size}x${size}.png`));

      console.log(`  ✓ icon-${size}x${size}.png`);
    }

    console.log('\n✅ All icons generated successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npx cap sync');
    console.log('2. Rebuild the app');
    console.log('3. Test on Android/iOS devices\n');

  } catch (error) {
    console.error('\n❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
