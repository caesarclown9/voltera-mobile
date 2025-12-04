#!/usr/bin/env node
/*
 * Generates Google Play feature graphic (default 1024x500) with brand gradient
 * and centered horizontal logo from public/icons/voltera-logo-horizontal.svg
 *
 * Usage (PowerShell):
 *   node scripts/generate-feature-graphic.cjs --out docs/store-listing/feature-graphic.png
 *
 * Optional flags:
 *   --width 1024 --height 500 --bgStart #3B82F6 --bgEnd #8B5CF6 --logoScale 0.7
 */

const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

function getArg(name, fallback) {
  const i = process.argv.findIndex((a) => a === `--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const width = parseInt(getArg('width', '1024'), 10);
  const height = parseInt(getArg('height', '500'), 10);
  const bgStart = getArg('bgStart', '#3B82F6');
  const bgEnd = getArg('bgEnd', '#8B5CF6');
  const logoScale = Math.max(0.1, Math.min(0.95, parseFloat(getArg('logoScale', '0.7'))));
  const outPath = getArg('out', path.join('docs', 'store-listing', 'feature-graphic.png'));

  const logoPath = path.join('public', 'icons', 'voltera-logo-horizontal.svg');

  // Background as SVG gradient for crisp rendering
  const bgSvg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bgStart}" />
          <stop offset="100%" stop-color="${bgEnd}" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)" />
    </svg>`
  );

  const base = sharp(bgSvg).png();

  // Prepare logo
  const targetLogoWidth = Math.round(width * logoScale);
  const logoBuf = await sharp(logoPath)
    .resize({ width: targetLogoWidth, withoutEnlargement: true })
    .toBuffer();

  // Composite
  const outputDir = path.dirname(outPath);
  await ensureDir(outputDir);

  await base
    .composite([
      { input: logoBuf, gravity: 'center' },
    ])
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(outPath);

  // Also export JPEG (optional convenience)
  const outJpg = outPath.replace(/\.png$/i, '.jpg');
  await sharp(outPath).jpeg({ quality: 92, mozjpeg: true }).toFile(outJpg);

  // eslint-disable-next-line no-console
  console.log(`Feature graphic generated:\n - PNG: ${outPath}\n - JPG: ${outJpg}\nSize: ${width}x${height}, logoScale=${logoScale}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to generate feature graphic:', err);
  process.exit(1);
});



