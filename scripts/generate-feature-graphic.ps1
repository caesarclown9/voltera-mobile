# Requires: Node.js + sharp (optional install step below)

param(
    [string]$Out = "docs/store-listing/feature-graphic.png",
    [int]$Width = 1024,
    [int]$Height = 500,
    [string]$BgStart = "#3B82F6",
    [string]$BgEnd = "#8B5CF6",
    [double]$LogoScale = 0.7
)

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js не найден. Установите Node и запустите снова."; exit 1
}

# Ensure sharp is installed (optional dependency)
if (-not (Test-Path "node_modules/sharp")) {
  Write-Host "Устанавливаю sharp (optional)..."
  npm install --include=optional sharp --no-fund --no-audit | Out-Null
}

node .\scripts\generate-feature-graphic.cjs --out $Out --width $Width --height $Height --bgStart $BgStart --bgEnd $BgEnd --logoScale $LogoScale



