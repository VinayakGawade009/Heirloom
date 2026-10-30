@echo off
REM start.bat = stub engine (testing). start.bat real = Arushi engine + Ollama.
cd /d "%~dp0backend"
if /i "%1"=="real" (set HEIRLOOM_ENGINE=real) else (set HEIRLOOM_ENGINE=stub)
echo Engine: %HEIRLOOM_ENGINE%
python -m pip install -q -r requirements.txt
start "" cmd /c "timeout /t 3 >nul & start http://localhost:8000"
python -m uvicorn app.main:app --port 8000
