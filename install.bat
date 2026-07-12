@echo off
setlocal EnableDelayedExpansion

:: ========================================
:: INSTALL.BAT
:: Automated Installer for PHP Project
:: ========================================

:: Set variables
set "SOURCE_DIR=%~dp0"
:: Remove trailing backslash from SOURCE_DIR
if "%SOURCE_DIR:~-1%"=="\" set "SOURCE_DIR=%SOURCE_DIR:~0,-1%"

set "DEST_DIR=C:\xampp\htdocs\data"
set "PHP_EXE=C:\xampp\php\php.exe"
set "PROJECT_URL=http://localhost/data"

echo ========================================
echo Starting Installation...
echo ========================================
echo.

:: 3. Verify XAMPP is installed
if not exist "%PHP_EXE%" (
    echo [ERROR] XAMPP PHP executable not found at "%PHP_EXE%".
    echo Please make sure XAMPP is installed in C:\xampp before continuing.
    echo Installation aborted.
    pause
    exit /b 1
)
echo [OK] XAMPP PHP found.

:: 6. Prevent copying if the installer is already in the destination folder
if /I "%SOURCE_DIR%"=="%DEST_DIR%" (
    echo [INFO] Installer is already running from the destination folder.
    echo Skipping file copy process...
    goto RunSetup
)

:: 5. Check if destination already exists
if exist "%DEST_DIR%" (
    echo [WARNING] The destination folder "%DEST_DIR%" already exists.
    set /p OVERWRITE="Do you want to overwrite it? All existing data will be lost. (Y/N): "
    
    if /I "!OVERWRITE!"=="Y" (
        echo Removing existing folder...
        rmdir /S /Q "%DEST_DIR%"
    ) else (
        echo Installation cancelled by the user.
        pause
        exit /b 0
    )
)

:: 4. Copy the entire folder to destination
echo Copying files to "%DEST_DIR%"...
mkdir "%DEST_DIR%"
xcopy "%SOURCE_DIR%\*" "%DEST_DIR%\" /E /I /H /Y /Q
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to copy files to the destination.
    pause
    exit /b 1
)
echo [OK] Files copied successfully.

:RunSetup
:: 7. Change directory to destination and execute setup.php
echo.
echo Running setup script...
cd /d "%DEST_DIR%"

"%PHP_EXE%" setup.php
:: 8. Wait until setup.php completes and check exit code
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Database setup failed. Please check the errors above.
    pause
    exit /b 1
)

:: 9. Display professional installation summary
echo.
echo ========================================
echo Installation Complete
echo ========================================
echo.
echo Project Installed To:
echo %DEST_DIR%
echo.
echo Open:
echo %PROJECT_URL%
echo.
echo You may now close this window.
pause
exit /b 0
