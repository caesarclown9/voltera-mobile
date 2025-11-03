# Voltera Android Keystore Generator Script
# Запускать в PowerShell от имени администратора

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Voltera Android Keystore Generator " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Проверка Java
Write-Host "Checking Java installation..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✓ Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Java not found in PATH" -ForegroundColor Red
    Write-Host "Please install Java JDK or set JAVA_HOME" -ForegroundColor Red
    exit 1
}

# Поиск keytool
Write-Host "`nSearching for keytool..." -ForegroundColor Yellow
$keytoolPath = $null

# Проверяем стандартные места
$possiblePaths = @(
    (Get-Command keytool -ErrorAction SilentlyContinue).Path,
    "$env:JAVA_HOME\bin\keytool.exe",
    "C:\Program Files\Java\jdk-11\bin\keytool.exe",
    "C:\Program Files\Java\jdk-17\bin\keytool.exe",
    "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
    "C:\Program Files\Android\Android Studio\jre\bin\keytool.exe"
)

foreach ($path in $possiblePaths) {
    if ($path -and (Test-Path $path)) {
        $keytoolPath = $path
        Write-Host "✓ Keytool found: $keytoolPath" -ForegroundColor Green
        break
    }
}

if (-not $keytoolPath) {
    Write-Host "✗ Keytool not found" -ForegroundColor Red
    Write-Host "Please ensure Java JDK is installed" -ForegroundColor Red
    exit 1
}

# Переходим в папку android/app
$projectPath = "D:\Projects\Evpower-mobile\android\app"
Write-Host "`nChanging directory to: $projectPath" -ForegroundColor Yellow

if (Test-Path $projectPath) {
    Set-Location $projectPath
    Write-Host "✓ Directory changed" -ForegroundColor Green
} else {
    Write-Host "✗ Project directory not found" -ForegroundColor Red
    exit 1
}

# Проверяем существование keystore
if (Test-Path "evpower-release.keystore") {
    Write-Host "`n⚠ Keystore already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Overwrite existing keystore? (y/n)"
    if ($overwrite -ne 'y') {
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        exit 0
    }
    Remove-Item "evpower-release.keystore" -Force
}

# Параметры keystore
$keystoreName = "evpower-release.keystore"
$alias = "evpower"
$storePass = "Voltera2024Secure!"
$keyPass = "Voltera2024Secure!"
$validity = 10000
$dname = "CN=Voltera, OU=Mobile Development, O=Voltera, L=Bishkek, ST=Chui, C=KG"

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Creating keystore with parameters:" -ForegroundColor Cyan
Write-Host "Keystore: $keystoreName" -ForegroundColor White
Write-Host "Alias: $alias" -ForegroundColor White
Write-Host "Validity: $validity days" -ForegroundColor White
Write-Host "Organization: Voltera" -ForegroundColor White
Write-Host "Location: Bishkek, Kyrgyzstan" -ForegroundColor White
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Генерация keystore
Write-Host "Generating keystore..." -ForegroundColor Yellow
$keytoolArgs = @(
    "-genkeypair",
    "-v",
    "-keystore", $keystoreName,
    "-alias", $alias,
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", $validity,
    "-storepass", $storePass,
    "-keypass", $keyPass,
    "-dname", $dname
)

try {
    & $keytoolPath $keytoolArgs
    Write-Host "`n✓ Keystore created successfully!" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to create keystore" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Создание keystore.properties
Write-Host "`nCreating keystore.properties..." -ForegroundColor Yellow
$propertiesPath = "D:\Projects\Evpower-mobile\android\keystore.properties"
$propertiesContent = @"
storePassword=$storePass
keyPassword=$keyPass
keyAlias=$alias
storeFile=$keystoreName
"@

$propertiesContent | Out-File -FilePath $propertiesPath -Encoding UTF8
Write-Host "✓ keystore.properties created" -ForegroundColor Green

# Получение SHA fingerprints
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Certificate Fingerprints (for Google Play):" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$fingerprintArgs = @(
    "-list",
    "-v",
    "-keystore", $keystoreName,
    "-alias", $alias,
    "-storepass", $storePass
)

$output = & $keytoolPath $fingerprintArgs | Out-String
$sha1 = ($output | Select-String "SHA1:").ToString().Trim()
$sha256 = ($output | Select-String "SHA256:").ToString().Trim()

Write-Host $sha1 -ForegroundColor Yellow
Write-Host $sha256 -ForegroundColor Yellow

# Создание backup
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Creating secure backup..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

$date = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = "$env:USERPROFILE\Documents\Voltera-Keystore-Backup"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
}

# Копируем keystore
Copy-Item $keystoreName "$backupDir\evpower-release-$date.keystore"

# Сохраняем информацию
$infoContent = @"
EVPOWER ANDROID KEYSTORE INFORMATION
=====================================
Generated: $date
Keystore: $keystoreName
Alias: $alias
Store Password: $storePass
Key Password: $keyPass
Validity: $validity days

$sha1
$sha256

⚠️ CRITICAL: Keep this file secure!
Without this keystore, you cannot update the app in Google Play Store!
"@

$infoContent | Out-File -FilePath "$backupDir\keystore-info-$date.txt" -Encoding UTF8

Write-Host "✓ Backup created at: $backupDir" -ForegroundColor Green

# Финальные инструкции
Write-Host "`n======================================" -ForegroundColor Green
Write-Host "✅ KEYSTORE CREATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Keep the keystore file secure (backup created)" -ForegroundColor White
Write-Host "2. Never commit keystore to Git" -ForegroundColor White
Write-Host "3. Use SHA fingerprints in Google Play Console" -ForegroundColor White
Write-Host "4. Build release APK: .\gradlew.bat assembleRelease" -ForegroundColor White
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "✓ $projectPath\$keystoreName" -ForegroundColor Green
Write-Host "✓ $propertiesPath" -ForegroundColor Green
Write-Host "✓ $backupDir\evpower-release-$date.keystore" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")