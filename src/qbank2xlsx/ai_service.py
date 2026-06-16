#!/usr/bin/env python
# -*- coding: utf-8 -*-
import asyncio
import json
import time
import httpx
from . import ai_debug
from .config import DIRECTORY_EXTRACTION_PROMPT, FILENAME_GENERATION_PROMPT, COMPARE_PROMPT
from .header_utils import get_question_type
from .paths import DEMO_QUESTIONS_PATH
from .utils import load_system_prompt


def format_exception(e):
    """Return a useful error string even when the exception has an empty message."""
    message = str(e)
    return message if message else e.__class__.__name__


# ---------------------------------------------------------------------------
# 统一的 AI chat/completions 工厂：所有 AI 调用都经由这里，集中记录调试上下文
# （请求消息/请求头/响应头/返回内容/耗时/错误），避免在各业务函数里重复埋点。
# ---------------------------------------------------------------------------

async def record_chat_completion(kind, api_url, api_key, model, messages, *, timeout=60.0, extra_payload=None):
    """非流式 chat/completions。记录完整调试上下文，返回 (content, debug_id)。"""
    model = model.strip()
    url = f"{api_url}/chat/completions"
    payload = {'model': model, 'messages': messages, 'stream': False}
    if extra_payload:
        payload.update(extra_payload)
    request_headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
    debug_id = ai_debug.create_record(kind, model, url, messages, payload, request_headers)
    started = time.time()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, headers=request_headers, json=payload)
            status_code = response.status_code
            response.raise_for_status()
            data = response.json()
            content = None
            finish_reason = None
            usage = data.get('usage') if isinstance(data, dict) else None
            if isinstance(data, dict) and data.get('choices'):
                choice = data['choices'][0]
                content = (choice.get('message') or {}).get('content')
                finish_reason = choice.get('finish_reason')
                if content is not None:
                    content = content.strip()
            ai_debug.finalize_record(
                debug_id,
                status_code=status_code,
                response_headers=dict(response.headers),
                content=content,
                finish_reason=finish_reason,
                usage=usage,
                started_at=started,
            )
            return content, debug_id
    except httpx.HTTPStatusError as e:
        resp = e.response
        body = None
        try:
            body = resp.text if resp is not None else None
        except Exception:
            body = None
        ai_debug.finalize_record(
            debug_id,
            status_code=resp.status_code if resp is not None else None,
            response_headers=dict(resp.headers) if resp is not None else None,
            content=body,
            error=f"HTTP {resp.status_code if resp is not None else '?'}: {body or str(e)}",
            started_at=started,
        )
        raise
    except Exception as e:
        ai_debug.finalize_record(debug_id, error=format_exception(e), started_at=started)
        raise


