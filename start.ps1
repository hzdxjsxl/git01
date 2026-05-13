Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    智能排课系统 - 启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] 启动 Go 后端服务..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "$using:PWD\backend"
    go run main.go
}

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[2/3] 安装前端依赖..." -ForegroundColor Yellow
Set-Location frontend
npm install

Write-Host ""
Write-Host "[3/3] 启动 Vue 前端服务..." -ForegroundColor Yellow
npm run dev
