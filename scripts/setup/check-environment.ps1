# ========================================
# Check environment for Android APK build
# ========================================
# Автоматически определяет пути к проекту
# ========================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ENVIRONMENT CHECK FOR ANDROID APK BUILD" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allGood = $true

# Определяем пути к проекту автоматически
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
$androidPath = Join-Path $projectRoot "android"
$gradlewPath = Join-Path $androidPath "gradlew.bat"
$environmentCheckFile = Join-Path $projectRoot "environment-check.txt"

Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host ""

# ========================================
# 1. NODE.JS AND NPM
# ========================================
Write-Host "[1/7] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js NOT INSTALLED!" -ForegroundColor Red
    Write-Host "    Download: https://nodejs.org/" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host "`n[2/7] Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  [OK] npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] npm NOT INSTALLED!" -ForegroundColor Red
    $allGood = $false
}

# ========================================
# 2. JAVA JDK
# ========================================
Write-Host "`n[3/7] Checking Java JDK..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version" | Select-Object -First 1
    Write-Host "  [OK] Java: $javaVersion" -ForegroundColor Green

    # Check JAVA_HOME
    if ($env:JAVA_HOME) {
        Write-Host "  [OK] JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] JAVA_HOME not set (may not be critical)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Java JDK NOT INSTALLED!" -ForegroundColor Red
    Write-Host "    Android Studio usually comes with Java, checking..." -ForegroundColor Yellow

    # Check Java from Android Studio
    $asJava = "C:\Program Files\Android\Android Studio\jbr\bin\java.exe"
    if (Test-Path $asJava) {
        Write-Host "  [OK] Found Java from Android Studio: $asJava" -ForegroundColor Green
        Write-Host "    Add to PATH to use it" -ForegroundColor Yellow
        Write-Host "    Run: `$env:Path += ';C:\Program Files\Android\Android Studio\jbr\bin'" -ForegroundColor Gray
    } else {
        Write-Host "  [ERROR] Java not found even in Android Studio" -ForegroundColor Red
        Write-Host "    Download JDK: https://adoptium.net/" -ForegroundColor Yellow
        $allGood = $false
    }
}

# ========================================
# 3. ANDROID STUDIO
# ========================================
Write-Host "`n[4/7] Checking Android Studio..." -ForegroundColor Yellow
$androidStudioPath = "C:\Program Files\Android\Android Studio"
if (Test-Path $androidStudioPath) {
    Write-Host "  [OK] Android Studio installed: $androidStudioPath" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Android Studio NOT FOUND!" -ForegroundColor Red
    Write-Host "    Download: https://developer.android.com/studio" -ForegroundColor Yellow
    $allGood = $false
}

# ========================================
# 4. ANDROID SDK
# ========================================
Write-Host "`n[5/7] Checking Android SDK..." -ForegroundColor Yellow

# Try to find SDK in different locations
$sdkPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:USERPROFILE\AppData\Local\Android\Sdk",
    "C:\Android\Sdk",
    "$env:ANDROID_HOME"
)

$sdkFound = $false
foreach ($path in $sdkPaths) {
    if ($path -and (Test-Path $path)) {
        Write-Host "  [OK] Android SDK found: $path" -ForegroundColor Green
        $sdkFound = $true

        # Check ANDROID_HOME
        if ($env:ANDROID_HOME) {
            Write-Host "  [OK] ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] ANDROID_HOME not set" -ForegroundColor Yellow
            Write-Host "    Recommended to add: ANDROID_HOME=$path" -ForegroundColor Yellow
        }
        break
    }
}

if (-not $sdkFound) {
    Write-Host "  [ERROR] Android SDK NOT FOUND!" -ForegroundColor Red
    Write-Host "    Install via Android Studio: Tools -> SDK Manager" -ForegroundColor Yellow
    $allGood = $false
}

# ========================================
# 5. GRADLE
# ========================================
Write-Host "`n[6/7] Checking Gradle..." -ForegroundColor Yellow

# Check Gradle wrapper in project
if (Test-Path $gradlewPath) {
    Write-Host "  [OK] Gradle wrapper found in project" -ForegroundColor Green
    Write-Host "    Path: $gradlewPath" -ForegroundColor Gray

    # Try to get Gradle version
    try {
        Push-Location $androidPath
        $gradleVersion = .\gradlew.bat --version 2>&1 | Select-String "Gradle" | Select-Object -First 1
        if ($gradleVersion) {
            Write-Host "  [OK] $gradleVersion" -ForegroundColor Green
        }
        Pop-Location
    } catch {
        Write-Host "  [WARN] Could not check Gradle version (may need first download)" -ForegroundColor Yellow
        Pop-Location
    }
} else {
    Write-Host "  [ERROR] Gradle wrapper NOT FOUND in project!" -ForegroundColor Red
    Write-Host "    Expected: $gradlewPath" -ForegroundColor Red
    $allGood = $false
}

# Check system Gradle (optional)
try {
    $systemGradle = gradle --version 2>&1 | Select-String "Gradle" | Select-Object -First 1
    Write-Host "  [OK] System Gradle: $systemGradle" -ForegroundColor Green
} catch {
    Write-Host "  [INFO] System Gradle not installed (not critical, using wrapper)" -ForegroundColor Gray
}

# ========================================
# 6. ADB (Android Debug Bridge)
# ========================================
Write-Host "`n[7/7] Checking ADB (for APK installation)..." -ForegroundColor Yellow
try {
    $adbVersion = adb version 2>&1 | Select-String "Version" | Select-Object -First 1
    Write-Host "  [OK] ADB: $adbVersion" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] ADB not found in PATH" -ForegroundColor Yellow
    Write-Host "    ADB usually in: %LOCALAPPDATA%\Android\Sdk\platform-tools" -ForegroundColor Gray
    Write-Host "    You can install APK manually (via file)" -ForegroundColor Gray
}

# ========================================
# SUMMARY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "[SUCCESS] READY TO BUILD APK!" -ForegroundColor Green
    Write-Host "`nYou can start building:" -ForegroundColor White
    Write-Host "  1. npm install" -ForegroundColor Gray
    Write-Host "  2. npm run build" -ForegroundColor Gray
    Write-Host "  3. npx cap sync android" -ForegroundColor Gray
    Write-Host "  4. cd android && .\gradlew.bat assembleDebug" -ForegroundColor Gray
} else {
    Write-Host "[WARN] SOME COMPONENTS NEED TO BE INSTALLED" -ForegroundColor Yellow
    Write-Host "`nSee above for what needs to be installed (marked [ERROR])" -ForegroundColor White
}
Write-Host "========================================`n" -ForegroundColor Cyan

# Save environment info
Write-Host "Saving environment info to environment-check.txt..." -ForegroundColor Gray

$nodeVer = try { node --version } catch { "Not installed" }
$npmVer = try { npm --version } catch { "Not installed" }
$javaVer = try { java -version 2>&1 | Select-String "version" | Select-Object -First 1 } catch { "Not installed" }

@"
========================================
ENVIRONMENT CHECK - $(Get-Date)
========================================
Project: Voltera Mobile
Root:    $projectRoot

Node.js: $nodeVer
npm: v$npmVer
Java: $javaVer
JAVA_HOME: $env:JAVA_HOME
ANDROID_HOME: $env:ANDROID_HOME
Gradle wrapper: $(if (Test-Path $gradlewPath) { "Found" } else { "Not found" })

========================================
"@ | Out-File -FilePath $environmentCheckFile -Encoding UTF8

Write-Host "[OK] Info saved to environment-check.txt`n" -ForegroundColor Green
