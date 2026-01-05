# QBank2Xlsx - AI 题库生成器

<div align="center">

![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-teal)

一款基于 AI 的智能题库生成与管理工具，支持多种题型，可将生成的题目导出为标准 Excel 格式。

[English](README_EN.md) | 简体中文

</div>

---

## 📋 目录

- [项目简介](#-项目简介)
- [主要特性](#-主要特性)
- [系统要求](#-系统要求)
- [快速开始](#-快速开始)
- [使用教程](#-使用教程)
- [数据格式说明](#-数据格式说明)
- [题型说明](#-题型说明)
- [命令行工具](#-命令行工具)
- [项目结构](#-项目结构)
- [常见问题](#-常见问题)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## 🎯 项目简介

**QBank2Xlsx** 是一款基于 AI 的题库生成和管理系统，旨在帮助教师、培训机构和教育工作者快速生成高质量的考试题库。通过与 AI 模型（如 Claude、GPT 等）集成，系统能够根据用户需求自动生成各类题目，并导出为标准的 Excel 格式，方便导入各类考试系统。

### 适用场景

- 📚 教育培训机构的题库建设
- 🎓 教师备课和试卷编制
- 💼 企业培训和考核题库管理
- 📝 在线教育平台的内容生成

---

## ✨ 主要特性

### 🤖 AI 智能生成
- **多模型支持**：支持 OpenAI、Claude、通义千问等主流 AI 模型
- **流式输出**：实时显示生成过程，支持 HTTP/2 高并发
- **智能解析**：自动提取题目结构，生成详细解析

### 📊 多种题型支持
支持 9 种常见题型：
- 单选题
- 多选题
- 不定项选择题
- 判断题
- 填空题
- 简答题
- 排序题
- 计算题
- 论述题

### 📤 灵活导出
- **Excel 格式**：导出符合标准格式的 Excel 文件
- **JSON 格式**：支持 JSON 数据导入导出
- **样式优化**：自动设置表格样式、字体和边框

### 🎨 友好界面
- **现代化 Web UI**：响应式设计，支持移动端
- **实时预览**：生成题目实时显示
- **批量处理**：支持批量生成和导出
- **文件对比**：AI 辅助对比生成结果与原始需求

### 🔧 高级功能
- **目录结构**：支持自定义章节目录
- **难度分级**：易、偏易、适中、难四个等级
- **智能文件名**：AI 自动生成有意义的文件名
- **加密存储**：API 密钥本地加密存储

---

## 💻 系统要求

### 基础要求
- **Python**: 3.8 或更高版本
- **操作系统**: Windows / macOS / Linux
- **浏览器**: Chrome / Firefox / Edge（推荐使用最新版本）

### 依赖包
```
fastapi       # Web 框架
uvicorn       # ASGI 服务器
httpx         # HTTP 客户端
openpyxl      # Excel 文件处理
```

---

## 🚀 快速开始

### 方式一：Windows 一键启动（推荐）

1. **克隆项目**
```bash
git clone https://github.com/Sam5440/QBank2Xlsx.git
cd QBank2Xlsx
```

2. **运行启动脚本**
```bash
start.bat
```

启动脚本会自动：
- 检查并安装依赖
- 启动 HTTP/2 服务器
- 在浏览器中打开应用

### 方式二：手动安装

1. **克隆项目**
```bash
git clone https://github.com/Sam5440/QBank2Xlsx.git
cd QBank2Xlsx
```

2. **安装依赖**
```bash
pip install -r requirements.txt
```

3. **启动服务器**

**HTTP/1.1 模式**（最多 6 个并发连接）：
```bash
python app.py
```

**HTTP/2 模式**（支持无限并发连接，推荐）：
```bash
python app.py --http2
```

4. **访问应用**

在浏览器中打开：
```
http://localhost:8000
```

---

## 📖 使用教程

### 1️⃣ 配置 AI 模型

首次使用需要配置 AI 模型：

1. 在页面上方的 **API 配置** 区域填写：
   - **API 地址**：如 `https://api.openai.com/v1` 或其他兼容接口
   - **API Key**：您的 API 密钥（会自动加密存储）
   - **模型**：选择或输入模型名称（如 `gpt-4`、`claude-3-5-sonnet-20241022`）

2. 点击 **保存配置** 按钮

> 💡 **提示**：API 密钥会使用 AES 加密后存储在本地浏览器中，确保安全性。

### 2️⃣ 选择题型

在 **选择题型** 区域，选择需要生成的题型（可多选）：

- ✅ 单选题
- ✅ 多选题
- ✅ 不定项选择题
- ✅ 判断题
- ✅ 填空题
- ✅ 简答题
- ✅ 排序题
- ✅ 计算题
- ✅ 论述题

### 3️⃣ 输入题目需求

在 **输入内容** 文本框中描述您的需求，例如：

```
生成 5 道关于 Python 基础语法的单选题，难度为适中
生成 3 道关于数据结构的多选题
生成 2 道关于算法复杂度的简答题
```

### 4️⃣ 设置章节目录（可选）

点击 **提取目录** 按钮，AI 会自动从内容中提取章节结构，或者手动输入目录：

```
第一章 Python 基础
  第一节 变量与数据类型
  第二节 控制结构
第二章 面向对象编程
  第一节 类与对象
  第二节 继承与多态
```

### 5️⃣ 生成题目

点击 **开始生成** 按钮：

- 🔄 系统会实时显示生成进度
- 📝 生成的题目会逐条显示在下方
- ✏️ 可以点击题目进行编辑

### 6️⃣ 导出 Excel

生成完成后：

1. 检查题目内容是否符合要求
2. 点击 **导出 Excel** 按钮
3. 系统会自动下载 Excel 文件

---

## 📋 数据格式说明

### JSON 格式

题目数据使用 JSON 格式存储，结构如下：

```json
{
  "questions": [
    {
      "题干（必填）": "题目内容",
      "题型 （必填）": "单选题",
      "选项 A": "选项 A 内容",
      "选项 B": "选项 B 内容",
      "选项 C": "选项 C 内容",
      "选项 D": "选项 D 内容",
      "选项E": null,
      "选项F": null,
      "选项G": null,
      "选项H(勿删)": null,
      "正确答案（必填）": "A",
      "解析（勿删）": "解析内容",
      "章节（勿删）": "第一章/第一节",
      "难度": "适中"
    }
  ]
}
```

### Excel 格式

导出的 Excel 文件包含 14 列：

| 列名 | 说明 | 必填 |
|------|------|------|
| 题干（必填） | 题目问题描述 | ✅ |
| 题型（必填） | 题目类型 | ✅ |
| 选项 A | 选项 A 内容 | - |
| 选项 B | 选项 B 内容 | - |
| 选项 C | 选项 C 内容 | - |
| 选项 D | 选项 D 内容 | - |
| 选项E(勿删) | 选项 E 内容 | - |
| 选项F(勿删) | 选项 F 内容 | - |
| 选项G(勿删) | 选项 G 内容 | - |
| 选项H(勿删) | 选项 H 内容 | - |
| 正确答案（必填） | 正确答案 | ✅ |
| 解析（勿删） | 题目解析 | - |
| 章节（勿删） | 所属章节 | - |
| 难度 | 难度等级 | - |

---

## 📝 题型说明

### 1. 单选题

**特点**：只有一个正确答案

**答案格式**：单个字母（A/B/C/D 等）

**示例**：
```json
{
  "题干（必填）": "Python 是哪一年发布的？",
  "题型 （必填）": "单选题",
  "选项 A": "1989",
  "选项 B": "1991",
  "选项 C": "1995",
  "选项 D": "2000",
  "正确答案（必填）": "B"
}
```

### 2. 多选题

**特点**：有多个正确答案

**答案格式**：多个字母组合（如 ABCD）

**示例**：
```json
{
  "题干（必填）": "以下哪些是 Python 的特点？",
  "题型 （必填）": "多选题",
  "选项 A": "简单易学",
  "选项 B": "开源免费",
  "选项 C": "跨平台",
  "选项 D": "静态类型",
  "正确答案（必填）": "ABC"
}
```

### 3. 不定项选择题

**特点**：正确答案数量不确定，至少一个

**答案格式**：一个或多个字母

**示例**：
```json
{
  "题干（必填）": "Python 中可以用来定义函数的关键字是？",
  "题型 （必填）": "不定项选择题",
  "选项 A": "def",
  "选项 B": "function",
  "选项 C": "func",
  "选项 D": "define",
  "正确答案（必填）": "A"
}
```

### 4. 判断题

**特点**：判断对错

**答案格式**：A 表示正确，B 表示错误

**示例**：
```json
{
  "题干（必填）": "Python 是一门编译型语言？",
  "题型 （必填）": "判断题",
  "选项 A": "对",
  "选项 B": "错",
  "正确答案（必填）": "B"
}
```

### 5. 填空题

**特点**：需要填写答案

**答案格式**：答案放在"选项 A"字段，或"正确答案"字段

**示例**：
```json
{
  "题干（必填）": "Python 中用于导入模块的关键字是 _____。",
  "题型 （必填）": "填空题",
  "选项 A": "import",
  "正确答案（必填）": null
}
```

### 6. 简答题

**特点**：需要文字描述答案

**答案格式**：答案放在"正确答案"字段

**示例**：
```json
{
  "题干（必填）": "请简述 Python 的 GIL（全局解释器锁）是什么？",
  "题型 （必填）": "简答题",
  "正确答案（必填）": "GIL 是 Python 解释器中的一个互斥锁..."
}
```

### 7. 排序题

**特点**：对选项进行排序

**答案格式**：字母序列（如 DBAC）

**示例**：
```json
{
  "题干（必填）": "请按照时间顺序排列以下 Python 版本的发布：",
  "题型 （必填）": "排序题",
  "选项 A": "Python 3.0",
  "选项 B": "Python 2.0",
  "选项 C": "Python 3.8",
  "选项 D": "Python 1.0",
  "正确答案（必填）": "DBAC"
}
```

### 8. 计算题

**特点**：需要计算得出答案

**答案格式**：答案放在"正确答案"字段

**示例**：
```json
{
  "题干（必填）": "一个算法的时间复杂度为 O(n²)，当 n=100 时，执行次数约为多少？",
  "题型 （必填）": "计算题",
  "正确答案（必填）": "10000 次"
}
```

### 9. 论述题

**特点**：需要详细论述

**答案格式**：答案放在"正确答案"字段

**示例**：
```json
{
  "题干（必填）": "论述面向对象编程的三大特性及其在 Python 中的应用。",
  "题型 （必填）": "论述题",
  "正确答案（必填）": "面向对象编程的三大特性包括..."
}
```

---

## 🛠️ 命令行工具

### generate_excel.py

将 JSON 格式的题目数据转换为 Excel 文件。

**使用方法**：

```bash
python generate_excel.py
```

**默认配置**：
- 输入文件：`demo_questions.json`
- 输出文件：`generated_exam.xlsx`

**自定义使用**：

修改脚本中的文件路径：

```python
if __name__ == "__main__":
    json_file = "your_questions.json"  # 输入的 JSON 文件
    output_file = "your_exam.xlsx"     # 输出的 Excel 文件
    
    create_excel_from_json(json_file, output_file)
```

**功能特性**：
- ✅ 自动设置表头样式（浅蓝色背景）
- ✅ 设置合适的行高和列宽
- ✅ 添加边框和对齐方式
- ✅ 使用宋体字体，大小 11

---

## 📁 项目结构

```
QBank2Xlsx/
├── app.py                  # FastAPI 主应用
├── ai_service.py          # AI 服务接口
├── excel_service.py       # Excel 导出服务
├── generate_excel.py      # Excel 生成脚本
├── config.py              # 配置文件
├── utils.py               # 工具函数
├── index.html             # Web 前端界面
├── demo_questions.json    # 示例题目数据
├── requirements.txt       # Python 依赖
├── start.bat              # Windows 启动脚本
├── CLAUDE.md              # Claude AI 指导文档
├── README.md              # 项目说明（中文）
└── README_EN.md           # 项目说明（英文）
```

### 核心文件说明

#### app.py
FastAPI 主应用，提供以下 API 端点：
- `GET /` - Web 界面
- `POST /api/generate` - 生成题目（流式）
- `POST /api/export` - 导出 Excel
- `POST /api/extract-directory` - 提取目录结构
- `POST /api/generate-filename` - 生成文件名
- `POST /api/compare` - 对比文件

#### ai_service.py
AI 服务模块，负责与各类 AI 模型交互：
- 流式生成题目
- 提取目录结构
- 生成文件名
- 对比分析

#### excel_service.py
Excel 导出服务，负责将 JSON 数据转换为 Excel 文件。

#### generate_excel.py
独立的 Excel 生成工具，可直接从命令行使用。

#### config.py
配置文件，包含系统提示词和各类提示模板。

---

## ❓ 常见问题

### 1. 安装依赖时出错

**问题**：`pip install` 失败

**解决方案**：
```bash
# 使用国内镜像源
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 或升级 pip
python -m pip install --upgrade pip
```

### 2. 启动服务器失败

**问题**：端口 8000 已被占用

**解决方案**：
```bash
# 修改端口号
uvicorn app:app --host 0.0.0.0 --port 8080
```

### 3. AI 生成失败

**问题**：API 调用失败或超时

**解决方案**：
- 检查 API 地址是否正确
- 确认 API Key 有效且有余额
- 检查网络连接
- 尝试更换 AI 模型

### 4. Excel 导出乱码

**问题**：Excel 文件中文显示乱码

**解决方案**：
- 确保使用的 Excel 版本支持 UTF-8
- 尝试用 WPS 或 LibreOffice 打开
- 检查系统区域和语言设置

### 5. HTTP/2 模式无法启动

**问题**：提示缺少 hypercorn

**解决方案**：
```bash
pip install hypercorn
```

### 6. 生成的题目格式不正确

**问题**：生成的题目缺少字段或格式错误

**解决方案**：
- 检查 `system_prompt.txt` 配置
- 在使用界面中调整系统提示词
- 参考 `demo_questions.json` 中的示例格式

---

## 🤝 贡献指南

我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复
- 🌍 翻译文档

### 贡献步骤

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 遵循 PEP 8 代码规范
- 添加必要的注释和文档
- 编写单元测试
- 更新相关文档

---

## 📝 更新日志

### 2026-01-06

- ♻️ 提取表头处理逻辑到单独模块并更新引用 ([`e74a3dd`](https://github.com/Sam5440/QBank2Xlsx/commit/e74a3dd))
- 🐛 修复demo_data中问题类型字段的获取方式 ([`cc98e4e`](https://github.com/Sam5440/QBank2Xlsx/commit/cc98e4e))
- ✨ 改进题型选择器样式并添加说明功能 ([`45aaab2`](https://github.com/Sam5440/QBank2Xlsx/commit/45aaab2))
- 🐛 修复题型检测逻辑并添加重复提示 ([`87e1b06`](https://github.com/Sam5440/QBank2Xlsx/commit/87e1b06))
- ✨ 添加日志记录功能和题型预览按钮 ([`4a662ab`](https://github.com/Sam5440/QBank2Xlsx/commit/4a662ab))

### 2026-01-05

- ✨ 添加题型动态加载和JSON预览功能 ([`ade3572`](https://github.com/Sam5440/QBank2Xlsx/commit/ade3572))
- 📌 Sam5440/QBank2Xlsx ([`d67e34c`](https://github.com/Sam5440/QBank2Xlsx/commit/d67e34c))
- ♻️ 重构表头匹配逻辑以提高灵活性 ([`a7015bf`](https://github.com/Sam5440/QBank2Xlsx/commit/a7015bf))

### 2026-01-04

- 📌 Merge pull request #2 from Sam5440/copilot/generate-complete-readme ([`52b0141`](https://github.com/Sam5440/QBank2Xlsx/commit/52b0141))
- 📌 Add comprehensive README documentation in Chinese and English ([`1621759`](https://github.com/Sam5440/QBank2Xlsx/commit/1621759))
- 📌 Initial plan ([`6e4f7ba`](https://github.com/Sam5440/QBank2Xlsx/commit/6e4f7ba))
- ♻️ 优化题目选项匹配逻辑并提取常量 ([`f3118f7`](https://github.com/Sam5440/QBank2Xlsx/commit/f3118f7))
- ✨ 添加JSON验证和单个对比审核功能 ([`889b6ec`](https://github.com/Sam5440/QBank2Xlsx/commit/889b6ec))
- ✨ 新增AB对比功能并优化Excel导出 ([`bee3360`](https://github.com/Sam5440/QBank2Xlsx/commit/bee3360))
- ♻️ 重构代码结构，提取通用功能到独立模块 ([`6ab56a0`](https://github.com/Sam5440/QBank2Xlsx/commit/6ab56a0))
- ✨ 添加系统提示词自定义和目录结构功能 ([`43d95b9`](https://github.com/Sam5440/QBank2Xlsx/commit/43d95b9))
- 🔧 删除废弃的Excel分析脚本 ([`e3f395e`](https://github.com/Sam5440/QBank2Xlsx/commit/e3f395e))

### 2026-01-03

- 📌 AI exam question bank generator ([`f003ed7`](https://github.com/Sam5440/QBank2Xlsx/commit/f003ed7))

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) - 现代化的 Python Web 框架
- [OpenPyXL](https://openpyxl.readthedocs.io/) - Excel 文件处理库
- [Anthropic Claude](https://www.anthropic.com/) - AI 模型提供商
- [OpenAI](https://openai.com/) - AI 模型提供商

---

## 📮 联系方式

- 项目主页：[GitHub - Sam5440/QBank2Xlsx](https://github.com/Sam5440/QBank2Xlsx)
- 问题反馈：[GitHub Issues](https://github.com/Sam5440/QBank2Xlsx/issues)

---

<div align="center">

**如果这个项目对您有帮助，请给一个 ⭐️ Star！**

Made with ❤️ by Sam5440

</div>
