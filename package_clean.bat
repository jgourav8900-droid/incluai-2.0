@echo off
REM ========================================================
REM   INCLUAI 2.0 - Clean Zip Packager for College Expo
REM   Excludes node_modules, .env (credentials), git, & logs
REM ========================================================

echo ========================================================
echo   Packaging INCLUAI 2.0 clean submission archive...
echo ========================================================

set ARCHIVE_NAME=INCLUAI_2.0_Clean_Expo_Submission.zip

if exist %ARCHIVE_NAME% (
    echo Removing previous package archive...
    del /f /q %ARCHIVE_NAME%
)

powershell -Command "Compress-Archive -Path '.\data', '.\knowledge', '.\public', '.\routes', '.\scripts', '.\services', '.\tests', '.\server.js', '.\package.json', '.\.env.example', '.\README.md', '.\INCLUAI_2.0_ARCHITECTURE_EXPLANATION.md', '.\dev.bat', '.\start.bat', '.\test.bat' -DestinationPath '%ARCHIVE_NAME%' -CompressionLevel Optimal"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] Clean package created: %ARCHIVE_NAME%
    echo   Notice: Excluded .env and node_modules for safety!
    echo ========================================================
) else (
    echo.
    echo [ERROR] Failed to package archive.
)
pause

