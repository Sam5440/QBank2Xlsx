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
echo 服务器地址: http://localhost:8111
echo 按 Ctrl+C 停止服务器
echo.
start http://localhost:8111
python app.py --http2
