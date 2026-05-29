#!/usr/bin/env python
# -*- coding: utf-8 -*-
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import asyncio
import os
import time
import json
import base64
import uuid
from cryptography.hazmat.primitives.asymmetric import padding
from utils import get_or_create_key, get_or_create_transport_private_key, get_transport_public_key_pem
from ai_service import generate_questions_stream, extract_directory, generate_filename, match_question_types, compare_files_stream, compare_chat_stream, test_api_connection
from excel_service import convert_questions, export_to_excel, export_to_word, parse_excel_to_questions
from logger import log_api_call
from header_utils import get_question_type

app = FastAPI()
BATCH_STREAM_JOBS = {}
BATCH_STREAM_JOB_TTL_SECONDS = 3600
app.mount("/static", StaticFiles(directory="static"), name="static")


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


def now_ts():
    return time.time()


def new_batch_stream_item_state(item):
    return {
        "id": item.get("id"),
        "text": item.get("text", ""),
        "status": "queued",
        "full": "",
        "editable": "",
        "questionCount": 0,
        "charCount": 0,
        "error": None,
        "updatedAt": now_ts()
    }


def summarize_batch_stream_job(job):
    results = list(job["results"].values())
    success_count = len([item for item in results if item.get("status") == "done" and not item.get("error")])
    failed_count = len([item for item in results if item.get("status") in ("error", "cancelled") or item.get("error")])
    completed_count = len([item for item in results if item.get("status") in ("done", "error", "cancelled")])
    return {
        "jobId": job["id"],
        "status": job["status"],
        "total": len(results),
        "completedCount": completed_count,
        "successCount": success_count,
        "failedCount": failed_count,
        "createdAt": job["createdAt"],
        "updatedAt": job["updatedAt"],
        "results": results
    }


def cleanup_batch_stream_jobs():
    cutoff = now_ts() - BATCH_STREAM_JOB_TTL_SECONDS
    stale_job_ids = [
        job_id for job_id, job in BATCH_STREAM_JOBS.items()
        if job.get("status") in ("done", "error", "cancelled") and job.get("updatedAt", 0) < cutoff
    ]
    for job_id in stale_job_ids:
        BATCH_STREAM_JOBS.pop(job_id, None)


def parse_stream_chunk_text(chunk):
    if not chunk.startswith("data: "):
        return None
    try:
        data = json.loads(chunk[6:].strip())
    except Exception:
        return None
    if data.get("error"):
        raise RuntimeError(data["error"])
    return data.get("text")


async def run_batch_stream_job(job_id, api_url, api_key, model, question_types, items, system_prompt, directory, concurrency):
    job = BATCH_STREAM_JOBS[job_id]
    try:
        concurrency = int(concurrency)
    except Exception:
        concurrency = 20
    concurrency = max(1, concurrency)
    semaphore = asyncio.Semaphore(concurrency)
    job["status"] = "running"
    job["updatedAt"] = now_ts()

    async def generate_one(item):
        item_id = item.get("id")
        state = job["results"][item_id]
        user_input = (item.get("text") or "").strip()
        if not user_input:
            state.update({
                "status": "error",
                "error": "输入内容为空",
                "updatedAt": now_ts()
            })
            return

        async with semaphore:
            if job["cancelEvent"].is_set():
                state.update({"status": "cancelled", "error": "已取消", "updatedAt": now_ts()})
                return

            state.update({"status": "running", "updatedAt": now_ts()})
            try:
                async for chunk in generate_questions_stream(
                    api_url,
                    api_key,
                    model,
                    question_types,
                    user_input,
                    system_prompt,
                    directory
                ):
                    if job["cancelEvent"].is_set():
                        state.update({"status": "cancelled", "error": "已取消", "updatedAt": now_ts()})
                        return

                    text = parse_stream_chunk_text(chunk)
                    if text:
                        state["full"] += text
                        state["charCount"] = len(state["full"])
                        state["updatedAt"] = now_ts()

                editable = ""
                question_count = 0
                if state["full"]:
                    from ai_service import extract_json_content
                    editable = extract_json_content(state["full"])
                    if editable:
                        try:
                            question_count = len(json.loads(editable).get("questions", []))
                        except Exception:
                            question_count = 0
                state.update({
                    "status": "done",
                    "editable": editable,
                    "questionCount": question_count,
                    "charCount": len(state["full"]),
                    "updatedAt": now_ts()
                })
            except asyncio.CancelledError:
                state.update({"status": "cancelled", "error": "已取消", "updatedAt": now_ts()})
                raise
            except Exception as e:
                state.update({
                    "status": "error",
                    "error": str(e),
                    "updatedAt": now_ts()
                })

    try:
        await asyncio.gather(*(generate_one(item) for item in items))
        job["status"] = "cancelled" if job["cancelEvent"].is_set() else "done"
    except asyncio.CancelledError:
        job["status"] = "cancelled"
        for state in job["results"].values():
            if state.get("status") in ("queued", "running"):
                state.update({"status": "cancelled", "error": "已取消", "updatedAt": now_ts()})
    except Exception as e:
        job["status"] = "error"
        job["error"] = str(e)
    finally:
        job["updatedAt"] = now_ts()


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
    template: str = "standard"


class ImportTemplateFileRequest(BaseModel):
    fileName: str
    contentBase64: str


class ConvertTemplateRequest(BaseModel):
    questions: list
    targetTemplate: str


class AIRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str
    content: str
    prompt: str = ""


class MatchQuestionTypesRequest(AIRequest):
    questionTypes: list


class CompareRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str
    fileA: str
    fileB: str
    prompt: str = ""
    mode: str = "review"
    useContextCache: bool = False


class CompareChatRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str
    compareResult: str
    question: str
    fileA: str = ""
    fileB: str = ""
    prompt: str = ""
    history: list = Field(default_factory=list)


class TestApiRequest(BaseModel):
    apiUrl: str
    apiKey: str
    model: str


async def handle_ai_request(ai_func, req: AIRequest, result_key: str, error_msg: str):
    """通用 AI 请求处理函数"""
    try:
        api_url, api_key = resolve_api_credentials(req)
        result = await ai_func(api_url, api_key, req.model, req.content, req.prompt)
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


@app.post("/api/generate-batch-stream/start")
async def start_generate_questions_batch_stream(req: GenerateBatchRequest):
    cleanup_batch_stream_jobs()
    try:
        api_url, api_key = resolve_api_credentials(req)
        items = [item.dict() for item in req.items]
        job_id = uuid.uuid4().hex
        created_at = now_ts()
        job = {
            "id": job_id,
            "status": "queued",
            "createdAt": created_at,
            "updatedAt": created_at,
            "results": {item.get("id"): new_batch_stream_item_state(item) for item in items},
            "cancelEvent": asyncio.Event(),
            "task": None,
            "error": None
        }
        BATCH_STREAM_JOBS[job_id] = job
        job["task"] = asyncio.create_task(run_batch_stream_job(
            job_id,
            api_url,
            api_key,
            req.model,
            req.questionTypes,
            items,
            req.systemPrompt,
            req.directory,
            req.concurrency
        ))
        return summarize_batch_stream_job(job)
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/generate-batch-stream/{job_id}/progress")
async def get_generate_questions_batch_stream_progress(job_id: str):
    job = BATCH_STREAM_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="生成任务不存在或已过期")
    return summarize_batch_stream_job(job)


@app.delete("/api/generate-batch-stream/{job_id}")
async def cancel_generate_questions_batch_stream(job_id: str):
    job = BATCH_STREAM_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="生成任务不存在或已过期")
    job["cancelEvent"].set()
    job["status"] = "cancelled"
    job["updatedAt"] = now_ts()
    task = job.get("task")
    if task and not task.done():
        task.cancel()
    for state in job["results"].values():
        if state.get("status") in ("queued", "running"):
            state.update({"status": "cancelled", "error": "已取消", "updatedAt": now_ts()})
    return summarize_batch_stream_job(job)


@app.delete("/api/generate-batch-stream")
async def cancel_all_generate_questions_batch_stream():
    cancelled = []
    for job_id, job in list(BATCH_STREAM_JOBS.items()):
        if job.get("status") in ("done", "error", "cancelled"):
            continue
        job["cancelEvent"].set()
        job["status"] = "cancelled"
        job["updatedAt"] = now_ts()
        task = job.get("task")
        if task and not task.done():
            task.cancel()
        for state in job["results"].values():
            if state.get("status") in ("queued", "running"):
                state.update({"status": "cancelled", "error": "已取消", "updatedAt": now_ts()})
        cancelled.append(job_id)
    return {"cancelled": cancelled, "count": len(cancelled)}


@app.post("/api/export")
async def export_excel(req: ExportRequest):
    excel_path, json_path = export_to_excel(req.questions, req.template)
    try:
        return FileResponse(excel_path, filename='exam_questions.xlsx', media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    finally:
        if os.path.exists(json_path):
            os.unlink(json_path)


@app.post("/api/export-word")
async def export_word(req: ExportRequest):
    word_path = export_to_word(req.questions)
    return FileResponse(word_path, filename='exam_questions.docx', media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')


@app.post("/api/import-template-file")
async def import_template_file(req: ImportTemplateFileRequest):
    try:
        raw = base64.b64decode(req.contentBase64)
        file_name = req.fileName.lower()
        if file_name.endswith(".json"):
            data = json.loads(raw.decode("utf-8-sig"))
            questions = data.get("questions", data if isinstance(data, list) else [])
            if not isinstance(questions, list):
                raise ValueError("JSON 文件中没有 questions 数组")
            return {"sourceTemplate": "json", "questions": convert_questions(questions, "standard")}
        if file_name.endswith(".xlsx"):
            return parse_excel_to_questions(raw)
        raise ValueError("仅支持导入 .json 或 .xlsx 文件")
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/convert-template")
async def convert_template(req: ConvertTemplateRequest):
    try:
        converted = convert_questions(req.questions, req.targetTemplate)
        return {"questions": converted, "targetTemplate": req.targetTemplate}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/extract-directory")
async def extract_directory_endpoint(req: AIRequest):
    return await handle_ai_request(extract_directory, req, "directory", "无法提取目录")


@app.post("/api/generate-filename")
async def generate_filename_endpoint(req: AIRequest):
    return await handle_ai_request(generate_filename, req, "filename", "无法生成文件名")


@app.post("/api/match-question-types")
async def match_question_types_endpoint(req: MatchQuestionTypesRequest):
    try:
        api_url, api_key = resolve_api_credentials(req)
        matched = await match_question_types(api_url, api_key, req.model, req.content, req.questionTypes, req.prompt)
        return {"questionTypes": matched}
    except Exception as e:
        return {"error": str(e)}


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
            async for chunk in compare_files_stream(
                api_url,
                api_key,
                req.model,
                req.fileA,
                req.fileB,
                req.prompt,
                req.mode,
                req.useContextCache
            ):
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
                req.history,
                req.prompt
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
        import subprocess
        sys.exit(subprocess.call([sys.executable, '-m', 'hypercorn', 'app:app', '--bind', '0.0.0.0:8111']))
    else:
        print("启动 HTTP/1.1 服务器（最多 6 个并发连接）...")
        print("提示：使用 'python app.py --http2' 启用 HTTP/2 支持")
        import uvicorn
        uvicorn.run(app, host=host_ip, port=8111)
