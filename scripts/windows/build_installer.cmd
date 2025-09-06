@echo off
setlocal enabledelayedexpansion

:: ---------------------------------------------
:: Ganado AI - Generar instalador MSI (Windows)
:: Requiere Windows 10/11 con winget o PowerShell.
:: Deja el MSI en src-tauri\target\release\bundle\msi\
:: ---------------------------------------------

:: Elevar a administrador si no lo es
openfiles >nul 2>&1
if not %errorlevel%==0 (
  echo [*] Solicitando privilegios de administrador...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cd /d "%~dp0..\..\"
echo [*] Directorio del proyecto: %cd%

:: Verificar winget
where winget >nul 2>&1
if %errorlevel% neq 0 (
  echo [!] winget no esta disponible. Intentando continuar con descargas directas...
)

:: Instalar WebView2 Runtime
echo [*] Instalando Microsoft Edge WebView2 Runtime...
winget install --id Microsoft.EdgeWebView2Runtime -e --silent --accept-package-agreements --accept-source-agreements 2>nul || (
  powershell -Command "Invoke-WebRequest -UseBasicParsing -Uri https://go.microsoft.com/fwlink/p/?LinkId=2124703 -OutFile webview2.exe" && webview2.exe /silent /install || echo [!] No se pudo instalar WebView2
)

:: Instalar Build Tools
echo [*] Instalando Microsoft Visual Studio 2022 Build Tools (puede tardar varios minutos)...
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --silent --accept-package-agreements --accept-source-agreements 2>nul || echo [!] Si falla, instala manualmente los Build Tools (C++ desktop)

:: Instalar Node LTS
echo [*] Instalando Node.js LTS...
winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements 2>nul || echo [!] No se pudo instalar Node con winget; instala manualmente desde https://nodejs.org/

:: Instalar Rust
echo [*] Instalando Rust (rustup)...
powershell -Command "Invoke-WebRequest -UseBasicParsing -Uri https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe -OutFile rustup-init.exe" && rustup-init.exe -y --default-toolchain stable --profile default || echo [!] No se pudo instalar Rust
set "CARGO_HOME=%USERPROFILE%\.cargo"
set "PATH=%CARGO_HOME%\bin;%PATH%"

:: Instalar Bun
echo [*] Instalando Bun...
powershell -ExecutionPolicy Bypass -Command "iwr -useb https://bun.sh/install.ps1 | iex" || echo [!] No se pudo instalar Bun; se continuara con npm
if exist "%USERPROFILE%\.bun\bin" set "PATH=%USERPROFILE%\.bun\bin;%PATH%"

:: Instalar CLI de Tauri (preferir bunx)
where bun >nul 2>&1
if %errorlevel%==0 (
  echo [*] Usando Bun para dependencias...
  bun install || goto :bun_fallback
  goto :deps_ok
)

:bun_fallback
echo [*] Bun no disponible o fallo la instalacion. Usando npm...
call npm ci || call npm install
call npm install -g @tauri-apps/cli

:deps_ok
echo [*] Generando Prisma Client (si aplica)...
where bun >nul 2>&1 && bunx prisma generate || npx prisma generate

echo [*] Construyendo MSI con Tauri...
set NEXT_TELEMETRY_DISABLED=1
where bun >nul 2>&1 && bunx tauri build || npx tauri build

set "MSI_DIR=src-tauri\target\release\bundle\msi"
if exist "%MSI_DIR%" (
  echo [OK] Instalador generado en: %MSI_DIR%
  for %%F in ("%MSI_DIR%\*.msi") do (
    echo       %%~nxF
  )
) else (
  echo [!] No se encontro el directorio de salida: %MSI_DIR%
  exit /b 1
)

echo [*] Listo. Puedes compartir el archivo .msi encontrado en la ruta anterior.
exit /b 0


