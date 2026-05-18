@echo off
chcp 65001 >nul
echo ========================================
echo    AI 题库生成器启动脚本
echo ========================================
echo.

echo [1/2] 检查依赖...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo 正在安装依赖...
    pip install -r requirements.txt
)

echo [2/2] 启动服务器...
echo.
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do set LAN_IP=%%i
set LAN_IP=%LAN_IP: =%
echo 本机访问: http://localhost:8111
echo 局域网访问: http://%LAN_IP%:8111
echo 按 Ctrl+C 停止服务器
echo.
start http://localhost:8111
python app.py --http2