async def stream_chat_completion(kind, api_url, api_key, model, messages, *, timeout=300.0, extra_payload=None):
    """流式 chat/completions。记录调试上下文，依次产出结构化事件：

        {'type': 'record', 'id': <debug_id>}
        {'type': 'text', 'text': <delta>}        # 多次
        {'type': 'done', 'id': <debug_id>}
    出错时产出 {'type': 'error', 'id': <debug_id>, 'error': <msg>} 后结束。
    """
    model = model.strip()
    url = f"{api_url}/chat/completions"
    payload = {'model': model, 'messages': messages, 'stream': True}
    if extra_payload:
        payload.update(extra_payload)
    request_headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
    debug_id = ai_debug.create_record(kind, model, url, messages, payload, request_headers)
    yield {'type': 'record', 'id': debug_id}

    started = time.time()
    accumulated = []
    finish_reason = None
    usage = None
    status_code = None
    response_headers = None
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream('POST', url, headers=request_headers, json=payload) as response:
                status_code = response.status_code
                response_headers = dict(response.headers)
                if status_code >= 400:
                    body_bytes = await response.aread()
                    body = body_bytes.decode('utf-8', errors='replace')
                    ai_debug.finalize_record(
                        debug_id,
                        status_code=status_code,
                        response_headers=response_headers,
                        content=body,
                        error=f"HTTP {status_code}: {body[:500]}",
                        started_at=started,
                    )
                    yield {'type': 'error', 'id': debug_id, 'error': f"HTTP {status_code}: {body[:300]}"}
                    return

                async for line in response.aiter_lines():
                    if not line.startswith('data: '):
                        continue
                    data = line[6:]
                    if data.strip() == '[DONE]':
                        break
                    try:
                        chunk = json.loads(data)
                    except Exception:
                        continue
                    if isinstance(chunk, dict) and chunk.get('error'):
                        msg = chunk['error']
                        if isinstance(msg, dict):
                            msg = msg.get('message') or json.dumps(msg, ensure_ascii=False)
                        raise RuntimeError(str(msg))
                    choices = chunk.get('choices') if isinstance(chunk, dict) else None
                    if choices:
                        choice0 = choices[0]
                        if choice0.get('finish_reason'):
                            finish_reason = choice0['finish_reason']
                        delta = choice0.get('delta', {}) or {}
                        content = delta.get('content')
                        if content:
                            accumulated.append(content)
                            yield {'type': 'text', 'text': content}
                    if isinstance(chunk, dict) and chunk.get('usage'):
                        usage = chunk['usage']

                ai_debug.finalize_record(
                    debug_id,
                    status_code=status_code,
                    response_headers=response_headers,
                    content=''.join(accumulated),
                    finish_reason=finish_reason,
                    usage=usage,
                    started_at=started,
                )
                yield {'type': 'done', 'id': debug_id}
    except Exception as e:
        error_text = format_exception(e)
        ai_debug.finalize_record(
            debug_id,
            status_code=status_code,
            response_headers=response_headers,
            content=''.join(accumulated),
            finish_reason=finish_reason,
            usage=usage,
            error=error_text,
            started_at=started,
        )
        yield {'type': 'error', 'id': debug_id, 'error': error_text}
        return


def build_question_generation_prompt(question_types, user_input, system_prompt_override, directory):
    with open(DEMO_QUESTIONS_PATH, 'r', encoding='utf-8') as f:
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
    return system_prompt, user_prompt


def extract_json_content(text):
    json_start_marker = "```json"
    start_index = text.find(json_start_marker)

    if start_index == -1:
        first_brace = text.find('{')
        last_brace = text.rfind('}')
        if first_brace != -1 and last_brace > first_brace:
            potential_json = text[first_brace:last_brace + 1]
            try:
                json.loads(potential_json)
                return potential_json
            except:
                return ''
        return ''

    json_end_marker = "```"
    end_index = text.find(json_end_marker, start_index + len(json_start_marker))
    if end_index == -1:
        return text[start_index + len(json_start_marker):].strip()

    return text[start_index + len(json_start_marker):end_index].strip()


async def call_ai_api(api_url, api_key, model, system_prompt, user_prompt, timeout=60.0, extra_payload=None, kind='generation'):
    """通用 AI API 调用函数（非流式）。返回 (content, debug_id)。"""
    messages = [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt}
    ]
    return await record_chat_completion(
        kind, api_url, api_key, model, messages, timeout=timeout, extra_payload=extra_payload
    )


async def generate_questions_stream(api_url, api_key, model, question_types, user_input, system_prompt_override, directory):
    """流式生成题目。透传 stream_chat_completion 的结构化事件
    （{'type':'record'|'text'|'done'|'error', ...}）。"""
    system_prompt, user_prompt = build_question_generation_prompt(question_types, user_input, system_prompt_override, directory)
    messages = [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt}
    ]
    async for event in stream_chat_completion('generation', api_url, api_key, model, messages, timeout=300.0):
        yield event


async def generate_questions_once(api_url, api_key, model, question_types, user_input, system_prompt_override, directory):
    """非流式生成题目。返回 (content, debug_id)。"""
    system_prompt, user_prompt = build_question_generation_prompt(question_types, user_input, system_prompt_override, directory)
    return await call_ai_api(api_url, api_key, model, system_prompt, user_prompt, timeout=300.0, kind='generation')


