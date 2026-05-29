@echo off
setlocal

set PLUGIN_NAME=com.nineerza.apexdash.sdPlugin
set OLD_PLUGIN_NAME=com.erza.forzadash.sdPlugin
set SRC=%~dp0%PLUGIN_NAME%
set PLUGINS_DIR=%APPDATA%\HotSpot\StreamDock\plugins
set DISABLED_DIR=%APPDATA%\HotSpot\StreamDock\plugins_disabled
set DEST=%PLUGINS_DIR%\%PLUGIN_NAME%
set BACKUP=%DISABLED_DIR%\%PLUGIN_NAME%_backup
set OLD_DEST=%PLUGINS_DIR%\%OLD_PLUGIN_NAME%

cls
echo ApexDash by 9Erza - Installer
echo ================================
echo.

if not exist "%SRC%" (
    echo ERROR: Could not find source folder:
    echo %SRC%
    echo.
    echo Make sure this BAT file is in the same folder as %PLUGIN_NAME%.
    pause
    exit /b 1
)

echo Please close Stream Dock before continuing.
echo This installer will stop Stream Dock node plugin processes if needed.
echo.
pause

mkdir "%PLUGINS_DIR%" >nul 2>&1
mkdir "%DISABLED_DIR%" >nul 2>&1

echo Stopping old Stream Dock Node plugin processes...
taskkill /IM node20.exe /F >nul 2>&1

echo Disabling old ERZA Forza Dash plugin if present...
if exist "%OLD_DEST%" (
    rmdir /S /Q "%DISABLED_DIR%\%OLD_PLUGIN_NAME%" >nul 2>&1
    move "%OLD_DEST%" "%DISABLED_DIR%\" >nul
)

echo Backing up existing ApexDash if present...
if exist "%DEST%" (
    rmdir /S /Q "%BACKUP%" >nul 2>&1
    move "%DEST%" "%BACKUP%" >nul
)

echo Installing ApexDash...
xcopy "%SRC%" "%DEST%\" /E /I /Y >nul

if errorlevel 1 (
    echo.
    echo ERROR: Installation failed.
    pause
    exit /b 1
)

echo.
echo ApexDash installed successfully.
echo.
echo Start Stream Dock again and look for category: ApexDash
echo.
echo Forza settings:
echo   Data Out: On
echo   Data Out IP: 127.0.0.1
echo   Data Out Port: 23666
echo.
echo Debug URL after Stream Dock starts:
echo   http://127.0.0.1:28766/state
echo.
pause
endlocal
