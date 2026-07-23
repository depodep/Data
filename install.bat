@echo off
setlocal EnableDelayedExpansion

:: ========================================
:: INSTALL.BAT
:: Automated Installer for PHP Project
:: Installs Python if not found, then
:: sets up database and Python packages.
:: ========================================

set "DEST_DIR=C:\xampp\htdocs\data"
set "PHP_EXE=C:\xampp\php\php.exe"
set "PROJECT_URL=http://localhost/data"
set "PYTHON_INSTALLER_URL=https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe"
set "PYTHON_INSTALLER=%TEMP%\python_installer.exe"

set "SOURCE_DIR=%~dp0"
if "%SOURCE_DIR:~-1%"=="\" set "SOURCE_DIR=%SOURCE_DIR:~0,-1%"

echo.
echo ========================================
echo   Data Science Hub - Installer
echo ========================================
echo.

:: ----------------------------------------
:: Step 1: Verify XAMPP
:: ----------------------------------------
echo [1/5] Checking XAMPP...
if not exist "%PHP_EXE%" (
    echo.
    echo [ERROR] XAMPP not found at C:\xampp
    echo         Please install XAMPP first: https://www.apachefriends.org
    echo.
    pause
    exit /b 1
)
echo       XAMPP OK.

:: ----------------------------------------
:: Step 2: Check / Install Python
:: ----------------------------------------
echo.
echo [2/5] Checking Python...

set "PYTHON_EXE="

:: Check system PATH first
for %%C in (python python3 py) do (
    if "!PYTHON_EXE!"=="" (
        where %%C >nul 2>&1
        if !ERRORLEVEL!==0 (
            for /f "delims=" %%V in ('%%C --version 2^>^&1') do (
                echo       Found: %%V  [%%C]
            )
            set "PYTHON_EXE=%%C"
        )
    )
)

if "!PYTHON_EXE!"=="" (
    echo       Python not found. Downloading and installing Python 3.12...
    echo       This may take a few minutes, please wait...
    echo.

    :: Download Python installer using PowerShell
    powershell -NoProfile -Command ^
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
        "Write-Host '      Downloading Python installer...'; " ^
        "$wc = New-Object System.Net.WebClient; " ^
        "$wc.DownloadFile('%PYTHON_INSTALLER_URL%', '%PYTHON_INSTALLER%'); " ^
        "Write-Host '      Download complete.'"

    if not exist "%PYTHON_INSTALLER%" (
        echo.
        echo [ERROR] Failed to download Python installer.
        echo         Check your internet connection and try again.
        echo         Or install Python manually from: https://www.python.org
        echo.
        pause
        exit /b 1
    )

    :: Install Python silently for all users, add to PATH
    echo       Installing Python (this requires admin rights)...
    "%PYTHON_INSTALLER%" /quiet ^
        InstallAllUsers=1 ^
        PrependPath=1 ^
        Include_pip=1 ^
        Include_launcher=1 ^
        Include_test=0 ^
        Include_doc=0

    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Python installation failed (exit code: %ERRORLEVEL%).
        echo         Try running this installer as Administrator.
        echo.
        del /f /q "%PYTHON_INSTALLER%" >nul 2>&1
        pause
        exit /b 1
    )

    del /f /q "%PYTHON_INSTALLER%" >nul 2>&1
    echo       Python installed successfully.

    :: Refresh PATH in current session so we can use python immediately
    for /f "skip=2 tokens=3*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do (
        if "%%B"=="" ( set "SYS_PATH=%%A" ) else ( set "SYS_PATH=%%A %%B" )
    )
    for /f "skip=2 tokens=3*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do (
        if "%%B"=="" ( set "USR_PATH=%%A" ) else ( set "USR_PATH=%%A %%B" )
    )
    set "PATH=!SYS_PATH!;!USR_PATH!;%PATH%"

    :: Now try to find Python again after install
    for %%C in (python python3 py) do (
        if "!PYTHON_EXE!"=="" (
            where %%C >nul 2>&1
            if !ERRORLEVEL!==0 set "PYTHON_EXE=%%C"
        )
    )

    if "!PYTHON_EXE!"=="" (
        echo.
        echo [WARNING] Python was installed but could not be found on PATH yet.
        echo           This is normal on Windows - PATH updates require a new terminal.
        echo           After this installer finishes, open a NEW Command Prompt and run:
        echo             python -m pip install -r "%DEST_DIR%\python\requirements.txt"
        echo.
        set "PYTHON_EXE=python"
    ) else (
        echo       Python is now on PATH: !PYTHON_EXE!
    )
) 

:: ----------------------------------------
:: Step 3: Copy files to destination
:: ----------------------------------------
echo.
echo [3/5] Installing project files...

if /I "%SOURCE_DIR%"=="%DEST_DIR%" (
    echo       Already in destination folder. Skipping copy.
    goto RunSetup
)

if exist "%DEST_DIR%" (
    echo.
    echo [WARNING] "%DEST_DIR%" already exists.
    set /p OVERWRITE="       Overwrite? All existing data will be lost. (Y/N): "
    if /I "!OVERWRITE!"=="Y" (
        echo       Removing old installation...
        rmdir /S /Q "%DEST_DIR%"
    ) else (
        echo       Installation cancelled.
        pause
        exit /b 0
    )
)

mkdir "%DEST_DIR%"
xcopy "%SOURCE_DIR%\*" "%DEST_DIR%\" /E /I /H /Y /Q
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to copy project files.
    pause
    exit /b 1
)
echo       Files copied to %DEST_DIR%

:RunSetup
:: ----------------------------------------
:: Step 4: Database setup
:: ----------------------------------------
echo.
echo [4/5] Setting up database...
cd /d "%DEST_DIR%"
"%PHP_EXE%" setup.php
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Database setup failed. See errors above.
    pause
    exit /b 1
)
echo       Database ready.

:: ----------------------------------------
:: Step 5: Install Python packages
:: ----------------------------------------
echo.
echo [5/5] Installing Python packages (pandas, numpy, scikit-learn, etc.)...
"!PYTHON_EXE!" -m pip install -r "%DEST_DIR%\python\requirements.txt" --quiet --no-warn-script-location
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Some Python packages failed to install.
    echo           Run manually: !PYTHON_EXE! -m pip install -r python\requirements.txt
) else (
    echo       All packages installed.
)

:: ----------------------------------------
:: Done
:: ----------------------------------------
echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo   Project : %DEST_DIR%
echo   URL     : %PROJECT_URL%
echo   Python  : !PYTHON_EXE!
echo.
echo   Open your browser and go to:
echo   %PROJECT_URL%
echo.
pause
exit /b 0
