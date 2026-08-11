@echo off
TITLE NoteNest Server
echo Starting NoteNest...
cd /d "%~dp0"
call npm install
call npm start
pause
