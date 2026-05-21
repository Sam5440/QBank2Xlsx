#!/usr/bin/env python
# -*- coding: utf-8 -*-
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse, Response
from pydantic import BaseModel, Field
import os
import time
import json
import base64
from cryptography.hazmat.primitives.asymmetric import padding
from utils import get_or_create_key, get_or_create_transport_private_key, get_transport_public_key_pem
from ai_service import generate_questions_stream, generate_questions_batch, extract_directory, generate_filename, compare_files_stream, compare_chat_stream, test_api_connection
from excel_service import export_to_excel
from logger import log_api_call
from header_utils import get_question_type

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
                if isinstance(request_body, dict):
                    request_body = {**request_body}
                    for field in ('apiKey', 'apiUrl'):
                        if field in request_body:
                            request_body[field] = '***'
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
TRANSPORT_PRIVATE_KEY = get_or_create_transport_private_key()
TRANSPORT_PUBLIC_KEY = get_transport_public_key_pem(TRANSPORT_PRIVATE_KEY)


def decrypt_transport_value(value: str) -> str:
    """Decrypt an RSA-OAEP transport value."""
    if not value:
        return value
    try:
        cipher_bytes = base64.b64decode(value)
        plain_bytes = TRANSPORT_PRIVATE_KEY.decrypt(cipher_bytes, padding.PKCS1v15())
        return plain_bytes.decode('utf-8')
    except Exception as exc:
        raise ValueError("API URL/API Key must be RSA-OAEP encrypted") from exc


def resolve_api_credentials(req):
    return decrypt_transport_value(req.apiUrl), decrypt_transport_value(req.apiKey)


def mask_api_request(req):
    data = req.dict()
    for field in ('apiKey', 'apiUrl'):
        if field in data:
            data[field] = '***'
    return data


class GenerateRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str
    questionTypes: list
    userInput: str
    systemPrompt: str = ""
    directory: str = ""


class GenerateBatchItem(BaseModel):
    id: int
    text: str


class GenerateBatchRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str
    questionTypes: list
    items: list[GenerateBatchItem]
    systemPrompt: str = ""
    directory: str = ""
    concurrency: int = 20


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


class CompareChatRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str
    compareResult: str
    question: str
    fileA: str = ""
    fileB: str = ""
    history: list = Field(default_factory=list)


class TestApiRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str


async def handle_ai_request(ai_func, req: AIRequest, result_key: str, error_msg: str):
    """通用 AI 请求处理函数"""
    try:
        api_url, api_key = resolve_api_credentials(req)
        result = await ai_func(api_url, api_key, req.model, req.content)
        # print(result)
        log_api_call(
            method="POST",
            path="/api/ai",
            status_code=200,
            request_body=mask_api_request(req),
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


@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)


@app.get("/themes.js")
async def get_themes_js():
    """Serve themes.js static file"""
    return FileResponse('themes.js', media_type='application/javascript')


@app.get("/theme-test.html", response_class=HTMLResponse)
async def theme_test():
    """Serve theme test page"""
    with open('theme-test.html', 'r', encoding='utf-8') as f:
        return f.read()


@app.get("/api/encryption-key")
async def get_encryption_key():
    return {"key": ENCRYPTION_KEY}


@app.get("/api/transport-public-key")
async def get_transport_public_key():
    public_numbers = TRANSPORT_PRIVATE_KEY.public_key().public_numbers()
    return {
        "publicKey": TRANSPORT_PUBLIC_KEY,
        "algorithm": "RSAES-PKCS1-v1_5",
        "modulus": format(public_numbers.n, "x"),
        "exponent": format(public_numbers.e, "x")
    }


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
            seen_types = set()
            for q in data.get('questions', []):
                question_type = get_question_type(q)
                if question_type and question_type not in seen_types:
                    types.append(question_type)
                    seen_types.add(question_type)
            return {"questionTypes": types, "sampleData": data, "noticeTip": None}
    except Exception as e:
        return {"error": str(e), "questionTypes": [], "sampleData": {}, "noticeTip": None}


@app.post("/api/generate")
async def generate_questions(req: GenerateRequest):
    async def generate():
        try:
            api_url, api_key = resolve_api_credentials(req)
            async for chunk in generate_questions_stream(api_url, api_key, req.model, req.questionTypes, req.userInput, req.systemPrompt, req.directory):
                yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/generate-batch")
async def generate_questions_batch_endpoint(req: GenerateBatchRequest):
    try:
        api_url, api_key = resolve_api_credentials(req)
        results = await generate_questions_batch(
            api_url,
            api_key,
            req.model,
            req.questionTypes,
            [item.dict() for item in req.items],
            req.systemPrompt,
            req.directory,
            req.concurrency
        )
        success_count = len([result for result in results if not result.get('error')])
        return {
            "results": results,
            "total": len(results),
            "successCount": success_count,
            "failedCount": len(results) - success_count
        }
    except Exception as e:
        return {"error": str(e)}


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


@app.post("/api/test-api")
async def test_api_endpoint(req: TestApiRequest):
    try:
        api_url, api_key = resolve_api_credentials(req)
        result = await test_api_connection(api_url, api_key, req.model)
        return {"ok": True, "message": result or "OK"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/api/compare")
async def compare_files(req: CompareRequest):
    async def generate():
        try:
            api_url, api_key = resolve_api_credentials(req)
            async for chunk in compare_files_stream(api_url, api_key, req.model, req.fileA, req.fileB):
                yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/compare-chat")
async def compare_chat(req: CompareChatRequest):
    async def generate():
        try:
            api_url, api_key = resolve_api_credentials(req)
            async for chunk in compare_chat_stream(
                api_url,
                api_key,
                req.model,
                req.compareResult,
                req.question,
                req.fileA,
                req.fileB,
                req.history
            ):
                yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == '__main__':
    import sys

    # 检查是否使用 hypercorn（支持 HTTP/2）
    # 获取本机局域网 IP
    import socket
    host_ip = '0.0.0.0'
    lan_ip = '127.0.0.1'
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        lan_ip = s.getsockname()[0]
        s.close()
    except:
        pass

    if '--http2' in sys.argv:
        print("启动 HTTP/2 服务器（支持无限并发连接）...")
        import os
        os.system('hypercorn app:app --bind 0.0.0.0:8111')
    else:
        print("启动 HTTP/1.1 服务器（最多 6 个并发连接）...")
        print("提示：使用 'python app.py --http2' 启用 HTTP/2 支持")
        import uvicorn
        uvicorn.run(app, host=host_ip, port=8111)
