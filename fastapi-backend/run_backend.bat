@echo off
echo Starting Vyapari Backend on 0.0.0.0:8000 ...
cd /d "%~dp0"

REM Load .env vars if the file exists
if exist .env (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
    )
)

REM Activate venv if present
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
