#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""AI 调用调试记录存储。

集中保存每一次 AI（chat/completions）调用的完整上下文：请求消息、
请求头（脱敏）、响应头、返回内容、耗时、错误等，供前端在「操作日志」中
点击查看，便于 debug。记录保存在内存环形缓冲中，进程重启后清空。
"""
import threading
import time
import uuid
from collections import OrderedDict

# 最多保留多少条记录，超出后淘汰最旧的
MAX_RECORDS = 300

# kind -> 中文展示名，仅作参考；前端也有一份映射
KIND_LABELS = {
    "generation": "题目生成",
    "filename": "文件名生成",
    "directory": "目录提取",
    "typeMatch": "题型匹配",
    "compare": "AB 对比",
    "compareScore": "结构化评分",
    "compareChat": "对比追问",
    "test": "API 连接测试",
}

_records = OrderedDict()
_lock = threading.Lock()


def _mask_headers(headers):
    """脱敏请求/响应头中的敏感字段（如 Authorization）。"""
    if not headers:
        return {}
    masked = {}
    for key, value in dict(headers).items():
        lowered = str(key).lower()
        if lowered in ("authorization", "api-key", "x-api-key", "proxy-authorization"):
            masked[key] = "***"
        else:
            masked[key] = value
    return masked


def create_record(kind, model, url, messages, request_payload, request_headers):
    """创建一条待完成的调用记录，返回记录 id。"""
    record_id = uuid.uuid4().hex
    # request_payload 里也含 messages，单独再存一份 messages 方便前端直接渲染
    safe_payload = dict(request_payload or {})
    record = {
        "id": record_id,
        "kind": kind,
        "kindLabel": KIND_LABELS.get(kind, kind),
        "model": model,
        "url": url,
        "createdAt": time.time(),
        "status": "pending",
        "durationMs": None,
        "request": {
            "method": "POST",
            "headers": _mask_headers(request_headers),
            "payload": safe_payload,
            "messages": messages or [],
            "stream": bool(safe_payload.get("stream")),
        },
        "response": None,
        "error": None,
    }
    with _lock:
        _records[record_id] = record
        while len(_records) > MAX_RECORDS:
            _records.popitem(last=False)
    return record_id


def finalize_record(record_id, *, status_code=None, response_headers=None, content=None,
                    finish_reason=None, usage=None, error=None, started_at=None):
    """补全一条调用记录的响应/错误信息。"""
    with _lock:
        record = _records.get(record_id)
        if not record:
            return
        record["response"] = {
            "statusCode": status_code,
            "headers": _mask_headers(response_headers) if response_headers else None,
            "content": content,
            "finishReason": finish_reason,
            "usage": usage,
        }
        record["error"] = error
        record["status"] = "error" if error is not None else "done"
        if started_at is not None:
            record["durationMs"] = int((time.time() - started_at) * 1000)


def _summary(record):
    content = (record.get("response") or {}).get("content") or ""
    return {
        "id": record["id"],
        "kind": record["kind"],
        "kindLabel": record["kindLabel"],
        "model": record["model"],
        "createdAt": record["createdAt"],
        "status": record["status"],
        "durationMs": record["durationMs"],
        "charCount": len(content),
        "error": record["error"],
    }


def list_records(since=0.0):
    """返回创建时间晚于 since 的记录摘要（按时间升序）。"""
    with _lock:
        return [_summary(r) for r in _records.values() if r["createdAt"] > (since or 0.0)]


def get_record(record_id):
    """返回完整记录；不存在返回 None。"""
    with _lock:
        return _records.get(record_id)
