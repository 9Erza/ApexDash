@echo off
setlocal

set PLUGIN_NAME=com.nineerza.apexdash.sdPlugin
set DEST=%APPDATA%\HotSpot\StreamDock\plugins\%PLUGIN_NAME%

cls
echo ApexDash by 9Erza - Uninstaller
echo ==================================
echo.

echo Please close Stream Dock before continuing.
pause

taskkill /IM node20.exe /F >nul 2>&1

if exist "%DEST%" (
    rmdir /S /Q "%DEST%"
    echo ApexDash removed.
) else (
    echo ApexDash was not found in Stream Dock plugins folder.
)

echo.
pause
endlocal
