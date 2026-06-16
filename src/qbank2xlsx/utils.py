#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import secrets
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from .config import DEFAULT_SYSTEM_PROMPT
from .paths import KEY_PATH, RUNTIME_DIR, SYSTEM_PROMPT_PATH, TRANSPORT_PRIVATE_KEY_PATH


def get_or_create_key():
    """获取或创建加密密钥"""
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    if os.path.exists(KEY_PATH):
        with open(KEY_PATH, 'r') as f:
            return f.read().strip()
    else:
        key = secrets.token_urlsafe(32)
        with open(KEY_PATH, 'w') as f:
            f.write(key)
        return key


def get_or_create_transport_private_key():
    """Get or create the RSA private key used for API credential transport."""
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    if os.path.exists(TRANSPORT_PRIVATE_KEY_PATH):
        with open(TRANSPORT_PRIVATE_KEY_PATH, 'rb') as f:
            return serialization.load_pem_private_key(f.read(), password=None)

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    with open(TRANSPORT_PRIVATE_KEY_PATH, 'wb') as f:
        f.write(private_pem)
    return private_key


def get_transport_public_key_pem(private_key):
    """Return the PEM public key corresponding to the transport private key."""
    return private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')


def load_system_prompt():
    """从本地文件读取系统提示词"""
    if os.path.exists(SYSTEM_PROMPT_PATH):
        with open(SYSTEM_PROMPT_PATH, 'r', encoding='utf-8') as f:
            return f.read().strip()
    return DEFAULT_SYSTEM_PROMPT
