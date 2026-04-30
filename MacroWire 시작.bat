@echo off
chcp 65001 > nul
title MacroWire

cd /d "%~dp0"

echo.
echo   ███╗   ███╗ █████╗  ██████╗██████╗  ██████╗
echo   ████╗ ████║██╔══██╗██╔════╝██╔══██╗██╔═══██╗
echo   ██╔████╔██║███████║██║     ██████╔╝██║   ██║
echo   ██║╚██╔╝██║██╔══██║██║     ██╔══██╗██║   ██║
echo   ██║ ╚═╝ ██║██║  ██║╚██████╗██║  ██║╚██████╔╝
echo   ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝
echo                W   I   R   E
echo.
echo  ─────────────────────────────────────────
echo.

:: Kill any process already on port 3000
echo  [1/3] 포트 정리 중...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 "') do (
    taskkill /f /pid %%a 2>nul
)
timeout /t 1 /nobreak > nul

:: Check if production build exists
if exist ".next\BUILD_ID" (
    echo  [2/3] 프로덕션 모드로 시작합니다...
    echo.
    :: Open browser after 2.5 seconds (background)
    start /b cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:3000/app"
    npm run start
) else (
    echo  [2/3] 첫 실행 - 빌드 생성 중... (약 30초 소요)
    call npm run build
    if errorlevel 1 (
        echo.
        echo  [오류] 빌드 실패. 개발 모드로 전환합니다.
        goto devmode
    )
    echo  [3/3] 서버 시작 중...
    echo.
    start /b cmd /c "timeout /t 4 /nobreak > nul && start http://localhost:3000/app"
    npm run start
    goto end
)

:devmode
echo  [3/3] 개발 모드로 시작 중...
echo.
start /b cmd /c "timeout /t 5 /nobreak > nul && start http://localhost:3000/app"
npm run dev

:end
