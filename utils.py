#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import secrets
from config import DEFAULT_SYSTEM_PROMPT


def get_or_create_key():
    """获取或创建加密密钥"""
    if os.path.exists('key.txt'):
        with open('key.txt', 'r') as f:
            return f.read().strip()
    else:
        key = secrets.token_urlsafe(32)
        with open('key.txt', 'w') as f:
            f.write(key)
        return key


def load_system_prompt():
    """从本地文件读取系统提示词"""
    if os.path.exists('system_prompt.txt'):
        with open('system_prompt.txt', 'r', encoding='utf-8') as f:
            return f.read().strip()
    return DEFAULT_SYSTEM_PROMPT
