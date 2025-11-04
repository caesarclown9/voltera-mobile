# ========================================
# Voltera Android Keystore Generator
# ========================================
# Secure script for creating keystore
# Run in PowerShell
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Voltera Android Keystore Generator   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# 1. CHECK JAVA
# ========================================
Write-Host "[1/5] Checking Java installation..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version" | Select-Object -First 1
    Write-Host "  [OK] Java found: $javaVersion" -ForegroundColor Green
}
catch {
    Write-Host "  [ERROR] Java not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Java JDK 11+ or set JAVA_HOME" -ForegroundColor Yellow
    Write-Host "Download from: https://adoptium.net/" -ForegroundColor Cyan
    exit 1
}
Write-Host ""

# ========================================
# 2. FIND KEYTOOL
# ========================================
Write-Host "[2/5] Searching for keytool..." -ForegroundColor Yellow
$keytoolPath = $null

# Check standard locations
$possiblePaths = @(
    (Get-Command keytool -ErrorAction SilentlyContinue).Path,
    "$env:JAVA_HOME\bin\keytool.exe",
    "C:\Program Files\Java\jdk-11\bin\keytool.exe",
    "C:\Program Files\Java\jdk-17\bin\keytool.exe",
    "C:\Program Files\Java\jdk-21\bin\keytool.exe",
    "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
    "C:\Program Files\Android\Android Studio\jre\bin\keytool.exe"
)

foreach ($path in $possiblePaths) {
    if ($path -and (Test-Path $path)) {
        $keytoolPath = $path
        Write-Host "  [OK] Keytool found: $keytoolPath" -ForegroundColor Green
        break
    }
}

if (-not $keytoolPath) {
    Write-Host "  [ERROR] Keytool not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure Java JDK (not JRE) is installed" -ForegroundColor Yellow
    Write-Host "Run scripts/setup/find-keytool.ps1 to find it" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# ========================================
# 3. DETECT PROJECT PATHS
# ========================================
Write-Host "[3/5] Detecting project paths..." -ForegroundColor Yellow

# Get current script path
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
$androidAppPath = Join-Path $projectRoot "android\app"

Write-Host "  Project root: $projectRoot" -ForegroundColor Gray
Write-Host "  Android app:  $androidAppPath" -ForegroundColor Gray

if (-not (Test-Path $androidAppPath)) {
    Write-Host "  [ERROR] Android app directory not found!" -ForegroundColor Red
    Write-Host "  Expected: $androidAppPath" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Project paths detected" -ForegroundColor Green
Write-Host ""

# Change to android/app folder
Set-Location $androidAppPath

# ========================================
# 4. CHECK EXISTING KEYSTORE
# ========================================
Write-Host "[4/5] Checking for existing keystore..." -ForegroundColor Yellow

$keystoreName = "voltera-release.keystore"
$keystorePath = Join-Path $androidAppPath $keystoreName

if (Test-Path $keystorePath) {
    Write-Host "  [WARNING] Keystore already exists!" -ForegroundColor Yellow
    Write-Host "  Path: $keystorePath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  IMPORTANT: If you overwrite keystore, you CANNOT update app in Google Play!" -ForegroundColor Red
    Write-Host ""

    $overwrite = Read-Host "  Are you sure you want to overwrite keystore? (yes/no)"
    if ($overwrite -ne 'yes') {
        Write-Host ""
        Write-Host "Operation cancelled" -ForegroundColor Yellow
        Write-Host "Existing keystore preserved: $keystorePath" -ForegroundColor Green
        exit 0
    }

    Write-Host ""
    Write-Host "  Creating backup before overwrite..." -ForegroundColor Yellow
    $backupName = "voltera-release.keystore.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $keystorePath $backupName
    Write-Host "  [OK] Backup created: $backupName" -ForegroundColor Green
    Write-Host ""

    Remove-Item $keystorePath -Force
}
Write-Host ""

# ========================================
# 5. INTERACTIVE CONFIGURATION
# ========================================
Write-Host "[5/5] Keystore configuration" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please provide keystore information:" -ForegroundColor Cyan
Write-Host "(Press Enter to use default values)" -ForegroundColor Gray
Write-Host ""

# Alias (default: voltera)
$defaultAlias = "voltera"
$alias = Read-Host "Key alias [$defaultAlias]"
if ([string]::IsNullOrWhiteSpace($alias)) {
    $alias = $defaultAlias
}

# Organization info
$defaultOrg = "Voltera"
$organization = Read-Host "Organization name [$defaultOrg]"
if ([string]::IsNullOrWhiteSpace($organization)) {
    $organization = $defaultOrg
}

$defaultOrgUnit = "Mobile Development"
$orgUnit = Read-Host "Organization unit [$defaultOrgUnit]"
if ([string]::IsNullOrWhiteSpace($orgUnit)) {
    $orgUnit = $defaultOrgUnit
}

$defaultCity = "Bishkek"
$city = Read-Host "City [$defaultCity]"
if ([string]::IsNullOrWhiteSpace($city)) {
    $city = $defaultCity
}

$defaultState = "Chui"
$state = Read-Host "State/Province [$defaultState]"
if ([string]::IsNullOrWhiteSpace($state)) {
    $state = $defaultState
}

$defaultCountry = "KG"
$country = Read-Host "Country code (2 letters) [$defaultCountry]"
if ([string]::IsNullOrWhiteSpace($country)) {
    $country = $defaultCountry
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "PASSWORD SETUP (SECURE INPUT)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Save these passwords in a secure place!" -ForegroundColor Red
Write-Host "Without them you CANNOT update app in Google Play!" -ForegroundColor Red
Write-Host ""
Write-Host "Password requirements:" -ForegroundColor Cyan
Write-Host "  * Minimum 6 characters" -ForegroundColor Gray
Write-Host "  * Use combination of letters, numbers and symbols" -ForegroundColor Gray
Write-Host "  * Do not use simple passwords like '123456'" -ForegroundColor Gray
Write-Host ""

# Store password (secure input)
$storePassword = Read-Host "Keystore password (will be hidden)" -AsSecureString
$storePasswordConfirm = Read-Host "Confirm keystore password" -AsSecureString

# Convert SecureString to plain text for comparison
$storePassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePassword)
)
$storePassConfirmPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePasswordConfirm)
)

