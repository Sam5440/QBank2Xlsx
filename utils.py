#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import secrets
from config import DEFAULT_SYSTEM_PROMPT
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


TRANSPORT_PRIVATE_KEY_PATH = 'transport_private_key.pem'


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


def get_or_create_transport_private_key():
    """Get or create the RSA private key used for API credential transport."""
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
    if os.path.exists('system_prompt.txt'):
        with open('system_prompt.txt', 'r', encoding='utf-8') as f:
            return f.read().strip()
    return DEFAULT_SYSTEM_PROMPT
