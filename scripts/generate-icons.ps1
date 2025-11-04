# PowerShell script to generate all app icons from PNG
# Uses .NET System.Drawing for image resizing

param(
    [string]$SourceImage = "temp logos\VOLTERA.KG.png"
)

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot $SourceImage
$backgroundColor = [System.Drawing.Color]::FromArgb(255, 59, 130, 246) # #3B82F6

Write-Host "🎨 Generating Voltera app icons..." -ForegroundColor Cyan
Write-Host ""

# Check if source exists
if (-not (Test-Path $sourcePath)) {
    Write-Host "❌ Source image not found: $sourcePath" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Source image found: $sourcePath" -ForegroundColor Green

# Load source image
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-ImageWithBackground {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [System.Drawing.Color]$BgColor
    )

    $bitmap = New-Object System.Drawing.Bitmap($Width, $Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    # Set high quality rendering
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Fill background
    $graphics.Clear($BgColor)

    # Calculate dimensions to fit image with padding
    $padding = 0.1
    $availableWidth = $Width * (1 - 2 * $padding)
    $availableHeight = $Height * (1 - 2 * $padding)

    $scaleWidth = $availableWidth / $Image.Width
    $scaleHeight = $availableHeight / $Image.Height
    $scale = [Math]::Min($scaleWidth, $scaleHeight)

    $newWidth = [int]($Image.Width * $scale)
    $newHeight = [int]($Image.Height * $scale)

    $x = [int](($Width - $newWidth) / 2)
    $y = [int](($Height - $newHeight) / 2)

    # Draw image centered
    $graphics.DrawImage($Image, $x, $y, $newWidth, $newHeight)

    $graphics.Dispose()
    return $bitmap
}

# Android icons
Write-Host ""
Write-Host "📱 Generating Android icons..." -ForegroundColor Yellow

$androidSizes = @(
    @{Density="mipmap-mdpi"; Size=48},
    @{Density="mipmap-hdpi"; Size=72},
    @{Density="mipmap-xhdpi"; Size=96},
    @{Density="mipmap-xxhdpi"; Size=144},
    @{Density="mipmap-xxxhdpi"; Size=192}
)

foreach ($item in $androidSizes) {
    $densityPath = Join-Path $projectRoot "android\app\src\main\res\$($item.Density)"

    if (-not (Test-Path $densityPath)) {
        New-Item -ItemType Directory -Path $densityPath -Force | Out-Null
    }

    $size = $item.Size

    # ic_launcher.png
    $resized = Resize-ImageWithBackground -Image $sourceImage -Width $size -Height $size -BgColor $backgroundColor
    $resized.Save((Join-Path $densityPath "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()

    # ic_launcher_round.png
    $resized = Resize-ImageWithBackground -Image $sourceImage -Width $size -Height $size -BgColor $backgroundColor
    $resized.Save((Join-Path $densityPath "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()

    # ic_launcher_foreground.png (transparent background)
    $resized = Resize-ImageWithBackground -Image $sourceImage -Width $size -Height $size -BgColor ([System.Drawing.Color]::Transparent)
    $resized.Save((Join-Path $densityPath "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()

    Write-Host "  ✓ $($item.Density) ($size x $size)" -ForegroundColor Green
}

# iOS icons
Write-Host ""
Write-Host "🍎 Generating iOS icons..." -ForegroundColor Yellow

$iosIconPath = Join-Path $projectRoot "ios\App\App\Assets.xcassets\AppIcon.appiconset"

if (-not (Test-Path $iosIconPath)) {
    New-Item -ItemType Directory -Path $iosIconPath -Force | Out-Null
}

$iosSizes = @(
    @{Name="AppIcon-20x20@2x.png"; Size=40},
    @{Name="AppIcon-20x20@3x.png"; Size=60},
    @{Name="AppIcon-29x29@2x.png"; Size=58},
    @{Name="AppIcon-29x29@3x.png"; Size=87},
    @{Name="AppIcon-40x40@2x.png"; Size=80},
    @{Name="AppIcon-40x40@3x.png"; Size=120},
    @{Name="AppIcon-60x60@2x.png"; Size=120},
    @{Name="AppIcon-60x60@3x.png"; Size=180},
    @{Name="AppIcon-76x76@1x.png"; Size=76},
    @{Name="AppIcon-76x76@2x.png"; Size=152},
    @{Name="AppIcon-83.5x83.5@2x.png"; Size=167},
    @{Name="AppIcon-1024x1024@1x.png"; Size=1024}
)

foreach ($item in $iosSizes) {
    $resized = Resize-ImageWithBackground -Image $sourceImage -Width $item.Size -Height $item.Size -BgColor $backgroundColor
    $resized.Save((Join-Path $iosIconPath $item.Name), [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()

    Write-Host "  ✓ $($item.Name) ($($item.Size) x $($item.Size))" -ForegroundColor Green
}

# PWA icons
Write-Host ""
Write-Host "🌐 Generating PWA icons..." -ForegroundColor Yellow

$pwaIconPath = Join-Path $projectRoot "public\icons"

if (-not (Test-Path $pwaIconPath)) {
    New-Item -ItemType Directory -Path $pwaIconPath -Force | Out-Null
}

$pwaSizes = @(72, 96, 128, 144, 152, 192, 384, 512)

foreach ($size in $pwaSizes) {
    $resized = Resize-ImageWithBackground -Image $sourceImage -Width $size -Height $size -BgColor $backgroundColor
    $resized.Save((Join-Path $pwaIconPath "icon-${size}x${size}.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()

    Write-Host "  ✓ icon-${size}x${size}.png" -ForegroundColor Green
}

# Cleanup
$sourceImage.Dispose()

Write-Host ""
Write-Host "✅ All icons generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npx cap sync"
Write-Host "2. Rebuild the app"
Write-Host "3. Test on Android/iOS devices"
Write-Host ""
