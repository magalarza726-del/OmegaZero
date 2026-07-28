@echo off
setlocal
cd /d "%~dp0"
title OmegaZero Web v2.5.2
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 22 o superior no esta instalado.
  echo Instala Node.js y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
call npm run build
if errorlevel 1 (
  echo No se pudo construir OmegaZero.
  pause
  exit /b 1
)
start "OmegaZero Web" cmd /k "npm run preview"
timeout /t 2 >nul
start "" http://127.0.0.1:4173
endlocal
