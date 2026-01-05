#!/usr/bin/env python
# -*- coding: utf-8 -*-
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse
from pydantic import BaseModel
import os
import time
import json
from utils import get_or_create_key
from ai_service import generate_questions_stream, extract_directory, generate_filename, compare_files_stream
from excel_service import export_to_excel
from logger import log_api_call

app = FastAPI()


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    # 读取请求体
    request_body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                request_body = json.loads(body.decode())
                # 隐藏敏感信息
                if isinstance(request_body, dict) and 'apiKey' in request_body:
                    request_body = {**request_body, 'apiKey': '***'}
        except:
            pass

    # 调用实际的路由处理
    response = await call_next(request)

    # 计算耗时
    duration_ms = int((time.time() - start_time) * 1000)

    # 捕获响应体
    response_body = None
    if response.headers.get("content-type") == "application/json":
        from fastapi.responses import Response
        body_bytes = b""
        async for chunk in response.body_iterator:
            body_bytes += chunk
        try:
            response_body = json.loads(body_bytes.decode())
        except:
            pass
        response = Response(content=body_bytes, status_code=response.status_code, headers=dict(response.headers), media_type=response.media_type)

    # 记录日志（排除静态文件）
    if not request.url.path.startswith('/static'):
        log_api_call(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            request_body=request_body,
            response_body=response_body,
            duration_ms=duration_ms
        )

    return response

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


class CompareRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str
    fileA: str
    fileB: str


async def handle_ai_request(ai_func, req: AIRequest, result_key: str, error_msg: str):
    """通用 AI 请求处理函数"""
    try:
        result = await ai_func(req.apiUrl, req.apiKey, req.model, req.content)
        # print(result)
        log_api_call(
            method="POST",
            path="/api/ai",
            status_code=200,
            request_body=req.dict(),
            response_body=result,
            duration_ms=0
        )
        return {result_key: result} if result else {"error": error_msg}
    except Exception as e:
        return {"error": str(e)}


@app.get("/", response_class=HTMLResponse)
async def index():
    with open('index.html', 'r', encoding='utf-8') as f:
        return f.read()


@app.get("/api/encryption-key")
async def get_encryption_key():
    return {"key": ENCRYPTION_KEY}


@app.get("/api/system-prompt")
async def get_system_prompt():
    from utils import load_system_prompt
    return {"systemPrompt": load_system_prompt()}


@app.get("/api/question-types")
async def get_question_types():
    import json
    try:
        with open('demo_questions.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            types = []
            for q in data.get('questions', []):
                # 查找第一个包含"题型"的键
                question_type = None
                for key, value in q.items():
                    if '题型' in key:
                        question_type = value
                        break
                if question_type:
                    types.append(question_type)
            # 如果出现重复，添加提示
            notice_tip = None
            if len(types) != len(set(types)):
                same_types = [t for t in types if types.count(t) > 1]
                notice_tip = f"（重复题型出现！！！可能无法正常匹配！）[{', '.join(same_types)}]"
            # 去重
            types = list(set(types))
            return {"questionTypes": types, "sampleData": data, "noticeTip": notice_tip}
    except Exception as e:
        return {"error": str(e), "questionTypes": [], "sampleData": {}, "noticeTip": None}


@app.post("/api/generate")
async def generate_questions(req: GenerateRequest):
    async def generate():
        try:
            async for chunk in generate_questions_stream(req.apiUrl, req.apiKey, req.model, req.questionTypes, req.userInput, req.systemPrompt, req.directory):
                yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/export")
async def export_excel(req: ExportRequest):
    excel_path, json_path = export_to_excel(req.questions)
    try:
        return FileResponse(excel_path, filename='exam_questions.xlsx', media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    finally:
        if os.path.exists(json_path):
            os.unlink(json_path)


@app.post("/api/extract-directory")
async def extract_directory_endpoint(req: AIRequest):
    return await handle_ai_request(extract_directory, req, "directory", "无法提取目录")


@app.post("/api/generate-filename")
async def generate_filename_endpoint(req: AIRequest):
    return await handle_ai_request(generate_filename, req, "filename", "无法生成文件名")


@app.post("/api/compare")
async def compare_files(req: CompareRequest):
    async def generate():
        try:
            async for chunk in compare_files_stream(req.apiUrl, req.apiKey, req.model, req.fileA, req.fileB):
                yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == '__main__':
    import sys

    # 检查是否使用 hypercorn（支持 HTTP/2）
    if '--http2' in sys.argv:
        print("启动 HTTP/2 服务器（支持无限并发连接）...")
        import os
        os.system('hypercorn app:app --bind 0.0.0.0:8111')
    else:
        print("启动 HTTP/1.1 服务器（最多 6 个并发连接）...")
        print("提示：使用 'python app.py --http2' 启用 HTTP/2 支持")
        import uvicorn
        uvicorn.run(app, host='0.0.0.0', port=8111)
