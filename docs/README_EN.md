# QBank2Xlsx - AI Question Bank Generator

<div align="center">

![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-teal)

An AI-powered intelligent question bank generation and management tool that supports multiple question types and exports to standard Excel format.

English | [简体中文](README.md)

</div>

---

## 📋 Table of Contents

- [Introduction](#-introduction)
- [Key Features](#-key-features)
- [System Requirements](#-system-requirements)
- [Quick Start](#-quick-start)
- [User Guide](#-user-guide)
- [Data Format](#-data-format)
- [Question Types](#-question-types)
- [Command Line Tools](#-command-line-tools)
- [Project Structure](#-project-structure)
- [FAQ](#-faq)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Introduction

**QBank2Xlsx** is an AI-based question bank generation and management system designed to help teachers, training institutions, and educators quickly generate high-quality exam question banks. By integrating with AI models (such as Claude, GPT, etc.), the system can automatically generate various types of questions based on user requirements and export them to standard Excel format for easy import into various exam systems.

### Use Cases

- 📚 Question bank construction for educational and training institutions
- 🎓 Teacher lesson preparation and exam paper compilation
- 💼 Corporate training and assessment question bank management
- 📝 Content generation for online education platforms

---

## ✨ Key Features

### 🤖 AI-Powered Generation
- **Multi-Model Support**: Compatible with OpenAI, Claude, Tongyi Qianwen, and other mainstream AI models
- **Streaming Output**: Real-time display of generation process, HTTP/2 support for high concurrency
- **Intelligent Parsing**: Automatically extract question structure and generate detailed explanations

### 📊 Multiple Question Types
Supports 9 common question types:
- Single Choice
- Multiple Choice
- Multiple Answers
- True/False
- Fill in the Blank
- Short Answer
- Sorting
- Calculation
- Essay

### 📤 Flexible Export
- **Excel Format**: Export to standard Excel format
- **JSON Format**: Support JSON data import and export
- **Style Optimization**: Automatically set table styles, fonts, and borders

### 🎨 User-Friendly Interface
- **Modern Web UI**: Responsive design with mobile support
- **Real-time Preview**: Generated questions displayed in real-time
- **Batch Processing**: Support batch generation and export
- **File Comparison**: AI-assisted comparison of generated results with original requirements

### 🔧 Advanced Features
- **Directory Structure**: Support custom chapter directories
- **Difficulty Levels**: Four levels: Easy, Relatively Easy, Medium, Hard
- **Smart Filename**: AI automatically generates meaningful filenames
- **Encrypted Storage**: API keys stored locally with encryption

---

## 💻 System Requirements

### Basic Requirements
- **Python**: 3.8 or higher
- **Operating System**: Windows / macOS / Linux
- **Browser**: Chrome / Firefox / Edge (latest version recommended)

### Dependencies
```
fastapi       # Web framework
uvicorn       # ASGI server
httpx         # HTTP client
openpyxl      # Excel file processing
```

---

## 🚀 Quick Start

### Method 1: Windows One-Click Start (Recommended)

1. **Clone the Project**
```bash
git clone https://github.com/Sam5440/QBank2Xlsx.git
cd QBank2Xlsx
```

2. **Run the Startup Script**
```bash
start.bat
```

The startup script will automatically:
- Check and install dependencies
- Start the HTTP/2 server
- Open the application in your browser

### Method 2: Manual Installation

1. **Clone the Project**
```bash
git clone https://github.com/Sam5440/QBank2Xlsx.git
cd QBank2Xlsx
```

2. **Install Dependencies**
```bash
pip install -r requirements.txt
```

3. **Start the Server**

**HTTP/1.1 Mode** (max 6 concurrent connections):
```bash
python app.py
```

**HTTP/2 Mode** (unlimited concurrent connections, recommended):
```bash
python app.py --http2
```

4. **Access the Application**

Open in your browser:
```
http://localhost:8000
```

---

## 📖 User Guide

### 1️⃣ Configure AI Model

First-time use requires AI model configuration:

1. Fill in the **API Configuration** section at the top:
   - **API URL**: e.g., `https://api.openai.com/v1` or other compatible endpoints
   - **API Key**: Your API key (automatically encrypted for storage)
   - **Model**: Select or enter a model name (e.g., `gpt-4`, `claude-3-5-sonnet-20241022`)

2. Click the **Save Configuration** button

> 💡 **Tip**: API keys are encrypted using AES and stored in your local browser for security.

### 2️⃣ Select Question Types

In the **Select Question Types** section, choose the types you want to generate (multiple selection allowed):

- ✅ Single Choice
- ✅ Multiple Choice
- ✅ Multiple Answers
- ✅ True/False
- ✅ Fill in the Blank
- ✅ Short Answer
- ✅ Sorting
- ✅ Calculation
- ✅ Essay

### 3️⃣ Enter Requirements

Describe your requirements in the **Input Content** text box, for example:

```
Generate 5 single-choice questions about Python basic syntax, medium difficulty
Generate 3 multiple-choice questions about data structures
Generate 2 short answer questions about algorithm complexity
```

### 4️⃣ Set Chapter Directory (Optional)

Click the **Extract Directory** button, and AI will automatically extract the chapter structure from the content, or manually enter a directory:

```
Chapter 1 Python Basics
  Section 1 Variables and Data Types
  Section 2 Control Structures
Chapter 2 Object-Oriented Programming
  Section 1 Classes and Objects
  Section 2 Inheritance and Polymorphism
```

### 5️⃣ Generate Questions

Click the **Start Generation** button:

- 🔄 The system will display generation progress in real-time
- 📝 Generated questions will be displayed one by one below
- ✏️ Click on questions to edit them

### 6️⃣ Export to Excel

After generation is complete:

1. Check if the question content meets requirements
2. Click the **Export Excel** button
3. The system will automatically download the Excel file

---

## 📋 Data Format

### JSON Format

Question data is stored in JSON format with the following structure:

```json
{
  "questions": [
    {
      "题干（必填）": "Question content",
      "题型 （必填）": "Single Choice",
      "选项 A": "Option A content",
      "选项 B": "Option B content",
      "选项 C": "Option C content",
      "选项 D": "Option D content",
      "选项E": null,
      "选项F": null,
      "选项G": null,
      "选项H(勿删)": null,
      "正确答案（必填）": "A",
      "解析（勿删）": "Explanation content",
      "章节（勿删）": "Chapter 1/Section 1",
      "难度": "Medium"
    }
  ]
}
```

### Excel Format

The exported Excel file contains 14 columns:

| Column Name | Description | Required |
|-------------|-------------|----------|
| 题干（必填） | Question text | ✅ |
| 题型（必填） | Question type | ✅ |
| 选项 A | Option A content | - |
| 选项 B | Option B content | - |
| 选项 C | Option C content | - |
| 选项 D | Option D content | - |
| 选项E(勿删) | Option E content | - |
| 选项F(勿删) | Option F content | - |
| 选项G(勿删) | Option G content | - |
| 选项H(勿删) | Option H content | - |
| 正确答案（必填） | Correct answer | ✅ |
| 解析（勿删） | Explanation | - |
| 章节（勿删） | Chapter/section | - |
| 难度 | Difficulty level | - |

---

## 📝 Question Types

### 1. Single Choice

**Characteristics**: Only one correct answer

**Answer Format**: Single letter (A/B/C/D, etc.)

**Example**:
```json
{
  "题干（必填）": "What year was Python released?",
  "题型 （必填）": "单选题",
  "选项 A": "1989",
  "选项 B": "1991",
  "选项 C": "1995",
  "选项 D": "2000",
  "正确答案（必填）": "B"
}
```

### 2. Multiple Choice

**Characteristics**: Multiple correct answers

**Answer Format**: Combination of letters (e.g., ABCD)

**Example**:
```json
{
  "题干（必填）": "Which of the following are features of Python?",
  "题型 （必填）": "多选题",
  "选项 A": "Easy to learn",
  "选项 B": "Open source",
  "选项 C": "Cross-platform",
  "选项 D": "Static typing",
  "正确答案（必填）": "ABC"
}
```

### 3. Multiple Answers

**Characteristics**: Uncertain number of correct answers, at least one

**Answer Format**: One or more letters

### 4. True/False

**Characteristics**: Determine true or false

**Answer Format**: A for true, B for false

**Example**:
```json
{
  "题干（必填）": "Is Python a compiled language?",
  "题型 （必填）": "判断题",
  "选项 A": "True",
  "选项 B": "False",
  "正确答案（必填）": "B"
}
```

### 5. Fill in the Blank

**Characteristics**: Requires filling in the answer

**Answer Format**: Answer in "Option A" field or "Correct Answer" field

### 6. Short Answer

**Characteristics**: Requires text description

**Answer Format**: Answer in "Correct Answer" field

### 7. Sorting

**Characteristics**: Sort options in order

**Answer Format**: Letter sequence (e.g., DBAC)

### 8. Calculation

**Characteristics**: Requires calculation

**Answer Format**: Answer in "Correct Answer" field

### 9. Essay

**Characteristics**: Requires detailed discussion

**Answer Format**: Answer in "Correct Answer" field

---

## 🛠️ Command Line Tools

### generate_excel.py

Convert JSON question data to Excel format.

**Usage**:

```bash
python generate_excel.py
```

**Default Configuration**:
- Input file: `demo_questions.json`
- Output file: `generated_exam.xlsx`

**Custom Usage**:

Modify the file paths in the script:

```python
if __name__ == "__main__":
    json_file = "your_questions.json"  # Input JSON file
    output_file = "your_exam.xlsx"     # Output Excel file
    
    create_excel_from_json(json_file, output_file)
```

**Features**:
- ✅ Automatically set header styles (light blue background)
- ✅ Set appropriate row heights and column widths
- ✅ Add borders and alignment
- ✅ Use SimSun font, size 11

---

## 📁 Project Structure

```
QBank2Xlsx/
├── app.py                  # FastAPI main application
├── ai_service.py          # AI service interface
├── excel_service.py       # Excel export service
├── generate_excel.py      # Excel generation script
├── config.py              # Configuration file
├── utils.py               # Utility functions
├── index.html             # Web frontend interface
├── demo_questions.json    # Sample question data
├── requirements.txt       # Python dependencies
├── start.bat              # Windows startup script
├── CLAUDE.md              # Claude AI guidance document
├── README.md              # Project documentation (Chinese)
└── README_EN.md           # Project documentation (English)
```

### Core Files

#### app.py
FastAPI main application providing the following API endpoints:
- `GET /` - Web interface
- `POST /api/generate` - Generate questions (streaming)
- `POST /api/export` - Export to Excel
- `POST /api/extract-directory` - Extract directory structure
- `POST /api/generate-filename` - Generate filename
- `POST /api/compare` - Compare files

#### ai_service.py
AI service module responsible for interacting with various AI models:
- Streaming question generation
- Extract directory structure
- Generate filenames
- Comparison analysis

#### excel_service.py
Excel export service responsible for converting JSON data to Excel files.

#### generate_excel.py
Standalone Excel generation tool that can be used directly from the command line.

#### config.py
Configuration file containing system prompts and various prompt templates.

---

## ❓ FAQ

### 1. Error Installing Dependencies

**Problem**: `pip install` fails

**Solution**:
```bash
# Use mirror source (for China users)
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# Or upgrade pip
python -m pip install --upgrade pip
```

### 2. Server Fails to Start

**Problem**: Port 8000 is already in use

**Solution**:
```bash
# Change port number
uvicorn app:app --host 0.0.0.0 --port 8080
```

### 3. AI Generation Fails

**Problem**: API call fails or times out

**Solution**:
- Check if API address is correct
- Confirm API Key is valid and has balance
- Check network connection
- Try switching AI models

### 4. Excel Export Garbled Characters

**Problem**: Chinese characters display as garbled text in Excel

**Solution**:
- Ensure Excel version supports UTF-8
- Try opening with WPS or LibreOffice
- Check system region and language settings

### 5. HTTP/2 Mode Fails to Start

**Problem**: Missing hypercorn

**Solution**:
```bash
pip install hypercorn
```

### 6. Generated Questions Have Incorrect Format

**Problem**: Generated questions missing fields or format errors

**Solution**:
- Check `system_prompt.txt` configuration
- Adjust system prompts in the interface
- Refer to example format in `demo_questions.json`

---

## 🤝 Contributing

We welcome all forms of contributions, including but not limited to:

- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit code fixes
- 🌍 Translate documentation

### Contributing Steps

1. Fork this project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Standards

- Follow PEP 8 coding standards
- Add necessary comments and documentation
- Write unit tests
- Update relevant documentation

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [OpenPyXL](https://openpyxl.readthedocs.io/) - Excel file processing library
- [Anthropic Claude](https://www.anthropic.com/) - AI model provider
- [OpenAI](https://openai.com/) - AI model provider

---

## 📮 Contact

- Project Home: [GitHub - Sam5440/QBank2Xlsx](https://github.com/Sam5440/QBank2Xlsx)
- Issue Tracker: [GitHub Issues](https://github.com/Sam5440/QBank2Xlsx/issues)

---

<div align="center">

**If this project helps you, please give it a ⭐️ Star!**

Made with ❤️ by Sam5440

</div>
