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

class ExportRequest(BaseModel):
    questions: list

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

    system_prompt = f"""你是一个专业的题库生成助手。请严格按照以下JSON格式生成题目，必须用```json代码块包裹：

{examples_text}

输出格式要求：
1. 必须使用```json代码块包裹JSON内容
2. JSON格式必须严格符合示例
3. 所有字段名必须与示例完全一致
4. 返回格式：{{"questions": [...]}}"""

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

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
