@echo off
rem Запуск API из обычной командной строки Windows.
rem Первый раз:
rem   pip install -r requirements.txt
rem   python -m playwright install chromium
cd /d "%~dp0"
echo DZNOW API -^> http://127.0.0.1:8010
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload
