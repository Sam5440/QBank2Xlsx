#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import os
from datetime import datetime
from pathlib import Path

LOG_DIR = Path(__file__).parent / "log"
LOG_FILE = LOG_DIR / "api.log"
MAX_ENTRIES = 50


def log_api_call(method, path, status_code, request_body=None, response_body=None, duration_ms=0):
    """记录 API 调用到日志文件和控制台"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 准备日志条目
    log_entry = {
        "timestamp": timestamp,
        "method": method,
        "path": path,
        "status": status_code,
        "duration_ms": duration_ms,
        "request": request_body,
        "response": response_body
    }

    # 控制台输出（截断到100字符）
    console_msg = f"[{timestamp}] {method} {path} {status_code} {duration_ms}ms"
    if request_body:
        req_str = str(request_body)[:100]
        console_msg += f" | Req: {req_str}{'...' if len(str(request_body)) > 100 else ''}"
    if response_body:
        resp_str = str(response_body)[:100]
        console_msg += f" | Resp: {resp_str}{'...' if len(str(response_body)) > 100 else ''}"
    print(console_msg)

    # 读取现有日志
    logs = []
    if LOG_FILE.exists():
        try:
            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                logs = json.load(f)
        except:
            logs = []

    # 添加新日志并保持最多50条
    logs.insert(0, log_entry)
    logs = logs[:MAX_ENTRIES]

    # 写入日志文件
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(logs, f, ensure_ascii=False, indent=2)
