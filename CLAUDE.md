# CLAUDE.md

This file gives Claude Code repository-specific guidance for QBank2Xlsx.

## Project Overview

QBank2Xlsx is a FastAPI-based question bank generator with a browser UI. It calls AI-compatible chat/completions APIs to generate Chinese exam questions, previews the streamed result, and exports questions to Excel or Word templates.

The application supports these question types: 单选题, 多选题, 不定项选择题, 判断题, 填空题, 简答题, 排序题, 计算题, 论述题.

## Repository Layout

Keep the repository root clean. Root-level files should be limited to the application entry point, launch scripts, README, and tool guidance files.

```text
app.py                    FastAPI entry point
start..command            macOS/Linux launcher
start.bat                 Windows launcher
README.md                 User documentation
CLAUDE.md                 Claude Code guidance

src/qbank2xlsx/           Python application package
web/                      HTML pages and static frontend assets
data/                     Stable example and seed data
resources/templates/      Excel and Word export templates
runtime/                  Local runtime state: keys, logs, optional prompts
outputs/                  Generated output files
tools/                    Maintenance scripts and dependency manifest
docs/                     Secondary documentation
```

Important paths:

- Dependencies: `tools/requirements.txt`
- Main UI: `web/index.html`
- Frontend assets: `web/static/app.js`, `web/static/styles.css`, `web/static/themes.js`
- Demo questions: `data/demo_questions.json`
- Export templates: `resources/templates/`
- Runtime logs: `runtime/logs/api.log`
- Runtime keys: `runtime/key.txt`, `runtime/transport_private_key.pem`
- Optional prompt override: `runtime/system_prompt.txt`

## Running The Application

Use the launch scripts from the repository root:

```bash
./start..command
```

```bat
start.bat
```

Manual startup:

```bash
python3 -m pip install -r tools/requirements.txt
python3 app.py --http2
```

HTTP/2 mode uses Hypercorn and is the recommended local mode. The app listens on port `8111`.

For HTTP/1.1 fallback:

```bash
python3 app.py
```

Access the app at `http://localhost:8111`.

## Architecture

`app.py` is intentionally kept as the root entry point. It adds `src/` to `sys.path`, mounts `/static` from `web/static`, serves `web/index.html`, and exposes the API routes.

`src/qbank2xlsx/ai_service.py` owns AI calls and streaming behavior. It builds prompts from `data/demo_questions.json`, records debug metadata through `ai_debug.py`, and supports generation, directory extraction, filename generation, API testing, and comparison chat.

`src/qbank2xlsx/excel_service.py` owns Excel/Word import and export behavior. It reads templates from `resources/templates/` and normalizes between the standard template and the 答题帮手 template.

`src/qbank2xlsx/paths.py` is the canonical place for filesystem paths. When adding a new persistent file location, add it there instead of hardcoding root-relative strings in services.

`src/qbank2xlsx/logger.py` writes request logs to `runtime/logs/api.log`. `src/qbank2xlsx/utils.py` manages local encryption keys and the optional prompt override in `runtime/`.

## Data Flow

1. The user configures API URL, API key, and model in the web UI.
2. The frontend encrypts credentials for transport and stores local UI settings in the browser.
3. The backend loads examples from `data/demo_questions.json` for the selected question types.
4. `ai_service.py` streams generated content back to `web/static/app.js`.
5. The frontend extracts JSON, previews questions, and allows edits.
6. `excel_service.py` exports the final questions to Excel or Word.

## Question Data Contract

The standard schema is a JSON object with a `questions` array. Each question should use the project headers, especially:

- `题干（必填）`
- `题型 （必填）`
- `正确答案\n（必填）`
- `解析\n（勿删）`
- `章节\n（勿删）`
- `难度`

Choice options use `选项 A` through `选项H\n(勿删)`. `data/demo_questions.json` must include at least one valid example per supported question type because it drives both UI samples and AI prompt examples.

Answer conventions:

- Choice answers use option letters such as `A` or `ABCD`.
- 判断题 uses `A` for true and `B` for false in the standard format.
- 排序题 uses an ordered letter sequence such as `DBAC`.
- Subjective answers go in `正确答案\n（必填）`.

## Development Rules

- Prefer package imports under `qbank2xlsx.*`; avoid importing sibling modules by bare filename.
- Do not hardcode paths like `demo_questions.json`, `templates`, `log`, or `key.txt`; use `src/qbank2xlsx/paths.py`.
- Keep generated files in `outputs/` and runtime-only files in `runtime/`.
- Do not move stable templates out of `resources/templates/`.
- When changing `web/index.html`, `web/static/app.js`, or `web/static/styles.css`, bump the query string versions in `web/index.html` for `/static/app.js?v=...` and `/static/styles.css?v=...`.
- After path or import changes, run `python3 -m compileall app.py src/qbank2xlsx`.