async def generate_questions_batch(api_url, api_key, model, question_types, items, system_prompt_override, directory, concurrency=20):
    """批量并发生成题目"""
    try:
        concurrency = int(concurrency)
    except:
        concurrency = 20
    concurrency = max(1, concurrency)
    semaphore = asyncio.Semaphore(concurrency)

    async def generate_one(item):
        item_id = item.get('id')
        user_input = (item.get('text') or '').strip()
        if not user_input:
            return {
                'id': item_id,
                'text': item.get('text', ''),
                'full': '',
                'editable': '',
                'questionCount': 0,
                'error': '输入内容为空'
            }

        async with semaphore:
            try:
                full_text, debug_id = await generate_questions_once(api_url, api_key, model, question_types, user_input, system_prompt_override, directory)
                editable = extract_json_content(full_text or '')
                question_count = 0
                if editable:
                    try:
                        question_count = len(json.loads(editable).get('questions', []))
                    except:
                        question_count = 0
                return {
                    'id': item_id,
                    'text': item.get('text', ''),
                    'full': full_text or '',
                    'editable': editable,
                    'questionCount': question_count,
                    'debugId': debug_id,
                    'error': None
                }
            except Exception as e:
                return {
                    'id': item_id,
                    'text': item.get('text', ''),
                    'full': '',
                    'editable': '',
                    'questionCount': 0,
                    'error': str(e)
                }

    return await asyncio.gather(*(generate_one(item) for item in items))


async def extract_directory(api_url, api_key, model, content, prompt_override=''):
    """使用 AI 提取目录结构。返回 (content, debug_id)。"""
    system_prompt = prompt_override or DIRECTORY_EXTRACTION_PROMPT
    user_prompt = f'请根据以下内容提取或生成目录结构：\n\n{content}\n\n请直接输出目录结构，不要有其他说明文字。'
    return await call_ai_api(api_url, api_key, model, system_prompt, user_prompt, kind='directory')


async def generate_filename(api_url, api_key, model, content, prompt_override=''):
    """使用 AI 生成文件名。返回 (content, debug_id)。"""
    system_prompt = prompt_override or FILENAME_GENERATION_PROMPT
    user_prompt = f'请根据以下内容生成一个合适的文件名：\n\n{content}\n\n请直接输出文件名，不要有其他说明文字，不要包含扩展名。'
    return await call_ai_api(api_url, api_key, model, system_prompt, user_prompt, kind='filename')


async def match_question_types(api_url, api_key, model, content, available_types, prompt_override=''):
    """使用 AI 从候选题型中匹配合适的题型"""
    system_prompt = prompt_override or (
        "你是一个题库需求分类助手。请只从候选题型中选择最适合用户需求的题型。"
        "必须直接输出 JSON，格式为 {\"questionTypes\": [\"题型1\"]}，不要输出其他文字。"
    )
    type_text = json.dumps(available_types, ensure_ascii=False)
    user_prompt = (
        f"候选题型：{type_text}\n\n"
        f"用户需求：\n{content}\n\n"
        "请返回一个或多个最匹配的候选题型。"
    )
    result, debug_id = await call_ai_api(api_url, api_key, model, system_prompt, user_prompt, timeout=120.0, kind='typeMatch')
    if not result:
        return [], debug_id

    json_text = extract_json_content(result) or result
    try:
        data = json.loads(json_text)
        matched = data.get("questionTypes", [])
        if isinstance(matched, str):
            matched = [matched]
        return [item for item in matched if item in available_types], debug_id
    except Exception:
        return [item for item in available_types if item in result], debug_id


async def test_api_connection(api_url, api_key, model):
    """Test an OpenAI-compatible chat completions endpoint with a tiny request.
    返回 (content, debug_id)。"""
    return await call_ai_api(
        api_url,
        api_key,
        model,
        'You are a connectivity test endpoint.',
        'Reply with OK.',
        timeout=30.0,
        extra_payload={'max_tokens': 2},
        kind='test'
    )


STRUCTURED_COMPARE_PROMPT = """你是一个严格的题库质量评分助手。请先阅读原始需求，再检查生成题目。

请只输出 Markdown，包含以下结构：
## 结构化评分
| 维度 | 分数(0-10) | 问题数 | 说明 |
| --- | ---: | ---: | --- |
| 数量完整性 |  |  |  |
| 题型匹配 |  |  |  |
| 内容一致性 |  |  |  |
| 答案正确性 |  |  |  |
| 解析质量 |  |  |  |
| JSON/字段规范 |  |  |  |

## 总分
给出 0-100 分，并说明扣分原因。

## 必改清单
按严重程度列出必须修复的问题。"""


