@echo off
REM TruffleHog Security Scan Script for Windows
REM This script handles the BASE/HEAD issue by scanning the entire repository

echo 🔍 Starting TruffleHog Security Scan...

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Not in a git repository
    exit /b 1
)

REM Get current commit
for /f %%i in ('git rev-parse HEAD') do set CURRENT_COMMIT=%%i
echo 📍 Current commit: %CURRENT_COMMIT%

REM Check if we should scan diff or entire repo
if "%1"=="--diff" (
    echo 🔍 Scanning changes in the last commit...

    REM Get previous commit
    for /f %%i in ('git rev-parse HEAD~1 2^>nul') do set PREVIOUS_COMMIT=%%i

    if "%PREVIOUS_COMMIT%"=="" (
        echo ⚠️  No previous commit found, scanning entire repository
        set SCAN_MODE=filesystem /tmp
    ) else (
        echo 📍 Previous commit: %PREVIOUS_COMMIT%
        if "%CURRENT_COMMIT%"=="%PREVIOUS_COMMIT%" (
            echo ⚠️  Current and previous commits are the same, scanning entire repository
            set SCAN_MODE=filesystem /tmp
        ) else (
            echo ✅ Scanning changes between commits
            set SCAN_MODE=git file:///%CD% --since-commit %PREVIOUS_COMMIT% --branch %CURRENT_COMMIT%
        )
    )
) else (
    echo 🔍 Scanning entire repository
    set SCAN_MODE=filesystem /tmp
)

REM Run TruffleHog
echo 🚀 Running TruffleHog...
docker run --rm -v "%CD%:/tmp" -w /tmp ghcr.io/trufflesecurity/trufflehog:latest %SCAN_MODE% --debug --only-verified --fail

if errorlevel 1 (
    echo ❌ TruffleHog found security issues
    exit /b 1
) else (
    echo ✅ TruffleHog scan completed successfully!
)
