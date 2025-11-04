const sharp = require('sharp');
const path = require('path');

const svgPath = path.join(__dirname, '../public/icons/voltera-logo-square.svg');
const outputPath = path.join(__dirname, '../public/icons/voltera-logo-square.png');

async function convertSvgToPng() {
  try {
    console.log('Converting Voltera logo SVG to PNG...');

    // Конвертируем SVG в PNG высокого разрешения (2048x2048)
    await sharp(svgPath)
      .resize(2048, 2048, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath);

    console.log('✓ Successfully converted voltera-logo-square.svg to PNG (2048x2048)');
    console.log(`  Output: ${outputPath}`);
  } catch (error) {
    console.error('✗ Error converting SVG to PNG:', error);
    process.exit(1);
  }
}

convertSvgToPng();
