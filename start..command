#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "========================================"
echo "   AI 题库生成器启动脚本"
echo "========================================"
echo ""

echo "[1/2] 检查依赖..."
if ! command -v "$PYTHON_BIN" > /dev/null 2>&1; then
    echo "未找到 $PYTHON_BIN，请先安装 Python 3。"
    exit 1
fi

"$PYTHON_BIN" -m pip show fastapi hypercorn > /dev/null 2>&1 || {
    echo "正在安装依赖..."
    "$PYTHON_BIN" -m pip install -r tools/requirements.txt
}

echo "[2/2] 启动服务器..."
echo ""

export PATH="$PATH:$HOME/Library/Python/3.9/bin"

LAN_IP=$(ifconfig | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}')
echo "本机访问: http://localhost:8111"
echo "局域网访问: http://${LAN_IP}:8111"
echo "按 Ctrl+C 停止服务器"
echo ""

if lsof -nP -iTCP:8111 -sTCP:LISTEN > /dev/null 2>&1; then
    echo "端口 8111 已有服务运行，直接打开现有服务。"
    open http://localhost:8111 2>/dev/null || true
    exit 0
fi

open http://localhost:8111 2>/dev/null || true
"$PYTHON_BIN" app.py --http2
