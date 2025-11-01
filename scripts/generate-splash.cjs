const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const whiteLogo = path.join(__dirname, '../public/icons/evpower-logo-white.png');
const backgroundColor = { r: 16, g: 185, b: 129 }; // #10B981

// Android splash screen sizes
const androidSizes = {
  'port-ldpi': { width: 200, height: 320 },
  'port-mdpi': { width: 320, height: 480 },
  'port-hdpi': { width: 480, height: 800 },
  'port-xhdpi': { width: 720, height: 1280 },
  'port-xxhdpi': { width: 960, height: 1600 },
  'port-xxxhdpi': { width: 1280, height: 1920 },
  'land-ldpi': { width: 320, height: 200 },
  'land-mdpi': { width: 480, height: 320 },
  'land-hdpi': { width: 800, height: 480 },
  'land-xhdpi': { width: 1280, height: 720 },
  'land-xxhdpi': { width: 1600, height: 960 },
  'land-xxxhdpi': { width: 1920, height: 1280 },
};

// iOS splash screen size (universal)
const iosSplashSize = { width: 2732, height: 2732 };

async function generateSplashScreens() {
  console.log('Starting splash screen generation...');

  // Read the white logo
  const logoBuffer = fs.readFileSync(whiteLogo);
  const logoMetadata = await sharp(logoBuffer).metadata();

  // Generate Android splash screens
  console.log('\nGenerating Android splash screens...');
  for (const [density, size] of Object.entries(androidSizes)) {
    const androidSplashDir = path.join(__dirname, `../android/app/src/main/res/drawable-${density}`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(androidSplashDir)) {
      fs.mkdirSync(androidSplashDir, { recursive: true });
    }

    const outputPath = path.join(androidSplashDir, 'splash.png');

    // Calculate logo size (40% of the smaller dimension)
    const logoSize = Math.floor(Math.min(size.width, size.height) * 0.4);

    // Resize logo
    const resizedLogo = await sharp(logoBuffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Create splash screen with centered logo
    await sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 3,
        background: backgroundColor
      }
    })
      .composite([{
        input: resizedLogo,
        top: Math.floor((size.height - logoSize) / 2),
        left: Math.floor((size.width - logoSize) / 2)
      }])
      .png()
      .toFile(outputPath);

    console.log(`✓ Created ${density} Android splash (${size.width}x${size.height})`);
  }

  // Generate default Android splash
  const defaultAndroidSplashDir = path.join(__dirname, '../android/app/src/main/res/drawable');
  if (!fs.existsSync(defaultAndroidSplashDir)) {
    fs.mkdirSync(defaultAndroidSplashDir, { recursive: true });
  }

  const defaultOutputPath = path.join(defaultAndroidSplashDir, 'splash.png');
  const defaultSize = androidSizes['port-xhdpi'];
  const defaultLogoSize = Math.floor(Math.min(defaultSize.width, defaultSize.height) * 0.4);

  const defaultResizedLogo = await sharp(logoBuffer)
    .resize(defaultLogoSize, defaultLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: defaultSize.width,
      height: defaultSize.height,
      channels: 3,
      background: backgroundColor
    }
  })
    .composite([{
      input: defaultResizedLogo,
      top: Math.floor((defaultSize.height - defaultLogoSize) / 2),
      left: Math.floor((defaultSize.width - defaultLogoSize) / 2)
    }])
    .png()
    .toFile(defaultOutputPath);

  console.log(`✓ Created default Android splash (${defaultSize.width}x${defaultSize.height})`);

  // Generate iOS splash screen
  console.log('\nGenerating iOS splash screens...');
  const iosSplashDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/Splash.imageset');

  if (!fs.existsSync(iosSplashDir)) {
    fs.mkdirSync(iosSplashDir, { recursive: true });
  }

  // Calculate logo size (30% of canvas)
  const iosLogoSize = Math.floor(iosSplashSize.width * 0.3);

  // Resize logo for iOS
  const iosResizedLogo = await sharp(logoBuffer)
    .resize(iosLogoSize, iosLogoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Create splash screens for different scales
  const scales = [
    { filename: 'splash-2732x2732.png', size: 2732 },
    { filename: 'splash-2732x2732-1.png', size: 2732 },
    { filename: 'splash-2732x2732-2.png', size: 2732 }
  ];

  for (const scale of scales) {
    const outputPath = path.join(iosSplashDir, scale.filename);

    await sharp({
      create: {
        width: scale.size,
        height: scale.size,
        channels: 3,
        background: backgroundColor
      }
    })
      .composite([{
        input: iosResizedLogo,
        top: Math.floor((scale.size - iosLogoSize) / 2),
        left: Math.floor((scale.size - iosLogoSize) / 2)
      }])
      .png()
      .toFile(outputPath);

    console.log(`✓ Created iOS splash ${scale.filename} (${scale.size}x${scale.size})`);
  }

  console.log('\n✅ All splash screens generated successfully!');
}

generateSplashScreens().catch(err => {
  console.error('Error generating splash screens:', err);
  process.exit(1);
});
