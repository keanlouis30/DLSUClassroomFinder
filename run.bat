@echo off
REM DLSU Classroom Finder - Development Server Starter
REM This batch file starts the Next.js development server

echo.
echo ========================================
echo DLSU Classroom Finder - Dev Server
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start the development server
echo Starting development server...
echo.
call npm run dev

pause
