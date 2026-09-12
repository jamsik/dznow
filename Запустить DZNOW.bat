@echo off
rem ---------------------------------------------------------------------
rem  DZNOW - local launcher.
rem  Double-click this file: it starts the web dev server and the API in
rem  two console windows and opens the browser.
rem
rem  This shim is deliberately ASCII-only. All logic and all Russian text
rem  live in tools\launch.ps1 - cmd.exe garbles UTF-8 inside .bat files,
rem  PowerShell does not.
rem ---------------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\launch.ps1"
if errorlevel 1 (
  echo.
  echo Launcher failed. See the message above.
  pause
)
