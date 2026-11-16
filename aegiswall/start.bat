@echo off
rem Serves AegisWall at http://localhost:8765 (this machine only) and opens the browser.
cd /d "%~dp0"
start "" http://localhost:8765
python server.py
