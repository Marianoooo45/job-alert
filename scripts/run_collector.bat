@echo off
REM ------------ Paramètres ------------
set ROOT=D:\Coding\job_alert
set PYTHON=%ROOT%\.venv\Scripts\python.exe
set LOG=%ROOT%\logs\collector.log
REM ------------------------------------

echo [DEBUG] ROOT=%ROOT%
echo [DEBUG] PYTHON=%PYTHON%

REM Vérifier que python.exe existe :
if not exist "%PYTHON%" (
  echo [ERROR] L’exécutable Python introuvable : "%PYTHON%"
  exit /b 1
)

REM Vérifier que collector.py existe :
if not exist "%ROOT%\collector.py" (
  echo [ERROR] Le script collector.py introuvable dans %ROOT%
  exit /b 1
)

REM Injecter le webhook Discord pour l’exécution locale
set DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1387759685368811630/Yd1zwzKKWcOqBFjRvcu50zlSZg7ARl3Qh3z4GLaROENlG6nlOorXgn2i2BdD9TRIlm_Q

echo [DEBUG] Lancement de collector.py...
"%PYTHON%" "%ROOT%\collector.py" >> "%LOG%" 2>&1

if %ERRORLEVEL% neq 0 (
  echo [ERROR] collector.py a retourné code %ERRORLEVEL%
) else (
  echo [DEBUG] collector.py exécuté avec succès
)
