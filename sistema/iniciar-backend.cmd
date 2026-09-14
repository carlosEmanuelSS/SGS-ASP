@echo off
cd /d "%~dp0backend"
set "DJANGO_DEBUG=true"
set "CSRF_TRUSTED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173"
if not exist "..\.venv\Scripts\python.exe" (
  echo Ambiente Python nao encontrado. Siga a instalacao no README.md.
  pause
  exit /b 1
)
echo Backend local: http://127.0.0.1:8000
echo Mantenha esta janela aberta. Para parar, pressione Ctrl+C.
"..\.venv\Scripts\python.exe" manage.py runserver 127.0.0.1:8000
pause
