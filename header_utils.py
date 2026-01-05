#!/usr/bin/env python
# -*- coding: utf-8 -*-

# 表头映射表（统一管理所有字段）
HEADER_MAPPING = {
    '题干': "题干（必填）",
    '题型': "题型 （必填）",
    'A': "选项 A",
    'B': "选项 B",
    'C': "选项 C",
    'D': "选项 D",
    'E': "选项E\n(勿删)",
    'F': "选项F\n(勿删)",
    'G': "选项G\n(勿删)",
    'H': "选项H\n(勿删)",
    '正确答案': "正确答案\n（必填）",
    '解析': "解析\n（勿删）",
    '章节': "章节\n（勿删）",
    '难度': "难度"
}

# 固定表头（永远不变）
HEADERS = list(HEADER_MAPPING.values())


def match_header(header, question):
    """
    灵活匹配表头，尝试多种可能的键格式

    参数:
        header: 标准表头字符串
        question: 题目字典

    返回:
        匹配到的值，如果不存在返回 None
    """
    # 提取括号前的核心文本
    base_text = header.split('（')[0].split('(')[0].replace('\n', '').strip()

    # 尝试多种可能的键格式
    possible_keys = [
        header,                           # 完整格式（如 "正确答案\n（必填）"）
        header.replace('\n', ''),         # 去除换行符（如 "正确答案（必填）"）
        base_text                         # 只有核心文本（如 "正确答案"）
    ]

    for key in possible_keys:
        value = question.get(key)
        if value is not None:
            return value

    return None


def get_question_type(question):
    """获取题目类型"""
    return match_header(HEADER_MAPPING['题型'], question)
