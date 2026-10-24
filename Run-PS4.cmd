@echo off
cd /d "%~dp0"
if not exist "openPS4\bin\Release\net9.0-windows7.0\openPS4.exe" (
 echo Build openPS4 first with Build-PS4.ps1.
 exit /b 1
)
start "" "openPS4\bin\Release\net9.0-windows7.0\openPS4.exe" %*