def build_compare_messages(file_a, file_b, prompt_override='', mode='review', use_context_cache=False):
    if mode == 'score':
        prompt_template = prompt_override or STRUCTURED_COMPARE_PROMPT
    else:
        prompt_template = prompt_override or COMPARE_PROMPT

    if '{file_a}' in prompt_template or '{file_b}' in prompt_template:
        if use_context_cache:
            content = prompt_template.replace('{file_a}', file_a).replace('{file_b}', '见上一条消息中的原文件 / 原始需求。')
            return [
                {'role': 'system', 'content': '你是一个专业的题库审核助手，必须基于原始需求检查生成题目，不要编造缺失信息。'},
                {'role': 'user', 'content': f'请缓存并优先使用以下原文件 / 原始需求：\n\n{file_b}'},
                {'role': 'user', 'content': content}
            ]
        content = prompt_template.replace('{file_a}', file_a).replace('{file_b}', file_b)
        return [{'role': 'user', 'content': content}]

    cache_note = "已启用原文件优先上下文缓存：请把下面的原始需求视为稳定上下文。" if use_context_cache else "请先阅读原始需求，再阅读生成题目。"
    return [
        {'role': 'system', 'content': '你是一个专业的题库审核助手，必须基于原始需求检查生成题目，不要编造缺失信息。'},
        {'role': 'user', 'content': f'{cache_note}\n\n## 原文件 / 原始需求\n{file_b}'},
        {'role': 'user', 'content': f'## 生成文件 / 文件 A\n{file_a}\n\n{prompt_template}'}
    ]


async def compare_files_stream(api_url, api_key, model, file_a, file_b, prompt_override='', mode='review', use_context_cache=False):
    """流式对比两份文件。输出 SSE：data:{text}/data:{error}，结束追加 data:{debugId}。"""
    messages = build_compare_messages(file_a, file_b, prompt_override, mode, use_context_cache)
    kind = 'compareScore' if mode == 'score' else 'compare'
    debug_id = None
    async for event in stream_chat_completion(kind, api_url, api_key, model, messages, timeout=300.0):
        etype = event.get('type')
        if etype == 'record':
            debug_id = event.get('id')
        elif etype == 'text':
            yield f"data: {json.dumps({'text': event['text']}, ensure_ascii=False)}\n\n"
        elif etype == 'error':
            yield f"data: {json.dumps({'error': event['error'], 'debugId': debug_id}, ensure_ascii=False)}\n\n"
            return
    yield f"data: {json.dumps({'debugId': debug_id}, ensure_ascii=False)}\n\n"


async def compare_chat_stream(api_url, api_key, model, compare_result, question, file_a='', file_b='', history=None, prompt_override=''):
    """基于对比结果进行流式追问"""
    model = model.strip()
    history = history or []
    system_prompt = prompt_override or (
        "你是一个专业的题库审核助手。请基于已有 AB 对比结果、生成题目和原始需求回答用户追问。"
        "回答必须使用 Markdown，结论明确，必要时给出可执行的修改建议。"
        "如果上下文不足，请直接说明缺少哪些信息，不要编造。"
    )
    context_prompt = f"""以下是当前审核上下文：

## 已有对比结果
{compare_result or '暂无'}

## 文件 A（生成的题目）
{file_a or '暂无'}

## 文件 B（原始需求）
{file_b or '暂无'}

请回答用户追问：{question}
"""

    messages = [{'role': 'system', 'content': system_prompt}]
    for item in history[-8:]:
        role = item.get('role')
        content = item.get('content')
        if role in ('user', 'assistant') and content:
            messages.append({'role': role, 'content': content})
    messages.append({'role': 'user', 'content': context_prompt})

    debug_id = None
    async for event in stream_chat_completion('compareChat', api_url, api_key, model, messages, timeout=300.0):
        etype = event.get('type')
        if etype == 'record':
            debug_id = event.get('id')
        elif etype == 'text':
            yield f"data: {json.dumps({'text': event['text']}, ensure_ascii=False)}\n\n"
        elif etype == 'error':
            yield f"data: {json.dumps({'error': event['error'], 'debugId': debug_id}, ensure_ascii=False)}\n\n"
            return
    yield f"data: {json.dumps({'debugId': debug_id}, ensure_ascii=False)}\n\n"
