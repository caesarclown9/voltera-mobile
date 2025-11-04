/**
 * Простой скрипт для создания временных иконок Voltera
 * Использует Canvas API через puppeteer или просто копирует файлы
 */

const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svgPath = path.join(__dirname, "../public/icons/voltera-logo-square.svg");
const svgContent = fs.readFileSync(svgPath, "utf8");

console.log("🎨 Создание иконок Voltera...\n");

// Для каждого размера создаем HTML файл который будет содержать SVG
// Этот подход работает, но для production лучше использовать proper конвертер

sizes.forEach((size) => {
  const htmlPath = path.join(
    __dirname,
    `../public/icons/icon-${size}x${size}.html`,
  );

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; width: ${size}px; height: ${size}px; }
    svg { width: 100%; height: 100%; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

  fs.writeFileSync(htmlPath, html);
  console.log(`✓ Created HTML template for ${size}x${size}`);
});

console.log(
  "\n⚠️  ВАЖНО: Для создания PNG иконок используйте один из методов:",
);
console.log("1. Откройте HTML файлы в браузере и сделайте screenshot");
console.log(
  "2. Используйте онлайн конвертер: https://cloudconvert.com/svg-to-png",
);
console.log("3. Используйте Android Studio Image Asset Tool");
console.log("4. Используйте Xcode для iOS иконок\n");

console.log("📖 Подробные инструкции: ICONS_UPDATE_GUIDE.md\n");
