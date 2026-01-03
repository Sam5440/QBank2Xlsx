# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an exam question bank management system that converts between Excel and JSON formats. It handles Chinese exam questions with multiple question types including single-choice, multiple-choice, true/false, fill-in-blank, short answer, sorting, calculation, and essay questions.

## Core Scripts

### generate_excel.py
Converts JSON question data to Excel format with proper styling and formatting.

**Usage:**
```bash
python generate_excel.py
```

**Input:** `demo_questions.json` (or modify the script to use a different JSON file)
**Output:** `generated_exam.xlsx`

The script creates a formatted Excel file with:
- Header row with light blue background (color: B4C7E7)
- 14 columns matching the question bank schema
- Proper borders, fonts (宋体), and cell alignment
- Automatic column width adjustment

### extract_structure.py
Analyzes an existing Excel file to extract and display its structure.

**Usage:**
```bash
python extract_structure.py
```

**Input:** `kaoshibaoExcel20221101.xlsx`
**Output:** Console output showing table structure and first 15 rows

### analyze_excel.py
Extracts all data from an Excel file and saves it as JSON.

**Usage:**
```bash
python analyze_excel.py
```

**Input:** `kaoshibaoExcel20221101.xlsx`
**Output:** `extracted_data.json`

## Data Schema

The question bank uses a fixed 14-column structure:

1. **题干（必填）** - Question text (required)
2. **题型 （必填）** - Question type (required): 单选题, 多选题, 不定项选择题, 判断题, 填空题, 简答题, 排序题, 计算题, 论述题
3. **选项 A** - Option A
4. **选项 B** - Option B
5. **选项 C** - Option C
6. **选项 D** - Option D
7. **选项E\n(勿删)** - Option E (do not delete)
8. **选项F\n(勿删)** - Option F (do not delete)
9. **选项G\n(勿删)** - Option G (do not delete)
10. **选项H\n(勿删)** - Option H (do not delete)
11. **正确答案\n（必填）** - Correct answer (required)
12. **解析\n（勿删）** - Explanation (do not delete)
13. **章节\n（勿删）** - Chapter/section (do not delete)
14. **难度** - Difficulty level: 易, 偏易, 适中, 难

### Answer Format Rules

- **Single choice (单选题):** Single letter (e.g., "A")
- **Multiple choice (多选题):** Multiple letters (e.g., "ABCD")
- **Uncertain choice (不定项选择题):** Multiple letters (e.g., "ABCD")
- **True/False (判断题):** "A" for true, "B" for false
- **Fill-in-blank (填空题):** null or answer text in 选项 A
- **Short answer (简答题):** Answer text in 正确答案 field
- **Sorting (排序题):** Letter sequence (e.g., "DBAC")
- **Calculation (计算题):** Answer text in 正确答案 field
- **Essay (论述题):** Answer text in 正确答案 field

## Key Implementation Details

### Excel Styling (generate_excel.py)
- Uses `openpyxl` library for Excel manipulation
- Header row height: 40
- Data row height: 30
- Column widths are predefined (题干: 50, 题型: 15, options: 20, etc.)
- All cells have thin borders
- Text wrapping enabled for proper display

### JSON Structure
Questions are stored in a JSON object with a "questions" array:
```json
{
  "questions": [
    {
      "题干（必填）": "question text",
      "题型 （必填）": "question type",
      ...
    }
  ]
}
```

## Dependencies

- `openpyxl` - Excel file manipulation
- `json` - JSON data handling

Install with: `pip install openpyxl`
