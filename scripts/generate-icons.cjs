const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceLogo = path.join(__dirname, '../public/icons/evpower-logo-square.png');

// PWA icon sizes
const pwaIconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Android mipmap sizes
const androidSizes = {
  'mdpi': 48,
  'hdpi': 72,
  'xhdpi': 96,
  'xxhdpi': 144,
  'xxxhdpi': 192
};

// iOS AppIcon sizes (required by Xcode)
const iosIconSizes = [
  { size: 20, scale: 2, filename: 'AppIcon-20x20@2x.png' },
  { size: 20, scale: 3, filename: 'AppIcon-20x20@3x.png' },
  { size: 29, scale: 2, filename: 'AppIcon-29x29@2x.png' },
  { size: 29, scale: 3, filename: 'AppIcon-29x29@3x.png' },
  { size: 40, scale: 2, filename: 'AppIcon-40x40@2x.png' },
  { size: 40, scale: 3, filename: 'AppIcon-40x40@3x.png' },
  { size: 60, scale: 2, filename: 'AppIcon-60x60@2x.png' },
  { size: 60, scale: 3, filename: 'AppIcon-60x60@3x.png' },
  { size: 76, scale: 1, filename: 'AppIcon-76x76@1x.png' },
  { size: 76, scale: 2, filename: 'AppIcon-76x76@2x.png' },
  { size: 83.5, scale: 2, filename: 'AppIcon-83.5x83.5@2x.png' },
  { size: 1024, scale: 1, filename: 'AppIcon-1024x1024@1x.png' }
];

async function generateIcons() {
  console.log('Starting icon generation...');

  // Generate PWA icons
  console.log('\nGenerating PWA icons...');
  for (const size of pwaIconSizes) {
    const outputPath = path.join(__dirname, `../public/icons/icon-${size}x${size}.png`);
    await sharp(sourceLogo)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`✓ Created ${size}x${size} PWA icon`);
  }

  // Generate maskable icons (with padding for safe area)
  console.log('\nGenerating maskable icons...');
  for (const size of [192, 512]) {
    const outputPath = path.join(__dirname, `../public/icons/icon-${size}x${size}-maskable.png`);
    const paddedSize = Math.floor(size * 0.7); // 70% of canvas for safe area
    await sharp(sourceLogo)
      .resize(paddedSize, paddedSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .extend({
        top: Math.floor((size - paddedSize) / 2),
        bottom: Math.ceil((size - paddedSize) / 2),
        left: Math.floor((size - paddedSize) / 2),
        right: Math.ceil((size - paddedSize) / 2),
        background: { r: 16, g: 185, b: 129, alpha: 1 } // #10B981
      })
      .png()
      .toFile(outputPath);
    console.log(`✓ Created ${size}x${size} maskable icon`);
  }

  // Generate Android icons
  console.log('\nGenerating Android icons...');
  for (const [density, size] of Object.entries(androidSizes)) {
    const icLauncherDir = path.join(__dirname, `../android/app/src/main/res/mipmap-${density}`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(icLauncherDir)) {
      fs.mkdirSync(icLauncherDir, { recursive: true });
    }

    // Generate ic_launcher.png
    const outputPath = path.join(icLauncherDir, 'ic_launcher.png');
    await sharp(sourceLogo)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`✓ Created ${density} Android icon (${size}x${size})`);

    // Generate ic_launcher_round.png
    const roundOutputPath = path.join(icLauncherDir, 'ic_launcher_round.png');
    await sharp(sourceLogo)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(roundOutputPath);
    console.log(`✓ Created ${density} Android round icon (${size}x${size})`);

    // Generate ic_launcher_foreground.png (with padding for adaptive icon)
    const foregroundSize = Math.floor(size * 0.7);
    const foregroundOutputPath = path.join(icLauncherDir, 'ic_launcher_foreground.png');
    await sharp(sourceLogo)
      .resize(foregroundSize, foregroundSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .extend({
        top: Math.floor((size - foregroundSize) / 2),
        bottom: Math.ceil((size - foregroundSize) / 2),
        left: Math.floor((size - foregroundSize) / 2),
        right: Math.ceil((size - foregroundSize) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(foregroundOutputPath);
    console.log(`✓ Created ${density} Android foreground icon (${size}x${size})`);
  }

  // Generate iOS icons
  console.log('\nGenerating iOS icons...');
  const iosIconDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/AppIcon.appiconset');

  if (!fs.existsSync(iosIconDir)) {
    fs.mkdirSync(iosIconDir, { recursive: true });
  }

  for (const icon of iosIconSizes) {
    const pixelSize = Math.floor(icon.size * icon.scale);
    const outputPath = path.join(iosIconDir, icon.filename);
    await sharp(sourceLogo)
      .resize(pixelSize, pixelSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outputPath);
    console.log(`✓ Created iOS icon ${icon.filename} (${pixelSize}x${pixelSize})`);
  }

  // Generate favicon
  console.log('\nGenerating favicon...');
  const faviconPath = path.join(__dirname, '../public/favicon.png');
  await sharp(sourceLogo)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(faviconPath);
  console.log('✓ Created favicon.png (32x32)');

  // Generate Apple Touch Icon
  const appleTouchIconPath = path.join(__dirname, '../public/apple-touch-icon.png');
  await sharp(sourceLogo)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(appleTouchIconPath);
  console.log('✓ Created apple-touch-icon.png (180x180)');

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
