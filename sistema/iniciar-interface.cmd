@echo off
cd /d "%~dp0frontend"
if not exist "node_modules" (
  echo Dependencias ausentes. Execute npm ci nesta pasta.
  pause
  exit /b 1
)
echo Interface local: http://127.0.0.1:5173
echo Mantenha esta janela aberta. Para parar, pressione Ctrl+C.
call npm run dev
pause
