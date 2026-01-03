#!/usr/bin/env python
# -*- coding: utf-8 -*-
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse
from pydantic import BaseModel
import json
import os
from generate_excel import create_excel_from_json
import httpx
import tempfile
import asyncio
import secrets

app = FastAPI()

# 加密密钥（用于前端加密/解密）
def get_or_create_key():
    if os.path.exists('key.txt'):
        with open('key.txt', 'r') as f:
            return f.read().strip()
    else:
        key = secrets.token_urlsafe(32)
        with open('key.txt', 'w') as f:
            f.write(key)
        return key

ENCRYPTION_KEY = get_or_create_key()

class GenerateRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str
    questionTypes: list
    userInput: str
    systemPrompt: str = ""
    directory: str = ""

class ExportRequest(BaseModel):
    questions: list

class AIRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str
    content: str

@app.get("/", response_class=HTMLResponse)
async def index():
    with open('index.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.get("/api/encryption-key")
async def get_encryption_key():
    """返回加密密钥供前端使用"""
    return {"key": ENCRYPTION_KEY}

@app.post("/api/generate")
async def generate_questions(req: GenerateRequest):
    """使用 AI 流式生成题目"""
    with open('demo_questions.json', 'r', encoding='utf-8') as f:
        demo_data = json.load(f)

    # 为每个题型准备示例
    examples_text = ""
    for qtype in req.questionTypes:
        examples = [q for q in demo_data['questions'] if q['题型 （必填）'] == qtype]
        if examples:
            examples_text += f"\n{qtype}示例：\n{json.dumps(examples[0], ensure_ascii=False, indent=2)}\n"

    # 使用自定义系统提示词或默认提示词
    system_prompt = req.systemPrompt if req.systemPrompt else f"""你是一个专业的题库生成助手。请严格按照以下JSON格式生成题目，必须用```json代码块包裹：

{{{{json_example}}}}

目录结构：
{{{{TOP}}}}

输出格式要求：
1. 必须使用```json代码块包裹JSON内容
2. JSON格式必须严格符合示例
3. 所有字段名必须与示例完全一致
4. 返回格式：{{"questions": [...]}}
5. 如果题目没有解析内容，必须生成详细的解析说明
6. 根据目录结构匹配合适的章节"""

    # 替换占位符
    system_prompt = system_prompt.replace('{{json_example}}', examples_text)
    system_prompt = system_prompt.replace('{{TOP}}', req.directory if req.directory else '无')

    user_prompt = f"""用户需求：
{req.userInput}

请按照system prompt中的格式要求生成题目。"""

    async def generate():
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    'POST',
                    f"{req.apiUrl}/chat/completions",
                    headers={'Authorization': f'Bearer {req.apiKey}', 'Content-Type': 'application/json'},
                    json={'model': req.model, 'messages': [{'role': 'system', 'content': system_prompt}, {'role': 'user', 'content': user_prompt}], 'stream': True}
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
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.post("/api/export")
async def export_excel(req: ExportRequest):
    """导出 Excel 文件"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        json.dump({'questions': req.questions}, f, ensure_ascii=False, indent=2)
        json_path = f.name

    excel_path = tempfile.mktemp(suffix='.xlsx')

    try:
        create_excel_from_json(json_path, excel_path)
        return FileResponse(excel_path, filename='exam_questions.xlsx', media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    finally:
        if os.path.exists(json_path):
            os.unlink(json_path)

@app.post("/api/extract-directory")
async def extract_directory(req: AIRequest):
    """使用 AI 提取目录结构"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{req.apiUrl}/chat/completions",
                headers={'Authorization': f'Bearer {req.apiKey}', 'Content-Type': 'application/json'},
                json={
                    'model': req.model,
                    'messages': [
                        {'role': 'system', 'content': '你是一个专业的内容分析助手。请根据用户提供的题目需求，提取或生成合适的目录结构。目录应该简洁明了，使用层级结构。'},
                        {'role': 'user', 'content': f'请根据以下内容提取或生成目录结构：\n\n{req.content}\n\n请直接输出目录结构，不要有其他说明文字。'}
                    ],
                    'stream': False
                }
            )
            data = response.json()
            if 'choices' in data and len(data['choices']) > 0:
                directory = data['choices'][0]['message']['content'].strip()
                return {"directory": directory}
            else:
                return {"error": "无法提取目录"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/generate-filename")
async def generate_filename(req: AIRequest):
    """使用 AI 生成文件名"""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{req.apiUrl}/chat/completions",
                headers={'Authorization': f'Bearer {req.apiKey}', 'Content-Type': 'application/json'},
                json={
                    'model': req.model,
                    'messages': [
                        {'role': 'system', 'content': '你是一个专业的文件命名助手。请根据用户提供的题目需求，生成一个简洁、有意义的文件名（不包含扩展名）。文件名应该使用英文或拼音，用下划线或连字符分隔。'},
                        {'role': 'user', 'content': f'请根据以下内容生成一个合适的文件名：\n\n{req.content}\n\n请直接输出文件名，不要有其他说明文字，不要包含扩展名。'}
                    ],
                    'stream': False
                }
            )
            data = response.json()
            if 'choices' in data and len(data['choices']) > 0:
                filename = data['choices'][0]['message']['content'].strip()
                return {"filename": filename}
            else:
                return {"error": "无法生成文件名"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
