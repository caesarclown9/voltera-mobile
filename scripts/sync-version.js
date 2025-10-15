#!/usr/bin/env node
/**
 * Синхронизация версии между package.json и versionManager.ts
 *
 * Использование:
 * npm run sync-version
 * или
 * node scripts/sync-version.js
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Читаем версию из package.json
const packageJsonPath = join(rootDir, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

console.log(`📦 Package version: ${version}`);

// Обновляем versionManager.ts
const versionManagerPath = join(rootDir, "src/lib/versionManager.ts");
let versionManagerContent = readFileSync(versionManagerPath, "utf-8");

// Находим и заменяем APP_VERSION
versionManagerContent = versionManagerContent.replace(
  /export const APP_VERSION = ['"][\d.]+['"]/,
  `export const APP_VERSION = '${version}'`,
);

// Находим текущий BUILD и увеличиваем на 1
const buildMatch = versionManagerContent.match(
  /export const APP_BUILD = (\d+)/,
);
if (buildMatch) {
  const currentBuild = parseInt(buildMatch[1]);
  const newBuild = currentBuild + 1;

  versionManagerContent = versionManagerContent.replace(
    /export const APP_BUILD = \d+/,
    `export const APP_BUILD = ${newBuild}`,
  );

  console.log(`🔨 Build number: ${currentBuild} → ${newBuild}`);

  // Обновляем build.gradle
  const gradlePath = join(rootDir, "android/app/build.gradle");
  try {
    let gradleContent = readFileSync(gradlePath, "utf-8");
    gradleContent = gradleContent.replace(
      /versionCode \d+/,
      `versionCode ${newBuild}`,
    );
    gradleContent = gradleContent.replace(
      /versionName ["'][\d.]+["']/,
      `versionName "${version}"`,
    );
    writeFileSync(gradlePath, gradleContent, "utf-8");
    console.log(`🤖 Android build.gradle updated`);
  } catch (error) {
    console.warn(`⚠️  Could not update build.gradle: ${error.message}`);
  }
}

// Сохраняем изменения
writeFileSync(versionManagerPath, versionManagerContent, "utf-8");

console.log(`✅ Version synced: ${version}`);
console.log(`📝 Updated files:`);
console.log(`   - src/lib/versionManager.ts`);
console.log(`   - android/app/build.gradle`);
