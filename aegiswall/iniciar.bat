@echo off
rem Serve o AegisWall em http://localhost:8765 (somente nesta maquina) e abre o navegador.
cd /d "%~dp0"
start "" http://localhost:8765
python servidor.py 8765
