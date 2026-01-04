#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import os
import tempfile
from generate_excel import create_excel_from_json


def export_to_excel(questions):
    """导出题目到 Excel 文件"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump({'questions': questions}, f, ensure_ascii=False, indent=2)
        json_path = f.name

    excel_path = tempfile.mktemp(suffix='.xlsx')

    try:
        create_excel_from_json(json_path, excel_path)
        return excel_path, json_path
    except Exception as e:
        if os.path.exists(json_path):
            os.unlink(json_path)
        raise e
