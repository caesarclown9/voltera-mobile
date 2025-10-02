# Скрипт для поиска keytool в системе

Write-Host "Searching for keytool..." -ForegroundColor Yellow
Write-Host ""

# Проверяем Java установку
Write-Host "Java version:" -ForegroundColor Cyan
java -version 2>&1 | Select-String "version"
Write-Host ""

# Ищем Java в Program Files
Write-Host "Searching in Program Files..." -ForegroundColor Yellow
$javaFolders = @()

# Проверяем оба Program Files
$programPaths = @(
    "C:\Program Files\Java",
    "C:\Program Files (x86)\Java",
    "C:\Program Files\Android\Android Studio\jbr",
    "C:\Program Files\Android\Android Studio\jre"
)

foreach ($path in $programPaths) {
    if (Test-Path $path) {
        Write-Host "Found: $path" -ForegroundColor Green
        $folders = Get-ChildItem -Path $path -Directory -ErrorAction SilentlyContinue
        foreach ($folder in $folders) {
            $keytoolPath = Join-Path $folder.FullName "bin\keytool.exe"
            if (Test-Path $keytoolPath) {
                Write-Host "✓ KEYTOOL FOUND: $keytoolPath" -ForegroundColor Green -BackgroundColor DarkGreen
                $javaFolders += $keytoolPath
            }
        }
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "RESULTS:" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

if ($javaFolders.Count -gt 0) {
    Write-Host "Found keytool in these locations:" -ForegroundColor Green
    foreach ($tool in $javaFolders) {
        Write-Host $tool -ForegroundColor Yellow

        # Проверяем версию
        Write-Host "  Version info:" -ForegroundColor Gray
        & "$tool" -version 2>&1 | Out-String | Write-Host -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Recommended keytool path (copy this):" -ForegroundColor Green -BackgroundColor DarkGreen
    $recommended = $javaFolders[0]
    Write-Host $recommended -ForegroundColor Yellow

    Write-Host ""
    Write-Host "To use it, run (with quotes because of spaces):" -ForegroundColor Cyan
    Write-Host "& `"$recommended`" -version" -ForegroundColor White

} else {
    Write-Host "Keytool not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check if Java JDK (not just JRE) is installed" -ForegroundColor Yellow
    Write-Host "You can download it from:" -ForegroundColor Yellow
    Write-Host "https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Cyan
}