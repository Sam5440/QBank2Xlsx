        let selectedTypes = [];
        let generatedJSON = '';
        let encryptionKey = '';
        let transportPublicKey = null;
        let apiConfigs = [];
        let inputPairs = [{id: 0, text: ''}];
        let outputPairs = [{id: 0, editable: '', full: ''}];
        let nextId = 1;
        let defaultSystemPrompt = '';
        let sampleData = {};
        let activeGenerations = new Map();
        let nextGenerationRunId = 1;
        let batchGenerating = false;
        let globalGenerationProgress = {completed: 0, total: 0, status: 'idle'};
        let toastLogTimer = null;
        let editorEnhanceScheduled = false;
        let availableQuestionTypes = [];
        let questionTypeExplanations = {
            '单选题': '单选题：只有一个正确答案，答案格式为单个字母（如 "A"）',
            '多选题': '多选题：有多个正确答案，答案格式为多个字母（如 "ABCD"）',
            '不定项选择题': '不定项选择题：可能有一个或多个正确答案，答案格式为字母组合（如 "AB"）',
            '判断题': '判断题：判断对错，答案格式为 "A"（正确）或 "B"（错误）',
            '填空题': '填空题：填写答案，答案可以在"选项 A"或"正确答案"字段中',
            '简答题': '简答题：需要文字回答，答案在"正确答案"字段中',
            '排序题': '排序题：对选项进行排序，答案格式为字母序列（如 "DBAC"）',
            '计算题': '计算题：需要计算的题目，答案在"正确答案"字段中',
            '论述题': '论述题：需要详细论述，答案在"正确答案"字段中'
        };
        const QUESTION_TYPES_STORAGE_KEY = 'editableQuestionTypes';
        const CONSOLE_SETTINGS_STORAGE_KEY = 'systemConsoleSettings';
        const PROMPT_OVERRIDES_STORAGE_KEY = 'aiPromptOverrides';
        let activePromptKey = '';
        const PROMPT_DEFAULTS = {
            generation: '',
            filename: '你是一个专业的文件命名助手。请根据用户提供的题目需求，生成一个简洁、有意义的文件名（不包含扩展名）。用下划线或连字符分隔。',
            directory: "你是一个专业的内容分析助手。请根据用户提供的题目需求，提取或生成合适的目录结构。目录应该简洁明了，并且使用python的list进行描述，例如['第1章 基础概念', '第2章 高级技巧']",
            typeMatch: '你是一个题库需求分类助手。请只从候选题型中选择最适合用户需求的题型。必须直接输出 JSON，格式为 {\"questionTypes\": [\"题型1\"]}，不要输出其他文字。',
            compare: `你是一个专业的题库审核助手。请对比以下两份内容：

**文件 B（原始需求）：**
{file_b}

**文件 A（生成的题目）：**
{file_a}

请从以下方面进行对比分析：
1. 题目数量是否符合需求，是否存在缺漏等
2. 题目信息（包括题目题干，类型、选项、解析等）和原始需求完全一致

请使用 Markdown 输出审核意见，建议采用如下结构：
## 总结
## 主要问题
## 需要修改的内容
## 修改建议
尽量使用列表和小标题，便于直接阅读。`,
            compareScore: `你是一个严格的题库质量评分助手。请先阅读原始需求，再检查生成题目。

请输出 Markdown，并使用以下结构：
## 结构化评分
| 维度 | 分数(0-10) | 问题数 | 说明 |
| --- | ---: | ---: | --- |
| 数量完整性 |  |  |  |
| 题型匹配 |  |  |  |
| 内容一致性 |  |  |  |
| 答案正确性 |  |  |  |
| 解析质量 |  |  |  |
| JSON/字段规范 |  |  |  |

## 总分
给出 0-100 分，并说明扣分原因。

## 必改清单
按严重程度列出必须修复的问题。`,
            compareChat: '你是一个专业的题库审核助手。请基于已有 AB 对比结果、生成题目和原始需求回答用户追问。回答必须使用 Markdown，结论明确，必要时给出可执行的修改建议。如果上下文不足，请直接说明缺少哪些信息，不要编造。'
        };
        const PROMPT_LABELS = {
            generation: '题目生成提示词',
            filename: '文件名生成提示词',
            directory: '目录提取提示词',
            typeMatch: 'AI 匹配题型提示词',
            compare: 'AB 对比审核提示词',
            compareScore: '结构化评分提示词',
            compareChat: '对比追问提示词'
        };
        let compareContext = {
            structuredResult: '',
            compareResult: '',
            fileA: '',
            fileB: ''
        };
        let compareChatHistory = [];
        const SECTION_COLOR_STORAGE_KEY = 'sectionAccentColors';
        const SECTION_COLOR_ITEMS = [
            {key: 'questionTypes', label: '选择题型'},
            {key: 'api', label: 'API 配置管理'},
            {key: 'filename', label: '输出文件名'},
            {key: 'directory', label: '目录结构'},
            {key: 'systemPrompt', label: '系统提示词'},
            {key: 'logs', label: '操作日志'},
            {key: 'generation', label: '生成题目'},
            {key: 'requirements', label: '输入题目需求'},
            {key: 'results', label: 'AI 生成结果'},
            {key: 'templateConvert', label: '模板互转'},
            {key: 'compare', label: 'AB 对比审核'},
            {key: 'export', label: '导出 Excel'}
        ];
        const SECTION_COLOR_PALETTE = [
            '#0F766E',
            '#2563EB',
            '#B45309',
            '#16A34A',
            '#DC2626',
            '#9333EA',
            '#0891B2',
            '#4F46E5',
            '#C2410C',
            '#64748B',
            '#BE123C'
        ];
        const QUICK_NAV_DEFAULTS = SECTION_COLOR_ITEMS.map(item => ({
            key: item.key,
            label: item.label,
            visible: !['logs'].includes(item.key)
        }));

        // 日志系统
        function addLog(action, detail = '') {
            const logs = JSON.parse(localStorage.getItem('aiLogs') || '[]');
            const log = {
                time: new Date().toLocaleString('zh-CN'),
                action,
                detail
            };
            logs.unshift(log);
            if (logs.length > 50) logs.splice(50);
            localStorage.setItem('aiLogs', JSON.stringify(logs));
            renderLogs();
            showFloatingLog(action, detail);
        }

        function getConsoleSettings() {
            try {
                return {
                    autoCompareEnabled: false,
                    quickNavItems: QUICK_NAV_DEFAULTS,
                    toastEnabled: true,
                    toastDuration: 1000,
                    ...JSON.parse(localStorage.getItem(CONSOLE_SETTINGS_STORAGE_KEY) || '{}')
                };
            } catch {
                return {autoCompareEnabled: false, quickNavItems: QUICK_NAV_DEFAULTS, toastEnabled: true, toastDuration: 1000};
            }
        }

        function normalizeQuickNavItems(items) {
            const savedMap = new Map((Array.isArray(items) ? items : []).map(item => [item.key, item]));
            return QUICK_NAV_DEFAULTS.map(item => {
                const saved = savedMap.get(item.key) || {};
                return {
                    key: item.key,
                    label: String(saved.label || item.label).trim() || item.label,
                    visible: saved.visible ?? item.visible
                };
            });
        }

        function saveConsoleSettings() {
            const durationValue = parseInt(document.getElementById('toastLogDuration')?.value || '1000', 10);
            const settings = {
                autoCompareEnabled: document.getElementById('autoCompareEnabled')?.checked ?? false,
                quickNavItems: normalizeQuickNavItems(readQuickNavSettingsFromUI()),
                toastEnabled: document.getElementById('toastLogEnabled')?.checked ?? true,
                toastDuration: Math.max(300, Math.min(5000, Number.isFinite(durationValue) ? durationValue : 1000))
            };
            localStorage.setItem(CONSOLE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
            renderQuickNavBar();
        }

        function applyConsoleSettings() {
            const settings = getConsoleSettings();
            const autoCompare = document.getElementById('autoCompareEnabled');
            const enabled = document.getElementById('toastLogEnabled');
            const duration = document.getElementById('toastLogDuration');
            if (autoCompare) autoCompare.checked = Boolean(settings.autoCompareEnabled);
            if (enabled) enabled.checked = Boolean(settings.toastEnabled);
            if (duration) duration.value = settings.toastDuration;
            renderQuickNavSettings();
            renderQuickNavBar();
        }

        function getQuickNavItems() {
            return normalizeQuickNavItems(getConsoleSettings().quickNavItems);
        }

        function readQuickNavSettingsFromUI() {
            const container = document.getElementById('quickNavSettings');
            if (!container) return getQuickNavItems();
            return QUICK_NAV_DEFAULTS.map(item => ({
                key: item.key,
                visible: container.querySelector(`[data-nav-visible="${item.key}"]`)?.checked ?? item.visible,
                label: container.querySelector(`[data-nav-label="${item.key}"]`)?.value?.trim() || item.label
            }));
        }

        function renderQuickNavSettings() {
            const container = document.getElementById('quickNavSettings');
            if (!container) return;
            const items = getQuickNavItems();
            container.innerHTML = items.map(item => `
                <div class="quick-nav-setting-row">
                    <label class="quick-nav-setting-toggle">
                        <input type="checkbox" data-nav-visible="${item.key}" ${item.visible ? 'checked' : ''} onchange="saveConsoleSettings()">
                        <span>${escapeHTML(item.label)}</span>
                    </label>
                    <input
                        type="text"
                        value="${escapeHTML(item.label)}"
                        data-nav-label="${item.key}"
                        placeholder="导航名称"
                        onchange="saveConsoleSettings()"
                    >
                </div>
            `).join('');
        }

        function scrollToSection(sectionKey) {
            const target = document.querySelector(`[data-section-key="${sectionKey}"]`);
            if (!target) return;
            target.scrollIntoView({behavior: 'smooth', block: 'start'});
        }

        function renderQuickNavBar() {
            const container = document.getElementById('quickNavBar');
            if (!container) return;
            const items = getQuickNavItems().filter(item => item.visible);
            if (!items.length) {
                container.innerHTML = '';
                return;
            }
            container.innerHTML = `
                <div class="quick-nav-list">
                    ${items.map(item => `
                        <button type="button" class="quick-nav-btn" onclick="scrollToSection('${item.key}')" title="${escapeHTML(item.label)}">
                            ${escapeHTML(item.label)}
                        </button>
                    `).join('')}
                </div>
            `;
        }

        function shouldAutoCompareAfterGeneration() {
            return Boolean(getConsoleSettings().autoCompareEnabled);
        }

        function showFloatingLog(action, detail = '') {
            const settings = getConsoleSettings();
            if (!settings.toastEnabled) return;
            const toast = document.getElementById('floatingLogToast');
            if (!toast) return;
            toast.innerHTML = `<strong>${escapeHTML(action)}</strong><span>${escapeHTML(detail || '')}</span>`;
            toast.classList.add('active');
            clearTimeout(toastLogTimer);
            toastLogTimer = setTimeout(() => toast.classList.remove('active'), settings.toastDuration || 1000);
        }

        function toggleSystemConsole() {
            const consoleEl = document.getElementById('systemConsole');
            consoleEl?.classList.toggle('collapsed');
        }

        function loadPromptOverrides() {
            try {
                return JSON.parse(localStorage.getItem(PROMPT_OVERRIDES_STORAGE_KEY) || '{}');
            } catch {
                return {};
            }
        }

        function savePromptOverrides(overrides) {
            localStorage.setItem(PROMPT_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
        }

        function getPromptDefault(key) {
            if (key === 'generation') {
                return defaultSystemPrompt || PROMPT_DEFAULTS.generation || '';
            }
            return PROMPT_DEFAULTS[key] || '';
        }

        function getPromptValue(key) {
            if (key === 'generation') {
                return document.getElementById('systemPrompt')?.value || getPromptDefault(key);
            }
            const overrides = loadPromptOverrides();
            return overrides[key] || getPromptDefault(key);
        }

        function setPromptValue(key, value) {
            if (key === 'generation') {
                setTextareaValue('systemPrompt', value);
                return;
            }
            const overrides = loadPromptOverrides();
            overrides[key] = value;
            savePromptOverrides(overrides);
        }

        function resetPromptValue(key) {
            if (key === 'generation') {
                setTextareaValue('systemPrompt', getPromptDefault(key));
                return;
            }
            const overrides = loadPromptOverrides();
            delete overrides[key];
            savePromptOverrides(overrides);
        }

        function openPromptEditor(key) {
            activePromptKey = key;
            const modal = document.getElementById('promptModal');
            const title = document.getElementById('promptModalTitle');
            const textarea = document.getElementById('promptEditorTextarea');
            if (!modal || !title || !textarea) return;
            title.textContent = PROMPT_LABELS[key] || '提示词设置';
            textarea.value = getPromptValue(key);
            updateEditorLineNumbers(textarea);
            modal.style.display = 'block';
            scheduleEnhanceTextEditors();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function closePromptEditor() {
            const modal = document.getElementById('promptModal');
            if (modal) modal.style.display = 'none';
            activePromptKey = '';
        }

        function savePromptEditor() {
            const textarea = document.getElementById('promptEditorTextarea');
            if (!activePromptKey || !textarea) return;
            setPromptValue(activePromptKey, textarea.value);
            addLog('保存提示词', PROMPT_LABELS[activePromptKey] || activePromptKey);
            closePromptEditor();
        }

        function resetPromptEditor() {
            if (!activePromptKey) return;
            resetPromptValue(activePromptKey);
            const textarea = document.getElementById('promptEditorTextarea');
            if (textarea) {
                textarea.value = getPromptValue(activePromptKey);
                updateEditorLineNumbers(textarea);
            }
            addLog('还原默认提示词', PROMPT_LABELS[activePromptKey] || activePromptKey);
        }

        function renderLogs() {
            const logs = JSON.parse(localStorage.getItem('aiLogs') || '[]');
            const container = document.getElementById('logContent');
            container.innerHTML = logs.map(log => `
                <div class="log-entry">
                    <div class="log-time">${log.time}</div>
                    <div class="log-action">${log.action}</div>
                    ${log.detail ? `<div class="log-detail">${log.detail}</div>` : ''}
                </div>
            `).join('');
        }

        function clearLogs() {
            localStorage.removeItem('aiLogs');
            renderLogs();
            addLog('清空日志', '所有日志已清除');
        }

        function getDefaultSectionColors(randomize = true) {
            const palette = [...SECTION_COLOR_PALETTE];
            if (randomize) {
                for (let i = palette.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [palette[i], palette[j]] = [palette[j], palette[i]];
                }
            }
            return SECTION_COLOR_ITEMS.reduce((colors, item, index) => {
                colors[item.key] = palette[index % palette.length];
                return colors;
            }, {});
        }

        function loadSectionColors() {
            try {
                const saved = JSON.parse(localStorage.getItem(SECTION_COLOR_STORAGE_KEY) || 'null');
                if (saved && typeof saved === 'object') {
                    return {
                        ...getDefaultSectionColors(false),
                        ...saved
                    };
                }
            } catch (e) {
                console.warn('读取区域配色失败，已使用默认配色:', e);
            }

            const colors = getDefaultSectionColors(true);
            localStorage.setItem(SECTION_COLOR_STORAGE_KEY, JSON.stringify(colors));
            return colors;
        }

        function hexToRgba(hex, alpha) {
            const normalized = hex.replace('#', '');
            const value = normalized.length === 3
                ? normalized.split('').map(char => char + char).join('')
                : normalized;
            const intValue = Number.parseInt(value, 16);
            const r = (intValue >> 16) & 255;
            const g = (intValue >> 8) & 255;
            const b = intValue & 255;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        function applySectionColors(colors = loadSectionColors()) {
            SECTION_COLOR_ITEMS.forEach(item => {
                document.querySelectorAll(`[data-section-key="${item.key}"]`).forEach(element => {
                    const color = colors[item.key];
                    element.style.setProperty('--section-accent', color);
                    element.style.setProperty('--section-tint', hexToRgba(color, 0.07));
                });
            });
            updateSectionColorControls(colors);
        }

        function updateSectionColorControls(colors = loadSectionColors()) {
            SECTION_COLOR_ITEMS.forEach(item => {
                document.querySelectorAll(`[data-section-color="${item.key}"]`).forEach(element => {
                    element.style.setProperty('--section-accent', colors[item.key]);
                });
            });
        }

        function saveSectionColor(key, color) {
            const colors = loadSectionColors();
            colors[key] = color;
            localStorage.setItem(SECTION_COLOR_STORAGE_KEY, JSON.stringify(colors));
            applySectionColors(colors);
        }

        function renderSectionColorControls() {
            const grid = document.getElementById('sectionColorGrid');
            if (!grid) return;
            const colors = loadSectionColors();
            grid.innerHTML = '';
            SECTION_COLOR_ITEMS.forEach(item => {
                const row = document.createElement('div');
                row.className = 'section-color-row';
                row.dataset.sectionColor = item.key;
                row.style.setProperty('--section-accent', colors[item.key]);

                const name = document.createElement('div');
                name.className = 'section-color-name';

                const swatch = document.createElement('span');
                swatch.className = 'section-color-swatch';

                const label = document.createElement('span');
                label.textContent = item.label;

                const input = document.createElement('input');
                input.type = 'color';
                input.value = colors[item.key];
                input.setAttribute('aria-label', `${item.label}配色`);
                input.addEventListener('input', event => saveSectionColor(item.key, event.target.value));

                name.append(swatch, label);
                row.append(name, input);
                grid.appendChild(row);
            });
        }

        function initializeSectionColorSettings() {
            renderSectionColorControls();
            applySectionColors(loadSectionColors());
        }

        function toggleThemePanel() {
            const panel = document.getElementById('themePanel');
            if (panel) panel.classList.toggle('active');
        }

        function randomizeSectionColors() {
            const colors = getDefaultSectionColors(true);
            localStorage.setItem(SECTION_COLOR_STORAGE_KEY, JSON.stringify(colors));
            renderSectionColorControls();
            applySectionColors(colors);
            addLog('随机区域配色', '已为所有区域重新生成配色');
        }

        function resetSectionColors() {
            const colors = getDefaultSectionColors(false);
            localStorage.setItem(SECTION_COLOR_STORAGE_KEY, JSON.stringify(colors));
            renderSectionColorControls();
            applySectionColors(colors);
            addLog('重置区域配色', '已恢复默认区域配色');
        }

        async function loadSystemPrompt() {
            try {
                const response = await fetch('/api/system-prompt');
                const data = await response.json();
                defaultSystemPrompt = data.systemPrompt;
                setTextareaValue('systemPrompt', defaultSystemPrompt);
            } catch (e) {
                console.error('加载系统提示词失败:', e);
            }
        }

        async function loadQuestionTypes() {
            try {
                const response = await fetch('/api/question-types');
                const data = await response.json();

                if (data.error) {
                    document.getElementById('questionTypesContainer').innerHTML =
                        `<div style="color: #e53e3e; padding: 20px; text-align: center;">加载失败: ${data.error}</div>`;
                    return;
                }

                sampleData = data.sampleData;
                const types = data.questionTypes || [];
                availableQuestionTypes = loadEditableQuestionTypes(types);
                const noticeTip = data.noticeTip;

                // Display notice tip if exists
                const noticeTipContainer = document.getElementById('noticeTipContainer');
                if (noticeTip) {
                    noticeTipContainer.innerHTML = `
                        <div class="notice-tip">
                            <i data-lucide="triangle-alert"></i>
                            <span>${escapeHTML(noticeTip)}</span>
                        </div>
                    `;
                } else {
                    noticeTipContainer.innerHTML = '';
                }

                if (availableQuestionTypes.length === 0) {
                    document.getElementById('questionTypesContainer').innerHTML =
                        '<div style="color: #718096; padding: 20px; text-align: center;">未找到题型</div>';
                    return;
                }

                const savedTypes = getCookie('questionTypes');
                if (savedTypes) {
                    const decrypted = decrypt(savedTypes);
                    if (decrypted) {
                        const restoredTypes = JSON.parse(decrypted);
                        selectedTypes = restoredTypes.filter(type => availableQuestionTypes.includes(type));
                    }
                }
                if (!selectedTypes.length && availableQuestionTypes.length) {
                    selectedTypes = [availableQuestionTypes[0]];
                }
                saveEditableQuestionTypes();
                renderQuestionTypes();

                addLog('加载题型', `共 ${availableQuestionTypes.length} 种题型`);
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            } catch (e) {
                console.error('加载题型失败:', e);
                document.getElementById('questionTypesContainer').innerHTML =
                    `<div style="color: #e53e3e; padding: 20px; text-align: center;">加载失败: ${e.message}</div>`;
            }
        }

        function showExplanation(type) {
            const explanation = questionTypeExplanations[type] || '暂无说明';
            alert(explanation);
            addLog('查看说明', type);
        }

        function previewJSON(section) {
            const modal = document.getElementById('jsonModal');
            const content = document.getElementById('modalContent');

            if (section === 'questionTypes') {
                content.textContent = JSON.stringify(sampleData, null, 2);
            } else {
                // Filter questions by type
                const filteredData = {
                    questions: sampleData.questions?.filter(q => q['题型 （必填）'] === section) || []
                };
                content.textContent = JSON.stringify(filteredData, null, 2);
            }

            modal.style.display = 'block';
            addLog('预览JSON', section);
        }

        function closeModal() {
            document.getElementById('jsonModal').style.display = 'none';
        }

        window.onclick = function(event) {
            const modal = document.getElementById('jsonModal');
            if (event.target === modal) {
                closeModal();
            }
        }

        function resetSystemPrompt() {
            setTextareaValue('systemPrompt', defaultSystemPrompt);
            addLog('还原系统提示词', '已恢复为默认提示词');
        }

        async function extractDirectory() {
            const error = document.getElementById('error');
            error.style.display = 'none';

            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                error.textContent = '❌ 请完整填写选中的 API 配置';
                error.style.display = 'block';
                addLog('AI提取目录失败', 'API配置不完整');
                return;
            }

            const allInputs = inputPairs.map(p => p.text).filter(t => t.trim()).join('\n\n');
            if (!allInputs) {
                error.textContent = '❌ 请先输入题目需求';
                error.style.display = 'block';
                addLog('AI提取目录失败', '输入内容为空');
                return;
            }

            addLog('AI提取目录', `使用模型: ${selectedApi.model}`);
            try {
                const response = await fetch('/api/extract-directory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(await buildApiRequestPayload(selectedApi, {
                        content: allInputs,
                        prompt: getPromptValue('directory')
                    }))
                });

                const data = await response.json();
                if (data.directory) {
                    setTextareaValue('directory', data.directory);
                    addLog('AI提取目录成功', `提取了 ${data.directory.split('\n').length} 行目录`);
                } else if (data.error) {
                    error.textContent = '❌ ' + data.error;
                    error.style.display = 'block';
                    addLog('AI提取目录失败', data.error);
                }
            } catch (e) {
                error.textContent = `❌ 提取失败: ${e.message}`;
                error.style.display = 'block';
                addLog('AI提取目录异常', e.message);
            }
        }

        async function generateFilename() {
            const error = document.getElementById('error');
            error.style.display = 'none';

            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                error.textContent = '❌ 请完整填写选中的 API 配置';
                error.style.display = 'block';
                addLog('AI生成文件名失败', 'API配置不完整');
                return;
            }

            const allInputs = inputPairs.map(p => p.text).filter(t => t.trim()).join('\n\n');
            if (!allInputs) {
                error.textContent = '❌ 请先输入题目需求';
                error.style.display = 'block';
                addLog('AI生成文件名失败', '输入内容为空');
                return;
            }

            addLog('AI生成文件名', `使用模型: ${selectedApi.model}`);
            try {
                const response = await fetch('/api/generate-filename', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(await buildApiRequestPayload(selectedApi, {
                        content: allInputs,
                        prompt: getPromptValue('filename')
                    }))
                });

                const data = await response.json();
                if (data.filename) {
                    document.getElementById('outputFilename').value = data.filename;
                    addLog('AI生成文件名成功', `文件名: ${data.filename}`);
                } else if (data.error) {
                    error.textContent = '❌ ' + data.error;
                    error.style.display = 'block';
                    addLog('AI生成文件名失败', data.error);
                }
            } catch (e) {
                error.textContent = `❌ 生成失败: ${e.message}`;
                error.style.display = 'block';
                addLog('AI生成文件名异常', e.message);
            }
        }

        async function loadEncryptionKey() {
            const response = await fetch('/api/encryption-key');
            const data = await response.json();
            encryptionKey = data.key;
        }

        async function loadTransportPublicKey() {
            const response = await fetch('/api/transport-public-key');
            const data = await response.json();
            transportPublicKey = {
                modulus: BigInt(`0x${data.modulus}`),
                exponent: BigInt(`0x${data.exponent}`),
                byteLength: Math.ceil(data.modulus.length / 2)
            };
        }

        function bytesToBigInt(bytes) {
            let hex = '';
            bytes.forEach(byte => hex += byte.toString(16).padStart(2, '0'));
            return BigInt(`0x${hex || '0'}`);
        }

        function bigIntToBytes(value, length) {
            let hex = value.toString(16);
            if (hex.length % 2) hex = `0${hex}`;
            const bytes = Uint8Array.from(hex.match(/.{2}/g).map(part => parseInt(part, 16)));
            if (bytes.length > length) {
                throw new Error('RSA 加密结果长度异常');
            }
            const output = new Uint8Array(length);
            output.set(bytes, length - bytes.length);
            return output;
        }

        function modPow(base, exponent, modulus) {
            let result = 1n;
            base %= modulus;
            while (exponent > 0n) {
                if (exponent & 1n) result = (result * base) % modulus;
                exponent >>= 1n;
                base = (base * base) % modulus;
            }
            return result;
        }

        function getNonZeroRandomBytes(length) {
            const bytes = new Uint8Array(length);
            let offset = 0;
            while (offset < length) {
                const chunk = new Uint8Array(length - offset);
                crypto.getRandomValues(chunk);
                for (const byte of chunk) {
                    if (byte !== 0) {
                        bytes[offset++] = byte;
                        if (offset === length) break;
                    }
                }
            }
            return bytes;
        }

        function encryptTransportValue(value) {
            if (!transportPublicKey) {
                throw new Error('API 传输加密未初始化');
            }
            const encoded = new TextEncoder().encode(String(value ?? ''));
            const keyLength = transportPublicKey.byteLength;
            if (encoded.length > keyLength - 11) {
                throw new Error('API URL/API Key 过长，无法使用当前 RSA 密钥加密');
            }
            const paddingLength = keyLength - encoded.length - 3;
            const padded = new Uint8Array(keyLength);
            padded[0] = 0x00;
            padded[1] = 0x02;
            padded.set(getNonZeroRandomBytes(paddingLength), 2);
            padded[2 + paddingLength] = 0x00;
            padded.set(encoded, 3 + paddingLength);

            const encrypted = modPow(
                bytesToBigInt(padded),
                transportPublicKey.exponent,
                transportPublicKey.modulus
            );
            const bytes = bigIntToBytes(encrypted, keyLength);
            let binary = '';
            bytes.forEach(byte => binary += String.fromCharCode(byte));
            return btoa(binary);
        }

        async function buildApiRequestPayload(apiConfig, extra = {}) {
            return {
                apiUrl: encryptTransportValue(apiConfig.url),
                apiKey: encryptTransportValue(apiConfig.key),
                model: apiConfig.model,
                ...extra
            };
        }

        function encrypt(text) {
            return CryptoJS.AES.encrypt(text, encryptionKey).toString();
        }

        function decrypt(ciphertext) {
            try {
                const bytes = CryptoJS.AES.decrypt(ciphertext, encryptionKey);
                return bytes.toString(CryptoJS.enc.Utf8);
            } catch {
                return '';
            }
        }

        function setCookie(name, value, days = 365) {
            const d = new Date();
            d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
            document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
        }

        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        }

        function createApiConfigId() {
            return (window.crypto?.randomUUID?.() || `api_${Date.now()}_${Math.random().toString(36).slice(2)}`);
        }

        function normalizeApiConfig(config = {}) {
            return {
                id: config.id || createApiConfigId(),
                name: String(config.name || '新配置'),
                url: String(config.url || ''),
                key: String(config.key || ''),
                model: String(config.model || ''),
                useContextCache: Boolean(config.useContextCache),
                selected: Boolean(config.selected)
            };
        }

        function ensureApiSelection() {
            if (apiConfigs.length > 0 && !apiConfigs.some(config => config.selected)) {
                apiConfigs[0].selected = true;
            }
        }

        function apiConfigFingerprint(config) {
            return [config.name, config.url, config.model]
                .map(value => String(value || '').trim().toLowerCase())
                .join('|');
        }

        function saveConfigs() {
            const encrypted = encrypt(JSON.stringify(apiConfigs.map(normalizeApiConfig)));
            setCookie('apiConfigs', encrypted);
        }

        function loadConfigs() {
            const encrypted = getCookie('apiConfigs');
            if (encrypted) {
                const decrypted = decrypt(encrypted);
                if (decrypted) {
                    try {
                        apiConfigs = JSON.parse(decrypted);
                    } catch (e) {
                        apiConfigs = [];
                    }
                }
            }
            if (!Array.isArray(apiConfigs) || apiConfigs.length === 0) {
                apiConfigs = [{name: 'OpenAI', url: 'https://api.openai.com/v1', key: '', model: 'gpt-4', selected: true}];
            }
            apiConfigs = apiConfigs.map(normalizeApiConfig);
            ensureApiSelection();
            saveConfigs();
            renderApiConfigs();
        }

        function renderApiConfigs() {
            const container = document.getElementById('apiConfigs');
            container.innerHTML = apiConfigs.map((config, idx) => `
                <form class="api-row" onsubmit="event.preventDefault()">
                    <input type="radio" name="selectedApi" ${config.selected ? 'checked' : ''} onchange="selectApi(${idx})">
                    <input id="api-name-${idx}" name="apiName${idx}" type="text" placeholder="名称" value="${escapeHTML(config.name)}" autocomplete="off" onchange="updateConfig(${idx}, 'name', this.value)">
                    <input id="api-url-${idx}" name="apiUrl${idx}" type="text" placeholder="API URL" value="${escapeHTML(config.url)}" autocomplete="url" onchange="updateConfig(${idx}, 'url', this.value)">
                    <input id="api-key-${idx}" name="apiKey${idx}" type="password" placeholder="API Key" value="${escapeHTML(config.key)}" autocomplete="off" onchange="updateConfig(${idx}, 'key', this.value)">
                    <input id="api-model-${idx}" name="apiModel${idx}" type="text" placeholder="Model" value="${escapeHTML(config.model)}" autocomplete="off" onchange="updateConfig(${idx}, 'model', this.value)">
                    <label class="api-cache-toggle" title="对比时把原文件放在消息前部，便于兼容支持前缀缓存的模型服务">
                        <input type="checkbox" ${config.useContextCache ? 'checked' : ''} onchange="updateConfig(${idx}, 'useContextCache', this.checked)">
                        <span>创建缓存</span>
                    </label>
                    <div class="action-btns">
                        <button class="small" onclick="testApiConfig(${idx})">
                            <i data-lucide="plug-zap"></i>
                            测试
                        </button>
                        <button class="small danger" onclick="deleteConfig(${idx})">删除</button>
                    </div>
                </form>
            `).join('');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        function addApiConfig() {
            apiConfigs.push(normalizeApiConfig({name: '新配置'}));
            ensureApiSelection();
            saveConfigs();
            renderApiConfigs();
            addLog('添加API配置', '新增了一个API配置');
        }

        function deleteConfig(idx) {
            const configName = apiConfigs[idx]?.name || '';
            apiConfigs.splice(idx, 1);
            if (apiConfigs.length === 0) {
                apiConfigs.push(normalizeApiConfig({name: '新配置', selected: true}));
            }
            ensureApiSelection();
            saveConfigs();
            renderApiConfigs();
            addLog('删除API配置', `删除了配置: ${configName}`);
        }

        function selectApi(idx) {
            apiConfigs.forEach((config, i) => config.selected = i === idx);
            saveConfigs();
            renderApiConfigs();
            addLog('切换API配置', `选择了配置: ${apiConfigs[idx].name}`);
        }

        function updateConfig(idx, field, value) {
            apiConfigs[idx][field] = value;
            saveConfigs();
        }

        function exportApiConfigs() {
            const payload = {
                version: 1,
                exportedAt: new Date().toISOString(),
                apiConfigs: apiConfigs.map(config => ({...normalizeApiConfig(config)}))
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `api_configs_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            addLog('导出API配置', `导出 ${payload.apiConfigs.length} 个配置`);
        }

        function importApiConfigs() {
            document.getElementById('apiImportFile').click();
        }

        async function handleApiConfigImport(event) {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
                const data = JSON.parse(await readFileAsText(file));
                const imported = Array.isArray(data) ? data : (data.apiConfigs || data.configs || []);
                if (!Array.isArray(imported)) {
                    throw new Error('导入文件格式不正确');
                }

                const existingById = new Map(apiConfigs.map((config, idx) => [config.id, idx]));
                const existingByFingerprint = new Map(apiConfigs.map((config, idx) => [apiConfigFingerprint(config), idx]));
                let added = 0;
                let updated = 0;

                imported.map(normalizeApiConfig).forEach(config => {
                    const fingerprint = apiConfigFingerprint(config);
                    const matchIndex = existingById.has(config.id)
                        ? existingById.get(config.id)
                        : existingByFingerprint.get(fingerprint);

                    if (matchIndex === undefined) {
                        config.selected = false;
                        apiConfigs.push(config);
                        added += 1;
                    } else {
                        apiConfigs[matchIndex] = {...apiConfigs[matchIndex], ...config, selected: apiConfigs[matchIndex].selected};
                        updated += 1;
                    }
                });

                ensureApiSelection();
                saveConfigs();
                renderApiConfigs();
                addLog('导入API配置', `新增 ${added} 个，更新 ${updated} 个`);
            } catch (e) {
                const error = document.getElementById('error');
                error.textContent = `API配置导入失败: ${e.message}`;
                error.style.display = 'block';
                addLog('导入API配置失败', e.message);
            } finally {
                event.target.value = '';
            }
        }

        async function testApiConfig(idx) {
            const config = apiConfigs[idx];
            const error = document.getElementById('error');
            error.style.display = 'none';

            if (!config || !config.url || !config.key || !config.model) {
                error.textContent = '请完整填写要测试的 API URL、API Key 和 Model';
                error.style.display = 'block';
                return;
            }

            addLog('测试API配置', `开始测试: ${config.name}`);
            try {
                const response = await fetch('/api/test-api', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(await buildApiRequestPayload(config))
                });
                const data = await response.json();
                if (!data.ok) {
                    throw new Error(data.error || '测试失败');
                }
                error.textContent = `API 测试成功: ${config.name}`;
                error.style.display = 'block';
                addLog('API测试成功', `${config.name}: ${data.message || 'OK'}`);
            } catch (e) {
                error.textContent = `API 测试失败: ${e.message}`;
                error.style.display = 'block';
                addLog('API测试失败', `${config.name}: ${e.message}`);
            }
        }

        function updateCharCount(id) {
            const pair = inputPairs.find(p => p.id === id);
            if (pair) {
                const textarea = document.querySelector(`#input-${id}`);
                pair.text = textarea.value;
                document.querySelector(`#count-${id}`).textContent = `${pair.text.length} 字`;
                updateEditorLineNumbers(textarea);
            }
        }

        function escapeHTML(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function enhanceTextEditors(root = document) {
            root.querySelectorAll('textarea').forEach(textarea => {
                if (textarea.closest('.editor-shell')) return;
                const shell = document.createElement('div');
                shell.className = 'editor-shell';
                const lines = document.createElement('div');
                lines.className = 'editor-lines';
                textarea.parentNode.insertBefore(shell, textarea);
                shell.append(lines, textarea);
                textarea.addEventListener('input', () => updateEditorLineNumbers(textarea));
                textarea.addEventListener('scroll', () => {
                    lines.scrollTop = textarea.scrollTop;
                });
                updateEditorLineNumbers(textarea);
            });
        }

        function scheduleEnhanceTextEditors() {
            if (editorEnhanceScheduled) return;
            editorEnhanceScheduled = true;
            requestAnimationFrame(() => {
                enhanceTextEditors();
                editorEnhanceScheduled = false;
            });
        }

        function updateEditorLineNumbers(textarea) {
            if (!textarea) return;
            const lines = textarea.closest('.editor-shell')?.querySelector('.editor-lines');
            if (!lines) return;
            const count = Math.max(1, String(textarea.value || '').split('\n').length);
            lines.textContent = Array.from({length: count}, (_, idx) => idx + 1).join('\n');
            lines.scrollTop = textarea.scrollTop;
        }

        function setTextareaValue(id, value) {
            const textarea = document.getElementById(id);
            if (!textarea) return;
            textarea.value = value;
            updateEditorLineNumbers(textarea);
        }

        function getReplacementTargets(scope) {
            if (scope === 'inputs') {
                return inputPairs.map(pair => document.getElementById(`input-${pair.id}`)).filter(Boolean);
            }
            if (scope === 'outputs') {
                return outputPairs.flatMap(pair => [
                    document.getElementById(`editable-${pair.id}`),
                    document.getElementById(`full-${pair.id}`)
                ]).filter(Boolean);
            }
            return Array.from(document.querySelectorAll('textarea'));
        }

        function resetReplacementDefaults() {
            document.getElementById('replacePattern').value = `['"]|'''|"""`;
            document.getElementById('replaceValue').value = '';
            document.getElementById('replaceRegex').checked = true;
            addLog('重置替换规则', '已恢复移除单引号、双引号、三引号的默认规则');
        }

        function applyConsoleReplacement() {
            const scope = document.getElementById('replaceScope').value;
            const pattern = document.getElementById('replacePattern').value;
            const replacement = document.getElementById('replaceValue').value;
            const useRegex = document.getElementById('replaceRegex').checked;
            if (!pattern) {
                addLog('替换失败', '匹配规则为空');
                return;
            }

            let matcher;
            try {
                matcher = useRegex ? new RegExp(pattern, 'g') : pattern;
            } catch (e) {
                addLog('替换失败', `正则无效: ${e.message}`);
                return;
            }

            let changed = 0;
            getReplacementTargets(scope).forEach(textarea => {
                const before = textarea.value;
                const after = useRegex ? before.replace(matcher, replacement) : before.split(matcher).join(replacement);
                if (after !== before) {
                    textarea.value = after;
                    textarea.dispatchEvent(new Event('input', {bubbles: true}));
                    updateEditorLineNumbers(textarea);
                    changed += 1;
                }
            });
            addLog('执行文本替换', `范围: ${scope}, 修改 ${changed} 个文本框`);
        }

        async function matchQuestionTypesWithAI() {
            const error = document.getElementById('error');
            if (error) error.style.display = 'none';
            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                if (error) {
                    error.textContent = '请完整填写选中的 API 配置';
                    error.style.display = 'block';
                }
                addLog('AI匹配题型失败', 'API配置不完整');
                return;
            }
            const allInputs = inputPairs.map(p => p.text).filter(t => t.trim()).join('\n\n');
            if (!allInputs) {
                addLog('AI匹配题型失败', '输入内容为空');
                return;
            }

            addLog('AI匹配题型', `候选 ${availableQuestionTypes.length} 种`);
            try {
                const response = await fetch('/api/match-question-types', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(await buildApiRequestPayload(selectedApi, {
                        content: allInputs,
                        questionTypes: availableQuestionTypes,
                        prompt: getPromptValue('typeMatch')
                    }))
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error);
                const matched = Array.isArray(data.questionTypes) ? data.questionTypes : [];
                if (matched.length) {
                    setSelectedTypes(matched);
                    addLog('AI匹配题型成功', matched.join(', '));
                } else {
                    addLog('AI匹配题型完成', '未匹配到候选题型，保留当前选择');
                }
            } catch (e) {
                addLog('AI匹配题型异常', e.message);
            }
        }

        function renderMarkdown(text) {
            const source = String(text || '');
            if (!source.trim()) return '';
            if (window.marked && window.DOMPurify) {
                marked.setOptions({breaks: true, gfm: true});
                return DOMPurify.sanitize(marked.parse(source));
            }
            return escapeHTML(source).replace(/\n/g, '<br>');
        }

        function updateMarkdownElement(element, text, fallback = '') {
            if (!element) return;
            const raw = String(text || '');
            element.dataset.rawText = raw;
            element.innerHTML = raw.trim() ? renderMarkdown(raw) : escapeHTML(fallback);
            element.scrollTop = element.scrollHeight;
        }

        function loadEditableQuestionTypes(fallbackTypes = []) {
            try {
                const stored = JSON.parse(localStorage.getItem(QUESTION_TYPES_STORAGE_KEY) || '[]');
                if (Array.isArray(stored) && stored.length) {
                    return [...new Set(stored.map(item => String(item).trim()).filter(Boolean))];
                }
            } catch {}
            return [...new Set(fallbackTypes.map(item => String(item).trim()).filter(Boolean))];
        }

        function saveEditableQuestionTypes() {
            localStorage.setItem(QUESTION_TYPES_STORAGE_KEY, JSON.stringify(availableQuestionTypes));
        }

        function renderQuestionTypes() {
            const container = document.getElementById('questionTypesContainer');
            const types = availableQuestionTypes;
            if (!container) return;
            if (types.length === 0) {
                container.innerHTML = '<div style="color: #718096; padding: 20px; text-align: center;">未找到题型</div>';
                return;
            }

            const typeCounts = {};
            types.forEach(type => {
                const count = sampleData.questions?.filter(q => q['题型 （必填）'] === type).length || 0;
                typeCounts[type] = count;
            });

            container.innerHTML = `
                <div class="type-picker-head">
                    <div class="type-picker-summary">
                        <div class="type-picker-kicker">
                            <i data-lucide="list-filter"></i>
                            <span>题型选择</span>
                            <span class="type-count-pill" id="typeCountPill">0 / ${types.length}</span>
                        </div>
                    </div>
                    <div class="type-picker-actions">
                        <button class="small" onclick="selectAllQuestionTypes()">
                            <i data-lucide="check-check"></i>
                            全选
                        </button>
                        <button class="small" onclick="clearQuestionTypes()">
                            <i data-lucide="x"></i>
                            清空
                        </button>
                        <button class="small" onclick="openPromptEditor('typeMatch')">
                            <i data-lucide="message-square-text"></i>
                            提示词
                        </button>
                        <button class="small" onclick="matchQuestionTypesWithAI()">
                            <i data-lucide="wand-sparkles"></i>
                            AI 匹配
                        </button>
                        <button class="small" onclick="addQuestionTypeFromUI()">
                            <i data-lucide="plus"></i>
                            新增题型
                        </button>
                    </div>
                </div>
                <div class="type-summary" id="typeSummary">尚未选择题型</div>
                <div class="question-types">
                    ${types.map((type, idx) => `
                        <div class="type-item" data-type="${escapeHTML(type)}">
                            <button class="type-card-main" type="button" aria-pressed="${selectedTypes.includes(type) ? 'true' : 'false'}">
                                <span class="type-check"><i data-lucide="check"></i></span>
                                <span>
                                    <input id="question-type-${idx}" name="questionType${idx}" type="text" class="type-name-input" value="${escapeHTML(type)}" onclick="event.stopPropagation()" onchange="renameQuestionType(${idx}, this.value)" aria-label="题型名称" readonly>
                                    <span class="type-meta">
                                        <i data-lucide="layers-3"></i>
                                        ${typeCounts[type]} 个示例
                                    </span>
                                </span>
                            </button>
                            <div class="action-btns">
                                <button type="button" onclick="event.stopPropagation(); showExplanation(this.closest('.type-item').dataset.type)" title="查看说明">
                                    <i data-lucide="info"></i>
                                    说明
                                </button>
                                <button type="button" onclick="event.stopPropagation(); previewJSON(this.closest('.type-item').dataset.type)" title="预览示例">
                                    <i data-lucide="eye"></i>
                                    示例
                                </button>
                                <button type="button" onclick="event.stopPropagation(); toggleQuestionTypeEdit(${idx}, this)" title="编辑题型">
                                    <i data-lucide="pencil"></i>
                                    编辑
                                </button>
                                <button type="button" onclick="event.stopPropagation(); deleteQuestionType(${idx})" title="删除题型">
                                    <i data-lucide="trash-2"></i>
                                    删除
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            document.querySelectorAll('.type-item').forEach(item => {
                item.classList.toggle('active', selectedTypes.includes(item.dataset.type));
                const typeBtn = item.querySelector('.type-card-main');
                typeBtn.addEventListener('click', event => {
                    if (event.target.closest('input')) return;
                    const type = item.dataset.type;
                    item.classList.toggle('active');
                    if (selectedTypes.includes(type)) {
                        selectedTypes = selectedTypes.filter(t => t !== type);
                        addLog('取消题型', type);
                    } else {
                        selectedTypes.push(type);
                        addLog('选择题型', type);
                    }
                    typeBtn.setAttribute('aria-pressed', item.classList.contains('active') ? 'true' : 'false');
                    setCookie('questionTypes', encrypt(JSON.stringify(selectedTypes)));
                    updateTypeSummary();
                });
            });

            updateTypeSummary();
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        function addQuestionTypeFromUI() {
            let base = '新题型';
            let candidate = base;
            let i = 1;
            while (availableQuestionTypes.includes(candidate)) {
                candidate = `${base}${i++}`;
            }
            availableQuestionTypes.push(candidate);
            selectedTypes = [candidate];
            saveEditableQuestionTypes();
            renderQuestionTypes();
            addLog('新增题型', candidate);
        }

        function toggleQuestionTypeEdit(index, button) {
            const input = document.getElementById(`question-type-${index}`);
            if (!input || !button) return;

            const isReadonly = input.hasAttribute('readonly');
            if (isReadonly) {
                input.removeAttribute('readonly');
                input.dataset.originalValue = input.value;
                input.focus();
                input.select();
                button.innerHTML = '<i data-lucide="check"></i> 保存';
                button.title = '保存题型';
            } else {
                renameQuestionType(index, input.value);
                button.innerHTML = '<i data-lucide="pencil"></i> 编辑';
                button.title = '编辑题型';
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        function renameQuestionType(index, value) {
            const oldType = availableQuestionTypes[index];
            const newType = String(value || '').trim();
            const input = document.getElementById(`question-type-${index}`);
            if (!newType) {
                if (input) {
                    input.value = oldType;
                    input.setAttribute('readonly', 'readonly');
                }
                renderQuestionTypes();
                return;
            }
            if (newType !== oldType && availableQuestionTypes.includes(newType)) {
                if (input) {
                    input.value = oldType;
                    input.setAttribute('readonly', 'readonly');
                }
                addLog('编辑题型失败', `题型已存在: ${newType}`);
                renderQuestionTypes();
                return;
            }
            availableQuestionTypes[index] = newType;
            selectedTypes = selectedTypes.map(type => type === oldType ? newType : type);
            questionTypeExplanations[newType] = questionTypeExplanations[oldType] || '自定义题型';
            if (oldType !== newType && Object.prototype.hasOwnProperty.call(questionTypeExplanations, oldType)) {
                delete questionTypeExplanations[oldType];
            }
            saveEditableQuestionTypes();
            setCookie('questionTypes', encrypt(JSON.stringify(selectedTypes)));
            if (input) {
                input.value = newType;
                input.setAttribute('readonly', 'readonly');
            }
            renderQuestionTypes();
            addLog('编辑题型', `${oldType} -> ${newType}`);
        }

        function deleteQuestionType(index) {
            const removed = availableQuestionTypes.splice(index, 1)[0];
            selectedTypes = selectedTypes.filter(type => type !== removed);
            if (!selectedTypes.length && availableQuestionTypes.length) {
                selectedTypes = [availableQuestionTypes[0]];
            }
            saveEditableQuestionTypes();
            setCookie('questionTypes', encrypt(JSON.stringify(selectedTypes)));
            renderQuestionTypes();
            addLog('删除题型', removed);
        }

        function getCompareResultText() {
            const resultEl = document.getElementById('compareResult');
            const scoreEl = document.getElementById('compareScoreResult');
            const scoreText = scoreEl?.dataset.rawText || scoreEl?.textContent || '';
            const reviewText = resultEl?.dataset.rawText || resultEl?.textContent || '';
            return [scoreText, reviewText].filter(Boolean).join('\n\n');
        }

        function updateTypeSummary() {
            const summary = document.getElementById('typeSummary');
            const countPill = document.getElementById('typeCountPill');
            if (!summary) return;
            if (countPill) {
                countPill.textContent = `${selectedTypes.length} / ${availableQuestionTypes.length || 0}`;
            }
            if (!selectedTypes.length) {
                summary.innerHTML = '<span class="type-summary-placeholder">尚未选择，点击卡片即可多选</span>';
                return;
            }
            const visibleTypes = selectedTypes.slice(0, 4);
            const moreCount = selectedTypes.length - visibleTypes.length;
            const chips = visibleTypes.map(type => `<span class="type-chip">${escapeHTML(type)}</span>`);
            if (moreCount > 0) {
                chips.push(`<span class="type-chip">+${moreCount}</span>`);
            }
            summary.innerHTML = chips.join('');
        }

        function setSelectedTypes(types) {
            selectedTypes = [...new Set(types.filter(Boolean))];
            document.querySelectorAll('.type-item').forEach(item => {
                item.classList.toggle('active', selectedTypes.includes(item.dataset.type));
                const typeBtn = item.querySelector('.type-card-main');
                if (typeBtn) {
                    typeBtn.setAttribute('aria-pressed', item.classList.contains('active') ? 'true' : 'false');
                }
            });
            setCookie('questionTypes', encrypt(JSON.stringify(selectedTypes)));
            updateTypeSummary();
        }

        function selectAllQuestionTypes() {
            setSelectedTypes(availableQuestionTypes);
            addLog('选择全部题型', `共 ${selectedTypes.length} 种题型`);
        }

        function clearQuestionTypes() {
            setSelectedTypes([]);
            addLog('清空题型', '已取消全部题型选择');
        }

        function isPairGenerating(pairId) {
            return activeGenerations.has(pairId);
        }

        function isPairStopping(pairId) {
            return Boolean(activeGenerations.get(pairId)?.stopping);
        }

        function hasGeneratedOutput() {
            return outputPairs.some(pair => pair.editable && pair.editable.trim());
        }

        function normalizeGenerationProgress(progress = {}) {
            const status = progress.status || 'idle';
            const charCount = Number.isFinite(progress.charCount) ? progress.charCount : 0;
            const questionCount = Number.isFinite(progress.questionCount) ? progress.questionCount : 0;
            const labels = {
                idle: '等待',
                queued: '排队中',
                running: '生成中',
                done: '已完成',
                error: '失败',
                cancelled: '已取消',
                stopped: '已停止'
            };
            let detail = progress.detail || `${charCount} 字`;
            if (status === 'done' && questionCount > 0) {
                detail = `${questionCount} 题 · ${charCount} 字`;
            }
            if ((status === 'error' || status === 'cancelled') && progress.error) {
                detail = progress.error;
            }
            return {
                status,
                label: labels[status] || labels.idle,
                detail,
                charCount,
                questionCount,
                error: progress.error || null
            };
        }

        function getProgressClass(status) {
            if (status === 'running' || status === 'queued') return `progress-${status}`;
            if (status === 'done' || status === 'error' || status === 'cancelled') return `progress-${status}`;
            if (status === 'stopped') return 'progress-cancelled';
            return 'progress-idle';
        }

        function renderGenerationProgressBox(pair) {
            const progress = normalizeGenerationProgress(pair.progress);
            return `
                <div class="generation-progress-row">
                    <div id="progress-${pair.id}" class="generation-progress-box ${getProgressClass(progress.status)}" title="${escapeHTML(progress.detail)}">
                        <span class="progress-dot"></span>
                        <span class="progress-main">${escapeHTML(progress.label)}</span>
                        <span class="progress-detail">${escapeHTML(progress.detail)}</span>
                    </div>
                </div>
            `;
        }

        function setGenerationProgress(pairId, progress) {
            const outputPair = outputPairs.find(pair => pair.id === pairId);
            const normalized = normalizeGenerationProgress(progress);
            if (outputPair) {
                outputPair.progress = normalized;
            }

            const progressEl = document.getElementById(`progress-${pairId}`);
            if (progressEl) {
                progressEl.className = `generation-progress-box ${getProgressClass(normalized.status)}`;
                progressEl.title = normalized.detail;
                progressEl.innerHTML = `
                    <span class="progress-dot"></span>
                    <span class="progress-main">${escapeHTML(normalized.label)}</span>
                    <span class="progress-detail">${escapeHTML(normalized.detail)}</span>
                `;
            }
        }

        function getBatchConcurrency() {
            const input = document.getElementById('batchConcurrency');
            const value = parseInt(input?.value, 10);
            if (!Number.isFinite(value) || value < 1) {
                if (input) input.value = 20;
                return 20;
            }

            const normalized = Math.min(value, 100);
            if (input && normalized !== value) {
                input.value = normalized;
            }
            return normalized;
        }

        function updateGenerationModeControls() {
            const concurrencyInput = document.getElementById('batchConcurrency');
            const isBusy = batchGenerating || activeGenerations.size > 0;

            if (concurrencyInput) {
                concurrencyInput.disabled = isBusy;
            }
        }

        function updateGlobalGenerationControls() {
            const hasActiveGeneration = activeGenerations.size > 0;
            const generateBtn = document.getElementById('generateBtn');
            const stopAllBtn = document.getElementById('stopAllBtn');

            if (generateBtn) {
                generateBtn.disabled = batchGenerating || hasActiveGeneration;
            }
            if (stopAllBtn) {
                stopAllBtn.disabled = !hasActiveGeneration && !batchGenerating;
            }
            setExportButtonsDisabled(hasActiveGeneration || !hasGeneratedOutput());
            updateGlobalProgressDisplay();
            updateGenerationModeControls();
        }

        function setExportButtonsDisabled(disabled) {
            ['exportBtn', 'exportWordBtn', 'exportJsonBtn', 'exportConvertBtn'].forEach(id => {
                const button = document.getElementById(id);
                if (button) button.disabled = disabled;
            });
        }

        function updateGenerationControls(pairId) {
            const regenBtn = document.getElementById(`regen-${pairId}`);
            const stopBtn = document.getElementById(`stop-gen-${pairId}`);
            const generating = isPairGenerating(pairId);
            const stopping = isPairStopping(pairId);

            if (regenBtn) {
                regenBtn.disabled = batchGenerating && !generating;
                regenBtn.innerHTML = `
                    <i data-lucide="refresh-cw"></i>
                    ${batchGenerating && !generating ? '批量生成中' : (generating ? '打断并重新生成' : '重新生成')}
                `;
            }
            if (stopBtn) {
                stopBtn.disabled = !generating || stopping;
                stopBtn.innerHTML = `
                    <i data-lucide="square"></i>
                    ${stopping ? '停止中' : '停止'}
                `;
            }
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            updateGlobalGenerationControls();
        }

        function clearActiveGeneration(pairId, runId) {
            const active = activeGenerations.get(pairId);
            if (active && active.runId === runId) {
                activeGenerations.delete(pairId);
                updateGenerationControls(pairId);
            }
        }

        function stopSingleGeneration(pairId, options = {}) {
            const active = activeGenerations.get(pairId);
            if (!active) return false;

            const affectedIds = [];
            activeGenerations.forEach((generation, id) => {
                if (generation === active || generation.controller === active.controller || (active.backendJobId && generation.backendJobId === active.backendJobId)) {
                    generation.stopping = true;
                    affectedIds.push(id);
                    if (options.forceClear) {
                        activeGenerations.delete(id);
                    }
                }
            });

            active.controller.abort();
            if (active.backendJobId) {
                fetch(`/api/generate-batch-stream/${encodeURIComponent(active.backendJobId)}`, {method: 'DELETE'}).catch(() => {});
            }
            if (options.forceClear) {
                activeGenerations.delete(pairId);
            }
            affectedIds.forEach(id => {
                setGenerationProgress(id, {status: 'stopped', detail: '已请求停止'});
                updateGenerationControls(id);
            });

            if (!options.silent) {
                addLog(`停止生成 #${pairId + 1}`, '已发送停止请求');
            }
            return true;
        }

        function stopAllGenerations(options = {}) {
            const ids = Array.from(activeGenerations.keys());
            ids.forEach(pairId => stopSingleGeneration(pairId, {...options, forceClear: true}));
        }

        async function cancelAllGenerationTasks() {
            stopAllGenerations({silent: true, forceClear: true});
            try {
                await fetch('/api/generate-batch-stream', {method: 'DELETE'});
            } catch (e) {
                console.warn('取消后台任务失败:', e);
            }
            batchGenerating = false;
            inputPairs.forEach(pair => {
                setGenerationProgress(pair.id, {status: 'stopped', detail: '已结束'});
                updateGenerationControls(pair.id);
            });
            updateGlobalGenerationControls();
            addLog('结束全部任务', '已取消界面和后端全部生成任务');
        }

        function updateGlobalProgressFromJob(data) {
            if (!data) return;
            globalGenerationProgress = {
                completed: data.completedCount || 0,
                total: data.total || 0,
                status: data.status || 'idle'
            };
            updateGlobalProgressDisplay();
        }

        function updateGlobalProgressDisplay() {
            const el = document.getElementById('globalProgressText');
            if (!el) return;
            const {completed, total, status} = globalGenerationProgress;
            const done = total > 0 && completed >= total && status === 'done';
            const cancelled = status === 'cancelled';
            el.textContent = done ? `${completed}/${total} 完成` : (cancelled ? `${completed}/${total} 已取消` : `${completed}/${total}`);
        }

        function updateOutputFull(pairId, text, shouldScroll = false) {
            const outputPair = outputPairs.find(pair => pair.id === pairId);
            if (outputPair) {
                outputPair.full = text;
            }

            const fullEl = document.getElementById(`full-${pairId}`);
            if (fullEl) {
                fullEl.value = text;
                updateEditorLineNumbers(fullEl);
                if (shouldScroll) {
                    fullEl.scrollTop = fullEl.scrollHeight;
                }
            }
        }

        function updateOutputEditable(pairId, text) {
            const outputPair = outputPairs.find(pair => pair.id === pairId);
            if (outputPair) {
                outputPair.editable = text;
            }

            const editableEl = document.getElementById(`editable-${pairId}`);
            if (editableEl) {
                editableEl.value = text;
                updateEditorLineNumbers(editableEl);
            }
        }

        function addInputPair() {
            inputPairs.push({id: nextId++, text: ''});
            outputPairs.push({id: inputPairs[inputPairs.length - 1].id, editable: '', full: ''});
            renderInputPairs();
            renderOutputPairs();
            addLog('添加输入框', `当前共 ${inputPairs.length} 个输入框`);
        }

        function deleteInputPair(id) {
            const idx = inputPairs.findIndex(p => p.id === id);
            if (idx > -1 && inputPairs.length > 1) {
                stopSingleGeneration(id, {silent: true, forceClear: true});
                inputPairs.splice(idx, 1);
                outputPairs.splice(idx, 1);
                renderInputPairs();
                renderOutputPairs();
                addLog('删除输入框', `剩余 ${inputPairs.length} 个输入框`);
            }
        }

        function splitInputPair(id) {
            const idx = inputPairs.findIndex(p => p.id === id);
            if (idx === -1) return;

            const textarea = document.querySelector(`#input-${id}`);
            const text = textarea.value;
            const splitPos = Math.floor(text.length / 2);

            const firstHalf = text.substring(0, splitPos);
            const secondHalf = text.substring(splitPos);

            inputPairs[idx].text = firstHalf;
            inputPairs.splice(idx + 1, 0, {id: nextId++, text: secondHalf});
            outputPairs.splice(idx + 1, 0, {id: inputPairs[idx + 1].id, editable: '', full: ''});

            renderInputPairs();
            renderOutputPairs();
            addLog('切分输入框', `输入 #${id + 1} 已切分为两部分`);

            setTimeout(() => {
                const firstTextarea = document.querySelector(`#input-${id}`);
                const secondTextarea = document.querySelector(`#input-${inputPairs[idx + 1].id}`);
                if (firstTextarea) {
                    firstTextarea.scrollTop = firstTextarea.scrollHeight;
                }
                if (secondTextarea) {
                    secondTextarea.scrollTop = 0;
                }
            }, 0);
        }

        function renderInputPairs() {
            const container = document.getElementById('inputPairs');
            container.innerHTML = inputPairs.map(pair => `
                <div class="input-pair">
                    <div class="input-header">
                        <button type="button" class="pair-link" onclick="jumpToOutput(${pair.id})" title="跳转到对应输出">输入 #${pair.id + 1}</button>
                        <span class="char-count" id="count-${pair.id}">${pair.text.length} 字</span>
                    </div>
                    <textarea id="input-${pair.id}" oninput="updateCharCount(${pair.id})" placeholder="请输入题目需求">${escapeHTML(pair.text)}</textarea>
                    <div class="input-actions">
                        <button class="small" onclick="splitInputPair(${pair.id})">
                            <i data-lucide="scissors"></i>
                            切分
                        </button>
                        ${inputPairs.length > 1 ? `<button class="small danger" onclick="deleteInputPair(${pair.id})">
                            <i data-lucide="trash-2"></i>
                            删除
                        </button>` : ''}
                    </div>
                </div>
            `).join('');
            scheduleEnhanceTextEditors();
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        function renderOutputPairs() {
            const container = document.getElementById('outputPairs');
            container.innerHTML = outputPairs.map((pair, idx) => `
                <div class="output-pair">
                    <div class="output-pair-header">
                        <button type="button" class="pair-link" onclick="jumpToInput(${pair.id})" title="跳转到对应输入">输出 #${pair.id + 1} <span id="q-count-${pair.id}" style="color: #6366f1;"></span></button>
                        <div class="output-actions">
                            <button id="regen-${pair.id}" class="small" onclick="regenerateSingle(${pair.id})" ${batchGenerating && !isPairGenerating(pair.id) ? 'disabled' : ''}>
                                <i data-lucide="refresh-cw"></i>
                                ${batchGenerating && !isPairGenerating(pair.id) ? '批量生成中' : (isPairGenerating(pair.id) ? '打断并重新生成' : '重新生成')}
                            </button>
                            <button id="stop-gen-${pair.id}" class="small danger" onclick="stopSingleGeneration(${pair.id})" ${isPairGenerating(pair.id) && !isPairStopping(pair.id) ? '' : 'disabled'}>
                                <i data-lucide="square"></i>
                                ${isPairStopping(pair.id) ? '停止中' : '停止'}
                            </button>
                        </div>
                    </div>
                    <div class="output-grid">
                        <div>
                            <div class="field-label">可编辑 JSON</div>
                            <textarea class="output" id="editable-${pair.id}" oninput="updateEditableFromEdit(${pair.id}); validateJSON(${pair.id})" style="background: white; color: #2d3748; border: 2px solid #e2e8f0;" placeholder="等待生成...">${escapeHTML(pair.editable)}</textarea>
                            <div class="validation-error" id="validation-error-${pair.id}" style="display: none;"></div>
                        </div>
                        <div>
                            <div class="field-label">完整输出</div>
                            <div class="locked-output-toolbar">
                                <button id="full-edit-${pair.id}" class="small icon-only" onclick="toggleFullOutputLock(${pair.id})" title="编辑完整输出">
                                    <i data-lucide="pencil"></i>
                                </button>
                                <button class="small danger icon-only" onclick="clearOutputPair(${pair.id})" title="删除该输出内容">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            </div>
                            <textarea class="output" id="full-${pair.id}" oninput="updateFullOutputFromEdit(${pair.id})" readonly placeholder="等待生成...">${pair.full ? escapeHTML(pair.full) : ''}</textarea>
                        </div>
                    </div>
                    <div id="compare-result-${pair.id}" style="margin-top: 10px; display: none;">
                        <div class="field-label">对比结果</div>
                        <div class="compare-markdown" id="compare-output-${pair.id}" data-raw-text="">等待对比...</div>
                    </div>
                    ${renderGenerationProgressBox(pair)}
                </div>
            `).join('');
            scheduleEnhanceTextEditors();
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        function jumpToInput(pairId) {
            const inputEl = document.getElementById(`input-${pairId}`);
            if (!inputEl) return;
            inputEl.scrollIntoView({behavior: 'smooth', block: 'center'});
            inputEl.focus();
        }

        function jumpToOutput(pairId) {
            const outputEl = document.getElementById(`editable-${pairId}`) || document.getElementById(`full-${pairId}`);
            if (!outputEl) return;
            outputEl.scrollIntoView({behavior: 'smooth', block: 'center'});
            outputEl.focus();
        }

        function toggleFullOutputLock(pairId) {
            const textarea = document.getElementById(`full-${pairId}`);
            const button = document.getElementById(`full-edit-${pairId}`);
            if (!textarea || !button) return;
            textarea.readOnly = !textarea.readOnly;
            button.innerHTML = textarea.readOnly
                ? '<i data-lucide="pencil"></i>'
                : '<i data-lucide="check"></i>';
            button.title = textarea.readOnly ? '编辑完整输出' : '保存并锁定完整输出';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function clearOutputPair(pairId) {
            updateOutputFull(pairId, '');
            updateOutputEditable(pairId, '');
            setGenerationProgress(pairId, {status: 'idle', detail: '等待'});
            validateJSON(pairId);
            addLog(`清空输出 #${pairId + 1}`, '已删除当前输出内容');
        }

        function updateFullOutputFromEdit(pairId) {
            const outputPair = outputPairs.find(pair => pair.id === pairId);
            const textarea = document.getElementById(`full-${pairId}`);
            if (outputPair && textarea) {
                outputPair.full = textarea.value;
                updateEditorLineNumbers(textarea);
            }
        }

        function updateEditableFromEdit(pairId) {
            const outputPair = outputPairs.find(pair => pair.id === pairId);
            const textarea = document.getElementById(`editable-${pairId}`);
            if (outputPair && textarea) {
                outputPair.editable = textarea.value;
                updateEditorLineNumbers(textarea);
            }
        }

        function exportInputs() {
            const data = {
                version: 2,
                exportedAt: new Date().toISOString(),
                outputFilename: document.getElementById('outputFilename')?.value || 'exam_questions',
                questionTypes: selectedTypes,
                directory: document.getElementById('directory')?.value || '',
                inputs: inputPairs.map(p => p.text)
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'split_inputs.json';
            a.click();
            URL.revokeObjectURL(url);
            addLog('导出切分', `导出了 ${inputPairs.length} 个输入`);
        }

        function importInputs() {
            document.getElementById('importFile').click();
        }

        function decodeTextBuffer(buffer) {
            try {
                return new TextDecoder('utf-8', {fatal: true}).decode(buffer);
            } catch (err) {
                try {
                    return new TextDecoder('gb18030').decode(buffer);
                } catch (fallbackErr) {
                    return new TextDecoder('utf-8').decode(buffer);
                }
            }
        }

        function readFileAsText(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(decodeTextBuffer(e.target.result));
                reader.onerror = () => reject(new Error(`无法读取文件: ${file.name}`));
                reader.readAsArrayBuffer(file);
            });
        }

        function isJsonFile(file) {
            return /\.json$/i.test(file.name) || file.type === 'application/json';
        }

        function isTxtFile(file) {
            return /\.txt$/i.test(file.name) || file.type === 'text/plain';
        }

        function applyImportedInputs(inputs, detail) {
            stopAllGenerations({silent: true});
            const normalizedInputs = inputs.map(text => String(text ?? ''));
            if (normalizedInputs.length === 0) {
                throw new Error('导入文件中没有可用输入');
            }

            inputPairs = normalizedInputs.map((text, i) => ({id: i, text}));
            outputPairs = inputPairs.map(p => ({id: p.id, editable: '', full: ''}));
            nextId = inputPairs.length;
            renderInputPairs();
            renderOutputPairs();
            addLog('导入切分', detail);
        }

        function applyImportedMetadata(data) {
            if (!data || Array.isArray(data)) return;
            if (data.outputFilename) {
                document.getElementById('outputFilename').value = String(data.outputFilename);
            }
            if (Array.isArray(data.questionTypes)) {
                const importedTypes = data.questionTypes.map(type => String(type).trim()).filter(Boolean);
                importedTypes.forEach(type => {
                    if (!availableQuestionTypes.includes(type)) {
                        availableQuestionTypes.push(type);
                    }
                });
                setSelectedTypes(importedTypes);
                saveEditableQuestionTypes();
                renderQuestionTypes();
            }
            if (typeof data.directory === 'string') {
                setTextareaValue('directory', data.directory);
            }
        }

        async function handleImport(event) {
            const files = Array.from(event.target.files || []);
            if (files.length === 0) return;

            try {
                if (files.length === 1 && isJsonFile(files[0])) {
                    const data = JSON.parse(await readFileAsText(files[0]));
                    if (!data || !Array.isArray(data.inputs)) {
                        throw new Error('JSON 文件格式不正确，应包含 inputs 数组');
                    }
                    applyImportedMetadata(data);
                    applyImportedInputs(data.inputs, `从 JSON 导入了 ${data.inputs.length} 个输入`);
                } else {
                    const invalidFiles = files.filter(file => !isTxtFile(file));
                    if (invalidFiles.length > 0) {
                        throw new Error(`多文件导入仅支持 TXT，请检查: ${invalidFiles.map(file => file.name).join(', ')}`);
                    }
                    const importedTexts = await Promise.all(files.map(file => readFileAsText(file)));
                    applyImportedInputs(
                        importedTexts,
                        `从 ${importedTexts.length} 个 TXT 文件导入了 ${importedTexts.length} 个输入`
                    );
                }
            } catch (err) {
                alert('导入失败: ' + err.message);
                addLog('导入切分失败', err.message);
            } finally {
                event.target.value = '';
            }
        }

        function extractJSON(text) {
            // This new function is more robust against common AI formatting errors.
            // It finds the first ```json and the next ``` after it.
            const jsonStartMarker = "```json";
            const startIndex = text.indexOf(jsonStartMarker);

            if (startIndex === -1) {
                // If no ```json marker, it might be a raw JSON response.
                const firstBrace = text.indexOf('{');
                const lastBrace = text.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace > firstBrace) {
                    const potentialJson = text.substring(firstBrace, lastBrace + 1);
                    try {
                        JSON.parse(potentialJson); // Test if it's valid
                        addLog('JSON 提取', '检测到无代码块的裸JSON格式');
                        return potentialJson;
                    } catch (e) {
                        // Not valid JSON, fall through to return empty
                    }
                }
                return ''; // No JSON block found
            }

            const jsonEndMarker = "```";
            // Start searching for the end marker *after* the start marker.
            const endIndex = text.indexOf(jsonEndMarker, startIndex + jsonStartMarker.length);

            if (endIndex === -1) {
                // This can happen if the response is truncated.
                // We'll take everything from the start marker to the end of the string.
                const potentialJson = text.substring(startIndex + jsonStartMarker.length);
                addLog('JSON 提取警告', '找到了 "```json" 但未找到结束的 "```"');
                return potentialJson.trim();
            }

            // We have a start and an end. Extract the content.
            const jsonContent = text.substring(startIndex + jsonStartMarker.length, endIndex);
            return jsonContent.trim();
        }

        function waitWithSignal(ms, signal) {
            return new Promise((resolve, reject) => {
                if (signal?.aborted) {
                    reject(new DOMException('Aborted', 'AbortError'));
                    return;
                }
                const timer = setTimeout(resolve, ms);
                signal?.addEventListener('abort', () => {
                    clearTimeout(timer);
                    reject(new DOMException('Aborted', 'AbortError'));
                }, {once: true});
            });
        }

        async function startBackendStreamingBatch(items, signal, concurrency = getBatchConcurrency()) {
            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                throw new Error('API配置不完整');
            }
            const response = await fetch('/api/generate-batch-stream/start', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                signal,
                body: JSON.stringify(await buildApiRequestPayload(selectedApi, {
                    questionTypes: selectedTypes,
                    items,
                    systemPrompt: getPromptValue('generation'),
                    directory: document.getElementById('directory').value,
                    concurrency
                }))
            });

            if (!response.ok) {
                throw new Error(`请求失败: HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }
            if (!data.jobId || !Array.isArray(data.results)) {
                throw new Error('后台任务返回格式不正确');
            }
            return data;
        }

        async function pollBackendStreamingJob(jobId, signal, onProgress) {
            let latest = null;
            while (true) {
                await waitWithSignal(1000, signal);
                const response = await fetch(`/api/generate-batch-stream/${encodeURIComponent(jobId)}/progress`, {signal});
                if (!response.ok) {
                    throw new Error(`进度查询失败: HTTP ${response.status}`);
                }
                latest = await response.json();
                updateGlobalProgressFromJob(latest);
                onProgress(latest);
                if (['done', 'error', 'cancelled'].includes(latest.status)) {
                    return latest;
                }
            }
        }

        function applyBackendStreamingProgress(data, options = {}) {
            if (!data || !Array.isArray(data.results)) return;
            const final = Boolean(options.final);

            data.results.forEach(result => {
                const pairId = result.id;
                const outputPair = outputPairs.find(pair => pair.id === pairId);
                if (!outputPair) return;
                const previousStatus = outputPair.progress?.status;

                setGenerationProgress(pairId, {
                    status: result.status || 'queued',
                    charCount: result.charCount || 0,
                    questionCount: result.questionCount || 0,
                    error: result.error || null
                });

                if (result.full) {
                    updateOutputFull(pairId, result.full, result.status === 'running');
                } else if (result.status === 'queued') {
                    updateOutputFull(pairId, '正在后台流式生成中...\n\n等待调度');
                } else if (result.status === 'running') {
                    updateOutputFull(pairId, '正在后台流式生成中...\n\n');
                }

                if (['done', 'error'].includes(result.status) && previousStatus !== result.status) {
                    applyGenerationResult(result);
                } else if (final && result.status === 'cancelled') {
                    updateOutputFull(pairId, result.full ? `${result.full}\n\n[已取消]` : '已取消');
                    validateJSON(pairId);
                }
            });
        }

        function applyGenerationResult(result) {
            if (!result) return false;

            const pairId = result.id;
            if (!outputPairs.some(pair => pair.id === pairId)) {
                return false;
            }

            if (result.error) {
                updateOutputFull(pairId, `❌ 生成失败: ${result.error}`);
                updateOutputEditable(pairId, '');
                setGenerationProgress(pairId, {status: 'error', charCount: result.charCount || 0, error: result.error});
                validateJSON(pairId);
                addLog(`生成异常 #${pairId + 1}`, result.error);
                return false;
            }

            const fullText = result.full || '';
            const editableText = result.editable || extractJSON(fullText);
            updateOutputFull(pairId, fullText || '生成完成，但未返回内容');
            updateOutputEditable(pairId, editableText || '');
            validateJSON(pairId);

            let questionCount = Number.isFinite(result.questionCount) ? result.questionCount : 0;
            if (!questionCount && editableText) {
                try {
                    questionCount = (JSON.parse(editableText).questions || []).length;
                } catch (e) {
                    questionCount = 0;
                }
            }
            setGenerationProgress(pairId, {
                status: 'done',
                charCount: fullText.length,
                questionCount
            });
            addLog(`AI生成完成 #${pairId + 1}`, `生成了 ${questionCount} 道题目, 总字符: ${fullText.length}`);
            return true;
        }

        async function generateSingleBackendStreaming(pairId, userInput) {
            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                throw new Error('API配置不完整');
            }
            if (isPairGenerating(pairId)) {
                stopSingleGeneration(pairId, {silent: true});
            }

            const controller = new AbortController();
            const runId = nextGenerationRunId++;
            const concurrency = getBatchConcurrency();
            globalGenerationProgress = {completed: 0, total: 1, status: 'queued'};
            activeGenerations.set(pairId, {controller, runId, stopping: false, backendJobId: null});
            updateGenerationControls(pairId);

            updateOutputFull(pairId, '正在后台流式生成中...\n\n');
            updateOutputEditable(pairId, '');
            setGenerationProgress(pairId, {status: 'queued', detail: '等待后端调度'});

            addLog(`AI生成题目 #${pairId + 1}`, `模型: ${selectedApi.model}, 题型: ${selectedTypes.join(', ')}, 后端流式: 是, 并发: ${concurrency}`);

            try {
                const data = await startBackendStreamingBatch([{id: pairId, text: userInput}], controller.signal, concurrency);
                const active = activeGenerations.get(pairId);
                if (!active || active.runId !== runId) {
                    return {aborted: true, superseded: true};
                }
                active.backendJobId = data.jobId;
                applyBackendStreamingProgress(data);
                updateGlobalProgressFromJob(data);

                const finalData = await pollBackendStreamingJob(data.jobId, controller.signal, latest => {
                    const current = activeGenerations.get(pairId);
                    if (!current || current.runId !== runId) return;
                    applyBackendStreamingProgress(latest);
                });
                const result = (finalData.results || []).find(item => item.id === pairId) || finalData.results?.[0];
                applyBackendStreamingProgress(finalData, {final: true});
                updateGlobalProgressFromJob(finalData);
                return {aborted: false, text: result?.full || '', result};
            } catch (e) {
                if (e.name === 'AbortError') {
                    const active = activeGenerations.get(pairId);
                    if (!active || active.runId !== runId) {
                        return {aborted: true, superseded: true};
                    }

                    updateOutputFull(pairId, '已停止');
                    setGenerationProgress(pairId, {status: 'stopped', detail: '已停止'});
                    addLog(`AI生成已停止 #${pairId + 1}`, '后台流式任务已取消');
                    return {aborted: true};
                }
                throw e;
            } finally {
                clearActiveGeneration(pairId, runId);
            }
        }

        async function generateSingle(pairId, userInput) {
            const idx = inputPairs.findIndex(p => p.id === pairId);
            if (idx === -1) return;
            return await generateSingleBackendStreaming(pairId, userInput);
        }

        async function regenerateSingle(pairId) {
            const error = document.getElementById('error');
            error.style.display = 'none';

            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                error.textContent = '❌ 请完整填写选中的 API 配置';
                error.style.display = 'block';
                addLog('重新生成失败', 'API配置不完整');
                return;
            }

            if (selectedTypes.length === 0) {
                error.textContent = '❌ 请选择题型';
                error.style.display = 'block';
                addLog('重新生成失败', '未选择题型');
                return;
            }

            const pair = inputPairs.find(p => p.id === pairId);
            if (!pair || !pair.text.trim()) {
                error.textContent = '❌ 输入内容为空';
                error.style.display = 'block';
                addLog('重新生成失败', '输入内容为空');
                return;
            }

            const wasGenerating = isPairGenerating(pairId);
            addLog(`重新生成 #${pairId + 1}`, wasGenerating ? '已打断当前生成，开始重新生成题目' : '开始重新生成题目');
            try {
                const result = await generateSingle(pairId, pair.text);
                if (result?.aborted) return;
            } catch (e) {
                error.textContent = `❌ 错误: ${e.message}`;
                error.style.display = 'block';
                addLog(`重新生成异常 #${pairId + 1}`, e.message);
            }
        }

        async function generateQuestionsBackendStreamingBatch(validInputCount, exportBtn) {
            const error = document.getElementById('error');
            const items = inputPairs
                .filter(pair => pair.text.trim())
                .map(pair => ({id: pair.id, text: pair.text}));
            const concurrency = getBatchConcurrency();
            const controller = new AbortController();
            const runId = nextGenerationRunId++;
            globalGenerationProgress = {completed: 0, total: items.length, status: 'queued'};

            batchGenerating = true;
            items.forEach(item => {
                activeGenerations.set(item.id, {controller, runId, stopping: false, backendJobId: null});
            });
            updateGlobalGenerationControls();
            inputPairs.forEach(pair => updateGenerationControls(pair.id));

            items.forEach(item => {
                updateOutputFull(item.id, '正在后台流式批量生成中...\n\n');
                updateOutputEditable(item.id, '');
                setGenerationProgress(item.id, {status: 'queued', detail: '等待后端调度'});
                validateJSON(item.id);
            });

            addLog('开始后台流式批量生成', `共 ${validInputCount} 个输入, 并发: ${concurrency}, 题型: ${selectedTypes.join(', ')}`);

            try {
                const data = await startBackendStreamingBatch(items, controller.signal, concurrency);
                items.forEach(item => {
                    const active = activeGenerations.get(item.id);
                    if (active && active.runId === runId) {
                        active.backendJobId = data.jobId;
                    }
                });
                applyBackendStreamingProgress(data);
                updateGlobalProgressFromJob(data);

                const finalData = await pollBackendStreamingJob(data.jobId, controller.signal, applyBackendStreamingProgress);
                applyBackendStreamingProgress(finalData, {final: true});
                updateGlobalProgressFromJob(finalData);
                if (finalData.status === 'cancelled') {
                    addLog('后台流式批量生成已取消', `已处理 ${finalData.completedCount || 0}/${finalData.total || validInputCount} 个输入`);
                } else {
                    addLog('后台流式批量生成完成', `成功 ${finalData.successCount} 个，失败 ${finalData.failedCount} 个`);
                }
            } catch (e) {
                if (e.name === 'AbortError') {
                    addLog('后台流式批量生成已停止', '轮询请求已取消');
                    return;
                }
                error.textContent = `❌ 批量生成失败: ${e.message}`;
                error.style.display = 'block';
                addLog('后台流式批量生成异常', e.message);
            } finally {
                batchGenerating = false;
                items.forEach(item => clearActiveGeneration(item.id, runId));
                inputPairs.forEach(pair => updateGenerationControls(pair.id));
                updateGlobalGenerationControls();
                if (activeGenerations.size === 0 && hasGeneratedOutput()) {
                    setExportButtonsDisabled(false);
                    if (shouldAutoCompareAfterGeneration()) {
                        await generateFilesAndCompare();
                    } else {
                        generateFileA();
                        generateFileB();
                        addLog('生成后处理', '已更新文件 A/B，自动对比未开启');
                    }
                }
            }
        }

        async function generateQuestions() {
            const error = document.getElementById('error');
            const generateBtn = document.getElementById('generateBtn');
            const exportBtn = document.getElementById('exportBtn');

            error.style.display = 'none';
            error.textContent = '';
            if (exportBtn) exportBtn.disabled = true;
            setExportButtonsDisabled(true);

            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                error.textContent = '❌ 请完整填写选中的 API 配置';
                error.style.display = 'block';
                addLog('批量生成失败', 'API配置不完整');
                return;
            }

            if (selectedTypes.length === 0) {
                error.textContent = '❌ 请选择题型';
                error.style.display = 'block';
                addLog('批量生成失败', '未选择题型');
                return;
            }

            const hasInput = inputPairs.some(p => p.text.trim());
            if (!hasInput) {
                error.textContent = '❌ 请至少输入一个需求';
                error.style.display = 'block';
                addLog('批量生成失败', '输入内容为空');
                return;
            }

            const validInputCount = inputPairs.filter(p => p.text.trim()).length;
            await generateQuestionsBackendStreamingBatch(validInputCount, exportBtn);
        }

        async function exportExcel() {
            const error = document.getElementById('error');
            error.style.display = 'none';
            error.textContent = '';

            try {
                const allQuestions = getFileAQuestions();
                const filename = document.getElementById('outputFilename').value || 'exam_questions';
                const template = document.getElementById('excelTemplate')?.value || 'standard';
                const templateName = template === 'answer_helper' ? '答题帮手模板' : '标准题库模板';
                addLog('开始导出Excel', `文件名: ${filename}, 题目数: ${allQuestions.length}, 模板: ${templateName}`);

                const response = await fetch('/api/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questions: allQuestions, template })
                });

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.xlsx`;
                a.click();
                window.URL.revokeObjectURL(url);
                addLog('导出Excel成功', `已用${templateName}导出 ${allQuestions.length} 道题目到 ${filename}.xlsx`);
            } catch (e) {
                error.textContent = `❌ 导出失败: ${e.message}`;
                error.style.display = 'block';
                addLog('导出Excel异常', e.message);
            }
        }

        async function exportWord() {
            const error = document.getElementById('error');
            error.style.display = 'none';
            error.textContent = '';
            try {
                const questions = getFileAQuestions();
                const filename = document.getElementById('outputFilename').value || 'exam_questions';
                addLog('开始导出Word', `文件名: ${filename}, 题目数: ${questions.length}`);
                const response = await fetch('/api/export-word', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questions })
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const blob = await response.blob();
                downloadBlob(blob, `${filename}.docx`);
                addLog('导出Word成功', `已导出 ${questions.length} 道题目到 ${filename}.docx`);
            } catch (e) {
                error.textContent = `❌ Word 导出失败: ${e.message}`;
                error.style.display = 'block';
                addLog('导出Word异常', e.message);
            }
        }

        function exportJSON() {
            const error = document.getElementById('error');
            error.style.display = 'none';
            error.textContent = '';
            try {
                const questions = getFileAQuestions();
                const filename = document.getElementById('outputFilename').value || 'exam_questions';
                const payload = {
                    version: 1,
                    source: 'AB 对比审核内的文件 A',
                    exportedAt: new Date().toISOString(),
                    questions
                };
                downloadBlob(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}), `${filename}.json`);
                addLog('导出JSON成功', `已导出 ${questions.length} 道题目到 ${filename}.json`);
            } catch (e) {
                error.textContent = `❌ JSON 导出失败: ${e.message}`;
                error.style.display = 'block';
                addLog('导出JSON异常', e.message);
            }
        }

        function downloadBlob(blob, filename) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
        }

        function getFileAQuestions() {
            const fileAContent = document.getElementById('fileA')?.value.trim() || '';
            if (!fileAContent) {
                throw new Error('请先生成 AB 对比审核内的文件 A');
            }
            const jsonData = JSON.parse(fileAContent);
            const questions = jsonData.questions || [];
            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error('文件 A 中没有可导出的 questions 数据');
            }
            return questions;
        }

        async function convertTemplateJSON() {
            const error = document.getElementById('error');
            error.style.display = 'none';
            error.textContent = '';
            try {
                const questions = getTemplateConvertSourceQuestions();
                if (!questions.length) {
                    throw new Error('没有可转换的 questions 数据');
                }
                const targetTemplate = document.getElementById('convertTargetTemplate').value;
                const response = await fetch('/api/convert-template', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({questions, targetTemplate})
                });
                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error);
                }
                setTextareaValue('templateConvertOutput', JSON.stringify({questions: data.questions || []}, null, 2));
                addLog('模板互转完成', `目标模板: ${targetTemplate === 'answer_helper' ? '答题帮手模板' : '标准题库模板'}, 题目数: ${(data.questions || []).length}`);
            } catch (e) {
                error.textContent = `❌ 模板互转失败: ${e.message}`;
                error.style.display = 'block';
                addLog('模板互转失败', e.message);
            }
        }

        function getTemplateConvertSourceQuestions() {
            const convertOutput = document.getElementById('templateConvertOutput')?.value.trim() || '';
            const fileAContent = document.getElementById('fileA')?.value.trim() || '';
            const sourceText = convertOutput || fileAContent;
            if (!sourceText) {
                throw new Error('请先导入模板文件，或生成文件 A');
            }
            const jsonData = JSON.parse(sourceText);
            const questions = jsonData.questions || (Array.isArray(jsonData) ? jsonData : []);
            if (!Array.isArray(questions)) {
                throw new Error('JSON 中没有 questions 数组');
            }
            return questions;
        }

        function importTemplateSource() {
            document.getElementById('templateImportFile')?.click();
        }

        function readFileAsBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = String(reader.result || '');
                    resolve(result.includes(',') ? result.split(',').pop() : result);
                };
                reader.onerror = () => reject(new Error(`无法读取文件: ${file.name}`));
                reader.readAsDataURL(file);
            });
        }

        async function handleTemplateImport(event) {
            const file = event.target.files?.[0];
            if (!file) return;
            const error = document.getElementById('error');
            error.style.display = 'none';
            error.textContent = '';
            try {
                const contentBase64 = await readFileAsBase64(file);
                const response = await fetch('/api/import-template-file', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({fileName: file.name, contentBase64})
                });
                const data = await response.json();
                if (data.error) {
                    throw new Error(data.error);
                }
                const payload = {
                    sourceTemplate: data.sourceTemplate || 'unknown',
                    questions: data.questions || []
                };
                setTextareaValue('templateConvertOutput', JSON.stringify(payload, null, 2));
                addLog('导入模板文件完成', `${file.name}, 题目数: ${payload.questions.length}`);
            } catch (e) {
                error.textContent = `❌ 模板导入失败: ${e.message}`;
                error.style.display = 'block';
                addLog('模板导入失败', e.message);
            } finally {
                event.target.value = '';
            }
        }

        function exportTemplateConvertJSON() {
            const error = document.getElementById('error');
            error.style.display = 'none';
            error.textContent = '';
            try {
                const questions = getTemplateConvertSourceQuestions();
                const payload = {
                    version: 1,
                    source: '模板互转',
                    exportedAt: new Date().toISOString(),
                    questions
                };
                downloadBlob(new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'}), 'template_converted_questions.json');
                addLog('导出模板互转JSON', `题目数: ${questions.length}`);
            } catch (e) {
                error.textContent = `❌ 导出失败: ${e.message}`;
                error.style.display = 'block';
                addLog('导出模板互转JSON失败', e.message);
            }
        }

        function refreshFileAState() {
            const countEl = document.getElementById('file-a-q-count');
            const compareBtn = document.getElementById('compareBtn');
            try {
                const data = JSON.parse(document.getElementById('fileA').value || '{}');
                const count = Array.isArray(data.questions) ? data.questions.length : 0;
                if (countEl) countEl.textContent = count ? `(共 ${count} 道)` : '';
                if (compareBtn) compareBtn.disabled = count === 0;
                setExportButtonsDisabled(count === 0);
            } catch {
                if (countEl) countEl.textContent = '';
                if (compareBtn) compareBtn.disabled = true;
                setExportButtonsDisabled(true);
            }
        }

        function applyTemplateConvertToFileA() {
            const error = document.getElementById('error');
            error.style.display = 'none';
            error.textContent = '';
            try {
                const output = document.getElementById('templateConvertOutput').value.trim();
                if (!output) {
                    throw new Error('请先执行模板互转');
                }
                JSON.parse(output);
                setTextareaValue('fileA', output);
                refreshFileAState();
                addLog('模板互转应用完成', '转换结果已写入文件 A');
            } catch (e) {
                error.textContent = `❌ 应用失败: ${e.message}`;
                error.style.display = 'block';
                addLog('模板互转应用失败', e.message);
            }
        }

        function removeNullValues(obj) {
            if (Array.isArray(obj)) {
                return obj.map(item => removeNullValues(item));
            } else if (obj !== null && typeof obj === 'object') {
                const newObj = {};
                for (const key in obj) {
                    if (obj[key] !== null) {
                        newObj[key] = removeNullValues(obj[key]);
                    }
                }
                return newObj;
            }
            return obj;
        }

        function getQuestionFieldValue(question, standardField) {
            // Extract base text (e.g., "正确答案" from "正确答案\n（必填）")
            // This regex handles both (全角) and (半角) parentheses.
            const baseTextMatch = standardField.match(/^([^（(]+)/);
            const baseText = baseTextMatch ? baseTextMatch[1].trim() : standardField.replace(/[\n（）()]/g, '').trim();

            const possibleKeys = [
                standardField,                         // e.g., "正确答案\n（必填）"
                standardField.replace(/\n/g, ''),      // e.g., "正确答案（必填）"
                baseText                               // e.g., "正确答案"
            ];

            // Also consider variations where "（必填）" or "(必填)" is optional or absent
            const optionalSuffixKeys = [];
            if (standardField.includes('（必填）')) {
                optionalSuffixKeys.push(standardField.replace('（必填）', '').trim());
                optionalSuffixKeys.push(standardField.replace('（必填）', '').replace(/\n/g, '').trim());
            }
            if (standardField.includes('(必填)')) {
                optionalSuffixKeys.push(standardField.replace('(必填)', '').trim());
                optionalSuffixKeys.push(standardField.replace('(必填)', '').replace(/\n/g, '').trim());
            }

            // Remove duplicates and nulls
            const allPossibleKeys = [...new Set([...possibleKeys, ...optionalSuffixKeys])].filter(Boolean);

            for (const key of allPossibleKeys) {
                // Check for direct match
                // Note: question.hasOwnProperty(key) is more robust than `key in question`
                // Ensure value is not null, undefined, and not an empty string after trimming.
                if (question.hasOwnProperty(key) && question[key] !== null && question[key] !== undefined && question[key].toString().trim() !== '') {
                    return question[key];
                }
            }

            return null; // Not found or empty
        }

        function getFileASortFieldValue(question, sortKey) {
            if (sortKey === 'chapter') {
                return getQuestionFieldValue(question, '章节\n（勿删）') || '';
            }
            if (sortKey === 'type') {
                return getQuestionFieldValue(question, '题型 （必填）') || '';
            }
            return '';
        }

        function parseChineseNumberText(text) {
            const digitMap = {'零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9};
            const unitMap = {'十': 10, '百': 100, '千': 1000};
            let total = 0;
            let section = 0;
            let number = 0;
            for (const char of String(text || '')) {
                if (Object.prototype.hasOwnProperty.call(digitMap, char)) {
                    number = digitMap[char];
                } else if (Object.prototype.hasOwnProperty.call(unitMap, char)) {
                    const unit = unitMap[char];
                    section += (number || 1) * unit;
                    number = 0;
                } else if (char === '万') {
                    total += (section + number) * 10000;
                    section = 0;
                    number = 0;
                }
            }
            return total + section + number;
        }

        function normalizeFileASortValue(rawValue, sortKey) {
            const text = String(rawValue || '').trim();
            if (sortKey === 'chapter') {
                const arabic = text.match(/\d+/);
                if (arabic) {
                    return `#${String(parseInt(arabic[0], 10)).padStart(8, '0')} ${text}`;
                }
                const chinese = text.match(/[零〇一二两三四五六七八九十百千万]+/);
                if (chinese) {
                    const value = parseChineseNumberText(chinese[0]);
                    if (value > 0) {
                        return `#${String(value).padStart(8, '0')} ${text}`;
                    }
                }
            }
            if (sortKey === 'type' && Array.isArray(availableQuestionTypes)) {
                const index = availableQuestionTypes.indexOf(text);
                if (index >= 0) {
                    return `#${String(index).padStart(4, '0')} ${text}`;
                }
            }
            return text;
        }

        function getFileASortLabel(sortKey) {
            if (sortKey === 'chapter') return '章节';
            if (sortKey === 'type') return '题型';
            return '不排序';
        }

        function sortFileABy(primaryKey) {
            const primary = document.getElementById('fileASortPrimary');
            const secondary = document.getElementById('fileASortSecondary');
            if (!primary || !secondary) return;
            primary.value = primaryKey;
            secondary.value = primaryKey === 'chapter' ? 'type' : 'chapter';
            sortFileA();
        }

        function swapFileASortPriority() {
            const primary = document.getElementById('fileASortPrimary');
            const secondary = document.getElementById('fileASortSecondary');
            if (!primary || !secondary) return;
            const nextPrimary = secondary.value;
            secondary.value = primary.value;
            primary.value = nextPrimary;
            addLog('交换文件A排序优先级', `第一优先级: ${getFileASortLabel(primary.value)}, 第二优先级: ${getFileASortLabel(secondary.value)}`);
        }

        function sortFileA() {
            const error = document.getElementById('error');
            error.style.display = 'none';
            error.textContent = '';
            try {
                const fileATextarea = document.getElementById('fileA');
                const fileAContent = fileATextarea.value.trim();
                if (!fileAContent) {
                    throw new Error('文件 A 为空');
                }
                const data = JSON.parse(fileAContent);
                if (!Array.isArray(data.questions) || data.questions.length === 0) {
                    throw new Error('文件 A 中没有 questions 数组');
                }

                const primary = document.getElementById('fileASortPrimary')?.value || 'chapter';
                let secondary = document.getElementById('fileASortSecondary')?.value || 'type';
                if (primary === secondary) {
                    secondary = 'none';
                }
                const sortKeys = [primary, secondary].filter(key => key && key !== 'none');
                if (sortKeys.length === 0) {
                    throw new Error('请至少选择一个排序优先级');
                }

                data.questions = data.questions
                    .map((question, index) => ({question, index}))
                    .sort((a, b) => {
                        for (const key of sortKeys) {
                            const left = normalizeFileASortValue(getFileASortFieldValue(a.question, key), key);
                            const right = normalizeFileASortValue(getFileASortFieldValue(b.question, key), key);
                            const result = left.localeCompare(right, 'zh-Hans-CN', {numeric: true, sensitivity: 'base'});
                            if (result !== 0) return result;
                        }
                        return a.index - b.index;
                    })
                    .map(item => item.question);

                setTextareaValue('fileA', JSON.stringify(data, null, 2));
                refreshFileAState();
                addLog('文件A排序完成', `第一优先级: ${getFileASortLabel(primary)}, 第二优先级: ${getFileASortLabel(secondary)}, 题目数: ${data.questions.length}`);
            } catch (e) {
                error.textContent = `❌ 文件 A 排序失败: ${e.message}`;
                error.style.display = 'block';
                addLog('文件A排序失败', e.message);
            }
        }

        function validateJSON(pairId) {
            const editableEl = document.getElementById(`editable-${pairId}`);
            const countEl = document.getElementById(`q-count-${pairId}`);
            const errorDiv = document.getElementById(`validation-error-${pairId}`);

            console.log(`validateJSON called for pairId: ${pairId}`);
            console.log(`editableEl found: ${!!editableEl}`);
            console.log(`countEl found: ${!!countEl}`);
            console.log(`errorDiv found: ${!!errorDiv}`);

            if (!editableEl || !countEl || !errorDiv) {
                console.error(`validateJSON: Missing elements for pairId ${pairId}`);
                return;
            }

            const jsonText = editableEl.value.trim();
            countEl.textContent = ''; // Reset count
            errorDiv.style.display = 'none'; // Hide error initially
            errorDiv.textContent = ''; // Clear error message

            console.log(`Processing JSON text (length ${jsonText.length}):`, jsonText.substring(0, 200) + (jsonText.length > 200 ? '...' : ''));


            if (!jsonText) {
                editableEl.classList.remove('invalid');
                console.log(`validateJSON: No JSON text for pairId ${pairId}`);
                return;
            }

            try {
                const data = JSON.parse(jsonText);
                let questionCount = 0;

                // 检查是否有 questions 数组
                if (!data.questions || !Array.isArray(data.questions)) {
                    editableEl.classList.add('invalid');
                    errorDiv.textContent = '❌ JSON 缺少 "questions" 数组。';
                    errorDiv.style.display = 'block';
                    addLog(`验证失败 #${pairId + 1}`, '缺少 questions 数组');
                    console.error(`validateJSON: Missing questions array for pairId ${pairId}`);
                    return;
                }
                
                questionCount = data.questions.length;
                console.log(`validateJSON: questionCount for pairId ${pairId} is ${questionCount}`);


                // 检查每个题目的必填字段
                const requiredFields = ['题干（必填）', '题型 （必填）', '正确答案\n（必填）'];
                for (let i = 0; i < data.questions.length; i++) {
                    const q = data.questions[i];
                    for (const field of requiredFields) {
                        const fieldValue = getQuestionFieldValue(q, field); // Use the flexible matcher
                        if (fieldValue === null || fieldValue.toString().trim() === '') {
                            editableEl.classList.add('invalid');
                            errorDiv.textContent = `❌ 题目 ${i + 1} 缺少必填字段: "${field}"。`;
                            errorDiv.style.display = 'block';
                            addLog(`验证失败 #${pairId + 1}`, `题目 ${i + 1} 缺少必填字段: ${field}`);
                            console.error(`validateJSON: Missing required field "${field}" for question ${i + 1} in pairId ${pairId}`);
                            return;
                        }
                    }
                }

                // 验证通过
                editableEl.classList.remove('invalid');
                if (questionCount > 0) {
                    countEl.textContent = `(${questionCount} 道)`;
                    console.log(`validateJSON: Successfully set count for pairId ${pairId}: ${countEl.textContent}`);
                }
                addLog(`验证通过 #${pairId + 1}`, `${questionCount} 道题目格式正确`);
            } catch (e) {
                // JSON parsing error
                editableEl.classList.add('invalid');
                errorDiv.textContent = `❌ JSON 格式错误: ${e.message}。`;
                errorDiv.style.display = 'block';
                addLog(`验证失败 #${pairId + 1}`, `JSON 格式错误: ${e.message}`);
                console.error(`validateJSON: JSON parsing error for pairId ${pairId}: ${e.message}`);
            }
        }

        function generateFileA() {
            const countEl = document.getElementById('file-a-q-count');
            countEl.textContent = '';
            try {
                let allQuestions = [];
                for (const pair of outputPairs) {
                    const textarea = document.getElementById(`editable-${pair.id}`);
                    if (textarea && textarea.value.trim()) {
                        const jsonData = JSON.parse(textarea.value);
                        const questions = jsonData.questions || [];
                        allQuestions = allQuestions.concat(questions);
                    }
                }

                if (allQuestions.length === 0) {
                    alert('❌ 没有可生成的题目');
                    setTextareaValue('fileA', '');
                    return;
                }

                countEl.textContent = `(共 ${allQuestions.length} 道)`;
                const removeNull = removeNullEnabled;
                let result = { questions: allQuestions };
                if (removeNull) {
                    result = removeNullValues(result);
                }

                setTextareaValue('fileA', JSON.stringify(result, null, 2));
                document.getElementById('compareBtn').disabled = false;
                setExportButtonsDisabled(false);
                addLog('生成文件A', `题目数: ${allQuestions.length}, 去除null: ${removeNull ? '是' : '否'}`);
            } catch (e) {
                alert(`❌ 生成失败: ${e.message}`);
                addLog('生成文件A失败', e.message);
            }
        }

        let removeNullEnabled = true;

        function toggleRemoveNull() {
            removeNullEnabled = !removeNullEnabled;
            const btn = event.currentTarget || event.target.closest('button');
            btn.innerHTML = removeNullEnabled
                ? '<i data-lucide="trash-2"></i> 去除 null 值'
                : '<i data-lucide="archive"></i> 保留 null 值';
            btn.style.opacity = removeNullEnabled ? '1' : '0.75';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function addSequenceNumbers() {
            const fileATextarea = document.getElementById('fileA');
            const fileAContent = fileATextarea.value;

            if (!fileAContent.trim()) {
                alert('❌ 文件 A 中没有内容可添加序号。');
                addLog('添加序号失败', '文件 A 为空');
                return;
            }

            try {
                const data = JSON.parse(fileAContent);
                if (!data.questions || !Array.isArray(data.questions)) {
                    alert('❌ 文件 A 的内容不是有效的题目JSON格式（缺少 questions 数组）。');
                    addLog('添加序号失败', 'JSON格式无效');
                    return;
                }

                data.questions.forEach((q, index) => {
                    const seq = `[${String(index + 1).padStart(2, '0')}]`;
                    const stemKey = '题干（必填）';
                    
                    // 移除旧序号（如果存在），避免重复添加
                    if (q[stemKey]) {
                        q[stemKey] = q[stemKey].replace(/^\[\d+\]\s*/, '').trim();
                        q[stemKey] = `${seq}${q[stemKey]}`;
                    }
                });

                setTextareaValue('fileA', JSON.stringify(data, null, 2));
                addLog('添加序号成功', `为 ${data.questions.length} 道题目添加了序号`);

            } catch (e) {
                alert(`❌ 处理JSON时出错: ${e.message}`);
                addLog('添加序号异常', e.message);
            }
        }

        function generateFileB() {
            const allInputs = inputPairs.map(p => p.text).filter(t => t.trim()).join('\n\n');
            if (!allInputs) {
                alert('❌ 没有输入内容');
                return;
            }

            setTextareaValue('fileB', allInputs);
            document.getElementById('compareBtn').disabled = false;
            addLog('生成文件B', `输入数: ${inputPairs.filter(p => p.text.trim()).length}`);
        }

        async function generateFilesAndCompare() {
            generateFileA();
            generateFileB();
            const fileA = document.getElementById('fileA')?.value.trim();
            const fileB = document.getElementById('fileB')?.value.trim();
            if (!fileA || !fileB) return;
            await compareFiles();
        }

        async function readEventStream(response, onText) {
            if (!response.ok) {
                throw new Error(`请求失败: HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, {stream: true});
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = JSON.parse(line.slice(6));
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    if (data.text) {
                        onText(data.text);
                    }
                }
            }
        }

        function renderCompareChat() {
            const thread = document.getElementById('compareChatThread');
            if (!thread) return;

            if (compareChatHistory.length === 0) {
                thread.innerHTML = '<div class="chat-empty">完成对比后，可在这里继续追问修改建议、缺漏原因或输出修订方案。</div>';
                return;
            }

            thread.innerHTML = compareChatHistory.map(item => {
                const roleClass = item.role === 'user' ? 'user' : 'assistant';
                const content = item.role === 'assistant'
                    ? renderMarkdown(item.content)
                    : escapeHTML(item.content);
                return `<div class="chat-bubble ${roleClass}">${content}</div>`;
            }).join('');
            thread.scrollTop = thread.scrollHeight;
        }

        function clearCompareChat() {
            compareChatHistory = [];
            renderCompareChat();
            addLog('清空对比追问', '已清空当前对话');
        }

        function resetCompareState() {
            const resultEl = document.getElementById('compareResult');
            const scoreEl = document.getElementById('compareScoreResult');
            if (resultEl) {
                resultEl.dataset.rawText = '';
            }
            if (scoreEl) {
                scoreEl.dataset.rawText = '';
            }
            compareContext = {structuredResult: '', compareResult: '', fileA: '', fileB: ''};
            clearCompareChat();
        }

        async function askCompareFollowup() {
            const error = document.getElementById('error');
            error.style.display = 'none';

            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                error.textContent = '❌ 请完整填写选中的 API 配置';
                error.style.display = 'block';
                addLog('对比追问失败', 'API配置不完整');
                return;
            }

            const input = document.getElementById('compareChatInput');
            const chatBtn = document.getElementById('compareChatBtn');
            const question = input.value.trim();
            const compareResult = getCompareResultText().trim();

            if (!compareResult || compareResult === '等待对比...') {
                error.textContent = '❌ 请先完成一次对比分析';
                error.style.display = 'block';
                addLog('对比追问失败', '缺少对比结果');
                return;
            }

            if (!question) {
                error.textContent = '❌ 请输入追问内容';
                error.style.display = 'block';
                return;
            }

            compareChatHistory.push({role: 'user', content: question});
            const assistantMessage = {role: 'assistant', content: '正在分析...'};
            compareChatHistory.push(assistantMessage);
            input.value = '';
            chatBtn.disabled = true;
            renderCompareChat();

            addLog('开始对比追问', `模型: ${selectedApi.model}`);

            try {
                const historyForRequest = compareChatHistory.slice(0, -1).map(item => ({
                    role: item.role,
                    content: item.content
                }));

                const response = await fetch('/api/compare-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(await buildApiRequestPayload(selectedApi, {
                        compareResult,
                        question,
                        fileA: compareContext.fileA || document.getElementById('fileA').value.trim(),
                        fileB: compareContext.fileB || document.getElementById('fileB').value.trim(),
                        history: historyForRequest,
                        prompt: getPromptValue('compareChat')
                    }))
                });

                let fullText = '';
                await readEventStream(response, text => {
                    fullText += text;
                    assistantMessage.content = fullText;
                    renderCompareChat();
                });

                assistantMessage.content = fullText || '未返回内容。';
                renderCompareChat();
                addLog('对比追问完成', `输出字符数: ${fullText.length}`);
            } catch (e) {
                assistantMessage.content = `❌ 追问失败: ${e.message}`;
                renderCompareChat();
                error.textContent = `❌ 追问失败: ${e.message}`;
                error.style.display = 'block';
                addLog('对比追问异常', e.message);
            } finally {
                chatBtn.disabled = false;
            }
        }

        async function compareFiles() {
            const error = document.getElementById('error');
            error.style.display = 'none';

            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                error.textContent = '❌ 请完整填写选中的 API 配置';
                error.style.display = 'block';
                addLog('AI对比失败', 'API配置不完整');
                return;
            }

            const fileA = document.getElementById('fileA').value.trim();
            const fileB = document.getElementById('fileB').value.trim();

            if (!fileA || !fileB) {
                error.textContent = '❌ 请先生成文件 A 和文件 B';
                error.style.display = 'block';
                addLog('AI对比失败', '文件内容为空');
                return;
            }

            const compareBtn = document.getElementById('compareBtn');
            const scoreEl = document.getElementById('compareScoreResult');
            const resultEl = document.getElementById('compareResult');
            if (compareBtn) compareBtn.disabled = true;
            compareContext = {structuredResult: '', compareResult: '', fileA, fileB};
            updateMarkdownElement(scoreEl, '', '正在生成结构化评分...');
            updateMarkdownElement(resultEl, '', '正在生成对比测评...');

            addLog('开始AI同步对比', `模型: ${selectedApi.model}, 缓存: ${selectedApi.useContextCache ? '开启' : '关闭'}`);

            try {
                const streamCompare = async ({mode, prompt, element, contextKey}) => {
                    const response = await fetch('/api/compare', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(await buildApiRequestPayload(selectedApi, {
                            fileA,
                            fileB,
                            prompt,
                            mode,
                            useContextCache: Boolean(selectedApi.useContextCache)
                        }))
                    });

                    let fullText = '';
                    await readEventStream(response, text => {
                        fullText += text;
                        updateMarkdownElement(element, fullText);
                    });
                    compareContext[contextKey] = fullText;
                    updateMarkdownElement(element, fullText || '未返回对比结果。');
                    return fullText;
                };

                const [scoreText, reviewText] = await Promise.all([
                    streamCompare({
                        mode: 'score',
                        prompt: getPromptValue('compareScore'),
                        element: scoreEl,
                        contextKey: 'structuredResult'
                    }),
                    streamCompare({
                        mode: 'review',
                        prompt: getPromptValue('compare'),
                        element: resultEl,
                        contextKey: 'compareResult'
                    })
                ]);

                clearCompareChat();
                addLog('AI同步对比完成', `结构化 ${scoreText.length} 字，对比测评 ${reviewText.length} 字`);
            } catch (e) {
                error.textContent = `❌ 对比失败: ${e.message}`;
                error.style.display = 'block';
                compareContext.structuredResult = '';
                compareContext.compareResult = '';
                addLog('AI同步对比异常', e.message);
            } finally {
                if (compareBtn) compareBtn.disabled = false;
            }
        }

        async function compareSingle(pairId) {
            addLog(`单个对比已合并 #${pairId + 1}`, '当前版本统一使用 AB 对比审核内的文件 A/B 进行同步对比');
            await generateFilesAndCompare();
        }

        async function compareAllSingle() {
            await generateFilesAndCompare();
        }

        /*
        async function compareFilesLegacy() {
            const response = await fetch('/api/compare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(await buildApiRequestPayload(selectedApi, {
                        fileA: fileA,
                        fileB: fileB,
                        prompt: getPromptValue('compare')
                    }))
                });

        }
        */

        async function compareSingleLegacy(pairId) {
            const error = document.getElementById('error');
            error.style.display = 'none';

            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                error.textContent = '❌ 请完整填写选中的 API 配置';
                error.style.display = 'block';
                addLog('单个对比失败', 'API配置不完整');
                return;
            }

            const idx = inputPairs.findIndex(p => p.id === pairId);
            if (idx === -1) return;

            const inputText = inputPairs[idx].text.trim();
            const editableEl = document.getElementById(`editable-${pairId}`);
            const outputText = editableEl ? editableEl.value.trim() : '';

            if (!inputText || !outputText) {
                error.textContent = '❌ 输入或输出内容为空';
                error.style.display = 'block';
                addLog('单个对比失败', '内容为空');
                return;
            }

            const removeNull = removeNullEnabled;
            let fileA = outputText;
            if (removeNull) {
                try {
                    const jsonData = JSON.parse(outputText);
                    fileA = JSON.stringify(removeNullValues(jsonData), null, 2);
                } catch (e) {
                    fileA = outputText;
                }
            }

            const resultContainer = document.getElementById(`compare-result-${pairId}`);
            const resultEl = document.getElementById(`compare-output-${pairId}`);
            resultContainer.style.display = 'block';
            updateMarkdownElement(resultEl, '', '正在对比分析中...');

            addLog(`单个对比 #${pairId + 1}`, `模型: ${selectedApi.model}`);

            try {
                const response = await fetch('/api/compare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(await buildApiRequestPayload(selectedApi, {
                        fileA: fileA,
                        fileB: inputText,
                        prompt: getPromptValue('compare')
                    }))
                });

                let fullText = '';
                await readEventStream(response, text => {
                    fullText += text;
                    updateMarkdownElement(resultEl, fullText);
                });

                updateMarkdownElement(resultEl, fullText || '未返回对比结果。');
                addLog(`单个对比完成 #${pairId + 1}`, `输出字符数: ${fullText.length}`);
            } catch (e) {
                error.textContent = `❌ 对比失败: ${e.message}`;
                error.style.display = 'block';
                addLog(`单个对比异常 #${pairId + 1}`, e.message);
            }
        }

        async function compareAllSingleLegacy() {
            const error = document.getElementById('error');
            error.style.display = 'none';

            const selectedApi = apiConfigs.find(c => c.selected);
            if (!selectedApi || !selectedApi.url || !selectedApi.key || !selectedApi.model) {
                error.textContent = '❌ 请完整填写选中的 API 配置';
                error.style.display = 'block';
                addLog('一键审核失败', 'API配置不完整');
                return;
            }

            const validPairs = inputPairs.filter(pair => {
                const inputText = pair.text.trim();
                const editableEl = document.getElementById(`editable-${pair.id}`);
                const outputText = editableEl ? editableEl.value.trim() : '';
                return inputText && outputText;
            });

            if (validPairs.length === 0) {
                error.textContent = '❌ 没有可审核的内容';
                error.style.display = 'block';
                addLog('一键审核失败', '没有可审核的内容');
                return;
            }

            addLog('开始一键审核', `共 ${validPairs.length} 个输入需要审核`);

            for (const pair of validPairs) {
                await compareSingle(pair.id);
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            addLog('一键审核完成', `已完成 ${validPairs.length} 个输入的审核`);
        }

        window.onload = async () => {
            await loadEncryptionKey();
            await loadTransportPublicKey();
            loadConfigs();
            renderInputPairs();
            renderOutputPairs();
            await loadSystemPrompt();
            await loadQuestionTypes();
            renderLogs();
            updateGenerationModeControls();
            updateGlobalProgressDisplay();
            applyConsoleSettings();
            scheduleEnhanceTextEditors();

            initializeThemeSystem();
            initializeSectionColorSettings();

            addLog('页面加载', '系统初始化完成');

            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        };

        function initializeThemeSystem() {
            themeManager.applyTheme('default', {persist: false});
        }
