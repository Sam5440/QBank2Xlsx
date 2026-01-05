#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import httpx
from utils import load_system_prompt
from config import DIRECTORY_EXTRACTION_PROMPT, FILENAME_GENERATION_PROMPT, COMPARE_PROMPT
from header_utils import get_question_type


async def call_ai_api(api_url, api_key, model, system_prompt, user_prompt):
    """通用 AI API 调用函数"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{api_url}/chat/completions",
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json={
                'model': model,
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                'stream': False
            }
        )
        data = response.json()
        if 'choices' in data and len(data['choices']) > 0:
            return data['choices'][0]['message']['content'].strip()
        return None


async def generate_questions_stream(api_url, api_key, model, question_types, user_input, system_prompt_override, directory):
    """流式生成题目"""
    with open('demo_questions.json', 'r', encoding='utf-8') as f:
        demo_data = json.load(f)

    examples_text = ""
    for qtype in question_types:
        examples = [q for q in demo_data['questions'] if get_question_type(q) == qtype]
        if examples:
            examples_text += f"\n{qtype}示例：\n{json.dumps(examples[0], ensure_ascii=False, indent=2)}\n"

    system_prompt = system_prompt_override if system_prompt_override else load_system_prompt()
    system_prompt = system_prompt.replace('{{json_example}}', examples_text)
    system_prompt = system_prompt.replace('{{TOP}}', directory if directory else '无')

    user_prompt = f"用户需求：\n{user_input}\n\n请按照system prompt中的格式要求生成题目。"

    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream(
            'POST',
            f"{api_url}/chat/completions",
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json={'model': model, 'messages': [{'role': 'system', 'content': system_prompt}, {'role': 'user', 'content': user_prompt}], 'stream': True}
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith('data: '):
                    data = line[6:]
                    if data.strip() == '[DONE]':
                        break
                    try:
                        chunk = json.loads(data)
                        if 'choices' in chunk and len(chunk['choices']) > 0:
                            delta = chunk['choices'][0].get('delta', {})
                            if 'content' in delta:
                                yield f"data: {json.dumps({'text': delta['content']}, ensure_ascii=False)}\n\n"
                    except:
                        pass


async def extract_directory(api_url, api_key, model, content):
    """使用 AI 提取目录结构"""
    user_prompt = f'请根据以下内容提取或生成目录结构：\n\n{content}\n\n请直接输出目录结构，不要有其他说明文字。'
    return await call_ai_api(api_url, api_key, model, DIRECTORY_EXTRACTION_PROMPT, user_prompt)


async def generate_filename(api_url, api_key, model, content):
    """使用 AI 生成文件名"""
    user_prompt = f'请根据以下内容生成一个合适的文件名：\n\n{content}\n\n请直接输出文件名，不要有其他说明文字，不要包含扩展名。'
    return await call_ai_api(api_url, api_key, model, FILENAME_GENERATION_PROMPT, user_prompt)


async def compare_files_stream(api_url, api_key, model, file_a, file_b):
    """流式对比两份文件"""
    prompt = COMPARE_PROMPT.replace('{file_a}', file_a).replace('{file_b}', file_b)

    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream(
            'POST',
            f"{api_url}/chat/completions",
            headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
            json={'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'stream': True}
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith('data: '):
                    data = line[6:]
                    if data.strip() == '[DONE]':
                        break
                    try:
                        chunk = json.loads(data)
                        if 'choices' in chunk and len(chunk['choices']) > 0:
                            delta = chunk['choices'][0].get('delta', {})
                            if 'content' in delta:
                                yield f"data: {json.dumps({'text': delta['content']}, ensure_ascii=False)}\n\n"
                    except:
                        pass