if ($storePassPlain -ne $storePassConfirmPlain) {
    Write-Host ""
    Write-Host "[ERROR] Passwords don't match!" -ForegroundColor Red
    exit 1
}

if ($storePassPlain.Length -lt 6) {
    Write-Host ""
    Write-Host "[ERROR] Password too short! Minimum 6 characters required." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Key password (can use the same)
$useSeparateKeyPass = Read-Host "Use separate key password? (y/n) [n]"
if ($useSeparateKeyPass -eq 'y' -or $useSeparateKeyPass -eq 'Y') {
    $keyPassword = Read-Host "Key password (will be hidden)" -AsSecureString
    $keyPasswordConfirm = Read-Host "Confirm key password" -AsSecureString

    $keyPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPassword)
    )
    $keyPassConfirmPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPasswordConfirm)
    )

    if ($keyPassPlain -ne $keyPassConfirmPlain) {
        Write-Host ""
        Write-Host "[ERROR] Key passwords don't match!" -ForegroundColor Red
        exit 1
    }
}
else {
    $keyPassPlain = $storePassPlain
}

Write-Host ""

# Validity
$defaultValidity = 10000
$validityInput = Read-Host "Validity in days [$defaultValidity]"
if ([string]::IsNullOrWhiteSpace($validityInput)) {
    $validity = $defaultValidity
}
else {
    $validity = [int]$validityInput
}

# Distinguished Name
$dname = "CN=$organization, OU=$orgUnit, O=$organization, L=$city, ST=$state, C=$country"

# ========================================
# CONFIRM PARAMETERS
# ========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Keystore Configuration Summary:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Keystore file: $keystoreName" -ForegroundColor White
Write-Host "Alias:         $alias" -ForegroundColor White
Write-Host "Organization:  $organization" -ForegroundColor White
Write-Host "Org Unit:      $orgUnit" -ForegroundColor White
Write-Host "Location:      $city, $state, $country" -ForegroundColor White
Write-Host "Validity:      $validity days (~$([math]::Round($validity/365, 1)) years)" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "Proceed with keystore generation? (yes/no)"
if ($confirm -ne 'yes') {
    Write-Host ""
    Write-Host "Operation cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# ========================================
# GENERATE KEYSTORE
# ========================================
Write-Host "Generating keystore..." -ForegroundColor Yellow
Write-Host ""

$keytoolArgs = @(
    "-genkeypair",
    "-v",
    "-keystore", $keystoreName,
    "-alias", $alias,
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", $validity,
    "-storepass", $storePassPlain,
    "-keypass", $keyPassPlain,
    "-dname", $dname
)

try {
    $output = & $keytoolPath $keytoolArgs 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Keystore created successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] Failed to create keystore" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "[ERROR] Failed to create keystore" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""

# ========================================
# GET SHA FINGERPRINTS
# ========================================
Write-Host "Retrieving certificate fingerprints..." -ForegroundColor Yellow
Write-Host ""

$fingerprintArgs = @(
    "-list",
    "-v",
    "-keystore", $keystoreName,
    "-alias", $alias,
    "-storepass", $storePassPlain
)

$fingerprintOutput = & $keytoolPath $fingerprintArgs 2>&1 | Out-String
$sha1 = ($fingerprintOutput | Select-String "SHA1:").ToString().Trim()
$sha256 = ($fingerprintOutput | Select-String "SHA256:").ToString().Trim()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Certificate Fingerprints" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host $sha1 -ForegroundColor Yellow
Write-Host $sha256 -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: You will need these fingerprints for:" -ForegroundColor Yellow
Write-Host "  * Google Play Console configuration" -ForegroundColor Gray
Write-Host "  * Firebase setup" -ForegroundColor Gray
Write-Host "  * OAuth providers" -ForegroundColor Gray
Write-Host ""

# ========================================
# CREATE SECURE BACKUP
# ========================================
Write-Host "Creating secure backup..." -ForegroundColor Yellow

$date = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = Join-Path $env:USERPROFILE "Documents\Voltera-Keystore-Backup"

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
}

