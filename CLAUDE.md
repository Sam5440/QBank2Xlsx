# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QBank2Xlsx is an AI-powered exam question bank management system with a FastAPI backend and web UI. It generates exam questions using AI models (OpenAI, Claude, etc.) and exports them to Excel format. The system handles 9 Chinese question types with streaming generation and real-time preview.

## Running the Application

### Start Server (Windows)
```bash
start.bat
```
Auto-installs dependencies, starts HTTP/2 server on port 8111, opens browser.

### Start Server (Manual)
```bash
# Install dependencies
pip install -r requirements.txt

# HTTP/1.1 mode (max 6 concurrent connections)
python app.py

# HTTP/2 mode (unlimited concurrent, recommended)
python app.py --http2
```

Access at: `http://localhost:8111`

### Standalone Excel Generation
```bash
python generate_excel.py
```
Converts `demo_questions.json` → `generated_exam.xlsx`

## Architecture

### Core Components

**app.py** - FastAPI application with middleware for logging
- API endpoints for generation, export, directory extraction, filename generation, file comparison
- Middleware logs all requests/responses to `log/` directory
- Supports both HTTP/1.1 (uvicorn) and HTTP/2 (hypercorn) modes

**ai_service.py** - AI integration layer
- `generate_questions_stream()`: Streams question generation from AI with real-time output
- `extract_directory()`: Extracts chapter/section structure from user input
- `generate_filename()`: Creates meaningful filenames based on content
- `compare_files_stream()`: AI-powered comparison of generated vs. original requirements
- Uses `demo_questions.json` to provide format examples to AI based on selected question types

**excel_service.py** - Excel export functionality
- Converts JSON questions to Excel with styling (宋体 font, borders, colors)
- Creates temporary files for download

**config.py** - Prompt templates
- `DEFAULT_SYSTEM_PROMPT`: Main template for question generation (uses `{{json_example}}` and `{{TOP}}` placeholders)
- `DIRECTORY_EXTRACTION_PROMPT`, `FILENAME_GENERATION_PROMPT`, `COMPARE_PROMPT`

**header_utils.py** - Question type detection
- `get_question_type()`: Extracts question type from various field name formats

**logger.py** - Request/response logging
- Logs API calls to timestamped files in `log/` directory

**utils.py** - Utility functions
- `get_or_create_key()`: Manages encryption key for API key storage
- `load_system_prompt()`: Loads system prompt from file or uses default

**index.html** - Single-page web UI
- Real-time streaming display of generated questions
- API key encryption using CryptoJS (AES)
- Question editing, preview, and export functionality

### Data Flow

1. User configures API settings (URL, key, model) in web UI → encrypted and stored in localStorage
2. User selects question types → system loads matching examples from `demo_questions.json`
3. User inputs requirements → optionally extracts directory structure via AI
4. Click "Generate" → `ai_service.py` builds prompt with examples and streams to frontend
5. Frontend parses JSON from AI response and displays questions in real-time
6. Click "Export" → `excel_service.py` converts to Excel with proper formatting

### Question Type System

The system supports 9 question types (题型):
- 单选题 (single choice), 多选题 (multiple choice), 不定项选择题 (uncertain choice)
- 判断题 (true/false), 填空题 (fill-in-blank), 简答题 (short answer)
- 排序题 (sorting), 计算题 (calculation), 论述题 (essay)

**Critical**: `demo_questions.json` must contain at least one example of each question type. The system uses `get_question_type()` to match questions by their "题型" field value.

## Data Schema

14-column structure (3 required fields):
1. **题干（必填）** - Question text (required)
2. **题型 （必填）** - Question type (required)
3-10. **选项 A-H** - Options A through H (E-H marked "勿删")
11. **正确答案（必填）** - Correct answer (required)
12. **解析（勿删）** - Explanation
13. **章节（勿删）** - Chapter/section
14. **难度** - Difficulty: 易, 偏易, 适中, 难

### Answer Format by Type
- Single/multiple/uncertain choice: Letter(s) like "A" or "ABCD"
- True/False: "A" (true) or "B" (false)
- Fill-in-blank: Answer in 选项 A or 正确答案
- Short answer/calculation/essay: Answer in 正确答案
- Sorting: Letter sequence like "DBAC"

### JSON Structure
```json
{
  "questions": [
    {
      "题干（必填）": "question text",
      "题型 （必填）": "单选题",
      "选项 A": "option text",
      "正确答案（必填）": "A",
      "难度": "适中"
    }
  ]
}
```

## Key Implementation Notes

- **Port**: Default is 8111 (not 8000 as mentioned in some docs)
- **Encryption**: API keys encrypted client-side with AES before localStorage storage
- **Logging**: All API calls logged to `log/YYYY-MM-DD.log` with request/response bodies
- **Excel styling**: Header row light blue (#B4C7E7), 宋体 font size 11, borders on all cells
- **Question type detection**: Handles variations in field names (spaces, newlines in "题型 （必填）")
- **Demo data**: `demo_questions.json` serves dual purpose: UI preview and AI format examples
