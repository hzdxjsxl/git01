@echo off
echo ========================================
echo     智能排课系统 - 启动脚本
echo ========================================
echo.

echo [1/3] 启动 Go 后端服务...
cd backend
start cmd /k "go run main.go"
cd ..

timeout /t 3 /nobreak > nul

echo.
echo [2/3] 安装前端依赖...
cd frontend
call npm install

echo.
echo [3/3] 启动 Vue 前端服务...
call npm run dev
