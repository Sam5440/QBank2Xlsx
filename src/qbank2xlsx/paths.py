#!/usr/bin/env python
# -*- coding: utf-8 -*-
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
OUTPUTS_DIR = ROOT_DIR / "outputs"
RESOURCES_DIR = ROOT_DIR / "resources"
RUNTIME_DIR = ROOT_DIR / "runtime"
WEB_DIR = ROOT_DIR / "web"

TEMPLATE_DIR = RESOURCES_DIR / "templates"
DEMO_QUESTIONS_PATH = DATA_DIR / "demo_questions.json"
SYSTEM_PROMPT_PATH = RUNTIME_DIR / "system_prompt.txt"
KEY_PATH = RUNTIME_DIR / "key.txt"
TRANSPORT_PRIVATE_KEY_PATH = RUNTIME_DIR / "transport_private_key.pem"
