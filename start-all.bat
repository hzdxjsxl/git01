@echo off
chcp 65001 >nul
title 足球比赛实时热力图大屏

echo ========================================
echo   足球比赛实时热力图大屏启动脚本
echo ========================================
echo.

where go >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Go 编译器，请先安装 Go (https://go.dev/dl/)
    echo.
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js (https://nodejs.org/)
    echo.
    pause
    exit /b 1
)

echo [信息] 检测到 Go: $(go version)
echo [信息] 检测到 Node.js: $(node --version)
echo.

echo [1/4] 正在安装后端依赖...
cd /d "%~dp0backend"
if not exist "go.sum" (
    go mod tidy
    if %errorlevel% neq 0 (
        echo [错误] 后端依赖安装失败
        pause
        exit /b 1
    )
    echo [完成] 后端依赖安装成功
) else (
    echo [跳过] 后端依赖已存在
)
echo.

echo [2/4] 正在构建后端服务器...
go build -o server.exe .
if %errorlevel% neq 0 (
    echo [错误] 后端构建失败
    pause
    exit /b 1
)
echo [完成] 后端构建成功
echo.

echo [3/4] 正在安装前端依赖...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
    echo [完成] 前端依赖安装成功
) else (
    echo [跳过] 前端依赖已存在
)
echo.

echo [4/4] 正在启动服务...
echo.

start "后端 WebSocket 服务" cmd /c "cd /d "%~dp0backend" && server.exe"
timeout /t 2 /nobreak >nul
start "前端开发服务器" cmd /c "cd /d "%~dp0frontend" && call npm run dev"

echo ========================================
echo   服务启动完成！
echo ========================================
echo.
echo 前端地址: http://localhost:5173
echo 后端端口: 8080 (如被占用会自动使用后续端口)
echo.
echo 按任意键退出启动脚本...
pause >nul