# Copy keystore
$backupKeystorePath = Join-Path $backupDir "voltera-release-$date.keystore"
Copy-Item $keystorePath $backupKeystorePath

Write-Host "  [OK] Keystore backed up to:" -ForegroundColor Green
Write-Host "    $backupKeystorePath" -ForegroundColor Gray
Write-Host ""

# Save information (WITHOUT passwords!)
$infoContent = @"
========================================
VOLTERA ANDROID KEYSTORE INFORMATION
========================================
Generated:  $date
Keystore:   $keystoreName
Alias:      $alias
Validity:   $validity days (~$([math]::Round($validity/365, 1)) years)
Location:   $keystorePath

Organization:
  Name:     $organization
  Unit:     $orgUnit
  City:     $city
  State:    $state
  Country:  $country

Certificate Fingerprints:
$sha1
$sha256

========================================
CRITICAL SECURITY INFORMATION
========================================

1. NEVER commit keystore to Git (already in .gitignore)
2. Store passwords in secure password manager
3. Keep backup in safe location
4. Without this keystore, you CANNOT update the app in Google Play!

Environment Variables (for CI/CD):
-----------------------------------
KEYSTORE_FILE=voltera-release.keystore
KEYSTORE_PASSWORD=<your_keystore_password>
KEY_ALIAS=$alias
KEY_PASSWORD=<your_key_password>

Next Steps:
-----------
1. Save passwords to password manager (1Password, LastPass, etc.)
2. Set environment variables before building release
3. Build: cd android && .\gradlew assembleRelease
4. Verify APK signature: keytool -printcert -jarfile app-release.apk

========================================
"@

$infoPath = Join-Path $backupDir "keystore-info-$date.txt"
$infoContent | Out-File -FilePath $infoPath -Encoding UTF8

Write-Host "  [OK] Info saved to:" -ForegroundColor Green
Write-Host "    $infoPath" -ForegroundColor Gray
Write-Host ""

# ========================================
# USAGE INSTRUCTIONS
# ========================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCCESS! KEYSTORE CREATED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "  [OK] $keystorePath" -ForegroundColor Green
Write-Host "  [OK] $backupKeystorePath" -ForegroundColor Green
Write-Host "  [OK] $infoPath" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SAVE YOUR PASSWORDS SECURELY" -ForegroundColor White
Write-Host "   * Use password manager (1Password, LastPass, Bitwarden)" -ForegroundColor Gray
Write-Host "   * NEVER write them in files or emails" -ForegroundColor Gray
Write-Host "   * Store backup keystore in secure cloud storage" -ForegroundColor Gray
Write-Host ""
Write-Host "2. SET ENVIRONMENT VARIABLES (before building release):" -ForegroundColor White
Write-Host "   PowerShell:" -ForegroundColor Gray
Write-Host "   `$env:KEYSTORE_FILE = `"$keystoreName`"" -ForegroundColor DarkGray
Write-Host "   `$env:KEYSTORE_PASSWORD = `"your_password_here`"" -ForegroundColor DarkGray
Write-Host "   `$env:KEY_ALIAS = `"$alias`"" -ForegroundColor DarkGray
Write-Host "   `$env:KEY_PASSWORD = `"your_key_password_here`"" -ForegroundColor DarkGray
Write-Host ""
Write-Host "3. BUILD RELEASE APK:" -ForegroundColor White
Write-Host "   cd android" -ForegroundColor Gray
Write-Host "   .\gradlew assembleRelease" -ForegroundColor Gray
Write-Host ""
Write-Host "4. VERIFY APK SIGNATURE:" -ForegroundColor White
Write-Host "   keytool -printcert -jarfile android\app\build\outputs\apk\release\app-release.apk" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Clear password variables from memory
Remove-Variable storePassPlain -ErrorAction SilentlyContinue
Remove-Variable storePassConfirmPlain -ErrorAction SilentlyContinue
Remove-Variable keyPassPlain -ErrorAction SilentlyContinue
Remove-Variable keyPassConfirmPlain -ErrorAction SilentlyContinue

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
