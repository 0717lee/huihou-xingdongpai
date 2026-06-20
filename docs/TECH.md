# 会后行动派 · 技术设计文档（TECH）

> 基于 docs/PRD.md、docs/UI.md 与现有 huihou-xingdongpai.html
> 版本：v2.0（MVP / Demo 版）
> 日期：2026-06-20
> 状态：待评审

---

## 0. 文档目标

把现有纯前端规则解析 HTML，升级为**"前端静态页面 + Node 后端代理 AI"的真实 MVP Demo**。
本文档严格定义文件结构、数据流、API、Prompt、解析校验、安全、前端改造、部署与验证。

---

## 1. 技术目标

| 目标 | 说明 |
|------|------|
| 保留现有视觉方向 | 沿用 huihou-xingdongpai.html 的暖色系 + 绿色主色 + 三层字体层次 |
| 移除纯前端规则解析 | 现有 `parseMeeting()` 等规则函数不再作为主生成逻辑，也不作为 AI 失败时的自动 fallback。AI 失败必须显示错误状态；如需保留规则解析，只能作为开发调试用的隐藏工具，默认不可达、不可用于验收 |
| 通过后端调用真实 AI | 前端不直接调 AI，统一走后端 `/api/generate` 代理 |
| API Key 只放后端 | Key 仅存在于后端环境变量，不进入前端代码、不进入 Git 仓库 |

---

## 2. 推荐文件结构

```
studywork/
├── package.json              # 依赖与启动脚本
├── server/
│   └── index.js              # 后端服务（Express，含路由、校验、AI 调用、解析）
├── web/
│   ├── index.html            # 前端页面结构（由 huihou-xingdongpai.html 拆分）
│   ├── app.js                # 前端逻辑（状态机、API 调用、渲染、复制、转义）
│   └── styles.css            # 前端样式（含系统字体栈替换）
├── docs/
│   ├── PRD.md
│   ├── UI.md
│   └── TECH.md
├── .env.example              # 环境变量空值模板（只写 key 名，不写真实值）
├── .gitignore                # 必含 .env / node_modules
└── progress.md               # 开发进度跟踪
```

**说明**：
- `server/index.js` 单文件即可，Demo 规模无需拆分模块（KISS）
- `web/` 三件套分离结构、样式、逻辑，便于维护
- 后端同时托管 `web/` 静态文件，Demo 同源部署

---

## 3. 前后端数据流

```
[用户粘贴文本 + 选场景]
        ↓
[前端校验：非空、长度 ≤3000]
        ↓  失败 → 前端直接提示，不发请求
[POST /api/generate { scene, text }]
        ↓
[后端校验：scene 合法、text 非空、长度 ≤3000]
        ↓  失败 → 返回 { ok:false, error:{ code:"EMPTY_INPUT"|"INPUT_TOO_LONG" } }
[检查 AI Key 是否配置]
        ↓  未配置 → 返回 { ok:false, error:{ code:"AI_NOT_CONFIGURED" } }
[构造 Prompt + 调用 AI（30s 超时）]
        ↓  超时 → AI_TIMEOUT；接口报错 → AI_REQUEST_FAILED
[从 AI 输出提取 JSON + 字段校验 + 补默认值]
        ↓  解析失败 → AI_BAD_RESPONSE（不静默 fallback 成假成功）
[返回 { ok:true, data:{ tasks, risks, message, report } }]
        ↓
[前端按 ok 分支：成功 → 渲染 4 个 Tab；失败 → 错误卡片]
        ↓
[前端渲染：所有文本 escapeHtml 后注入]
```

---

## 4. API 设计

### 4.1 生成接口

```
POST /api/generate
Content-Type: application/json
```

**请求 JSON**：
```json
{
  "scene": "meeting",
  "text": "用户粘贴内容"
}
```

| 字段 | 类型 | 必填 | 取值 |
|------|------|------|------|
| scene | string | 是 | `"meeting"` / `"chat"` / `"assignment"` |
| text | string | 是 | 用户粘贴内容，1–3000 字 |

**成功响应 JSON**（HTTP 200）：
```json
{
  "ok": true,
  "data": {
    "tasks": [
      {
        "id": 1,
        "task": "完成新版首页设计稿",
        "owner": "张明",
        "deadline": "本周五",
        "priority": "高",
        "dependency": null,
        "unclear": false
      }
    ],
    "risks": [
      { "type": "warning", "icon": "⏰", "title": "缺少截止时间", "desc": "..." }
    ],
    "message": "📋 会后行动项跟进\n...",
    "report": "【本周行动项总览】\n..."
  }
}
```

**失败响应 JSON**（HTTP 200，业务错误统一走此结构）：
```json
{
  "ok": false,
  "error": {
    "code": "AI_TIMEOUT",
    "message": "AI 响应超时，请重试"
  }
}
```

> 业务错误统一返回 HTTP 200 + `ok:false`，前端用同一套解析逻辑处理；仅网络层错误（502/503）走非 200。

### 4.2 错误码定义

| 错误码 | 触发条件 | 用户提示文案 |
|--------|----------|-------------|
| `EMPTY_INPUT` | text 为空或仅空白 | 请先粘贴会议内容 |
| `INPUT_TOO_LONG` | text 超过 3000 字 | 内容过长，请精简到 3000 字以内 |
| `INVALID_SCENE` | scene 不是 meeting/chat/assignment | 请选择有效场景 |
| `AI_NOT_CONFIGURED` | 后端未配置 API Key | AI 服务未配置，请联系部署者配置 |
| `AI_TIMEOUT` | AI 30 秒未响应 | AI 响应超时，请重试 |
| `AI_BAD_RESPONSE` | AI 返回非合法 JSON 或字段校验失败 | AI 返回内容无法解析，请重试 |
| `AI_REQUEST_FAILED` | AI 接口返回错误状态码 | 生成失败，请重试 |

### 4.3 健康检查接口

```
GET /api/health
```
```json
{ "ok": true, "aiConfigured": true }
```
前端页面加载时调用，`aiConfigured:false` 时进入"AI Key 未配置"状态。

---

## 5. Prompt 设计

### 5.1 系统提示词（System Prompt）

```
你是一个会议行动项整理助手。用户会粘贴会议纪要、群聊记录或任务布置内容，你需要整理成结构化行动方案。

只返回 JSON，不要 Markdown，不要代码块标记，不要任何解释文字。

JSON 结构如下：
{
  "tasks": [
    {
      "id": 数字,
      "task": "任务描述",
      "owner": "负责人姓名，未识别填'未指派'",
      "deadline": "截止时间，未识别填'未指定'",
      "priority": "高|中|低",
      "dependency": "依赖的人或任务，无则填 null",
      "unclear": true 或 false
    }
  ],
  "risks": [
    { "type": "danger|warning|info", "icon": "emoji", "title": "风险标题", "desc": "风险描述" }
  ],
  "message": "跟进消息草稿纯文本",
  "report": "汇报草稿纯文本"
}

字段对齐规则：
- tasks.id：从 1 递增
- tasks.owner：未识别到负责人填"未指派"
- tasks.deadline：未识别到截止时间填"未指定"
- tasks.priority：含"紧急/加急/尽快/马上/重要且紧急"为高；含"重要/优先"为中；其余为中
- tasks.dependency：含"等...完成/依赖/阻塞/才能/前提是"判定有依赖，填依赖对象；无则 null
- tasks.unclear：含"还没定/需要再讨论/不清楚/待确认/TBD/未定/待定"判定 true
- risks.type：缺负责人=danger；缺截止时间/需求不清=warning；依赖阻塞=info
- risks.icon：danger→⚠️，warning→⏰ 或 ❓，info→🔗
- message：按负责人分组，@人名，含【高优】/【常规】/【低优】标签，未指派任务单独列出，风险项最多 3 条，结尾提示语
- report：含【本周行动项总览】【高优先级任务】【常规任务】【风险项】【下一步计划】5 个段落
```

### 5.2 用户提示词（User Prompt）结构

```
【场景】{sceneLabel}
【内容】
{text}

请按系统指令整理并返回 JSON。
```

`sceneLabel` 映射：
- `meeting` → "会议纪要"
- `chat` → "群聊记录"
- `assignment` → "老师或领导布置任务"

### 5.3 AI 调用参数

| 参数 | 值 |
|------|-----|
| model | `OPENAI_MODEL` 环境变量 |
| temperature | 0.3 |
| response_format | `{ "type": "json_object" }`（如供应商支持） |
| max_tokens | 2000 |
| 超时 | 30 秒（AbortController） |

---

## 6. JSON 解析和校验

### 6.1 解析流程

```
AI 原始返回（choices[0].message.content）
    ↓
去除可能的 ```json 和 ``` 代码块标记（兜底）
    ↓
JSON.parse
    ↓  失败 → 返回 AI_BAD_RESPONSE
字段类型校验
    ↓  失败 → 返回 AI_BAD_RESPONSE
缺失字段补默认值
    ↓
返回 { ok:true, data }
```

### 6.2 字段校验与默认值

| 字段 | 校验 | 缺失/类型错误时默认值 |
|------|------|----------------------|
| tasks | 必须是数组 | `[]` |
| tasks[].id | 数字 | 递增索引 |
| tasks[].task | 字符串 | `""` |
| tasks[].owner | 字符串 | `"未指派"` |
| tasks[].deadline | 字符串 | `"未指定"` |
| tasks[].priority | "高"/"中"/"低" | `"中"` |
| tasks[].dependency | 字符串或 null | `null` |
| tasks[].unclear | 布尔 | `false` |
| risks | 必须是数组 | `[]` |
| risks[].type | "danger"/"warning"/"info" | `"info"` |
| risks[].icon | 字符串 | `"⚠️"` |
| risks[].title | 字符串 | `""` |
| risks[].desc | 字符串 | `""` |
| message | 字符串 | `""` |
| report | 字符串 | `""` |

### 6.3 关键原则

- **解析失败必须返回 `AI_BAD_RESPONSE`**，绝不静默 fallback 成假成功
- **绝不返回空 tasks + ok:true** 来掩盖 AI 解析失败（除非 AI 真的识别不到任务，此时 risks 应有相应提示）
- 字段校验失败时，整条记录可丢弃但整体仍返回 `AI_BAD_RESPONSE`（避免给用户错误的数据假象）

---

## 7. 安全设计

### 7.1 环境变量

| 变量名 | 说明 |
|--------|------|
| `DASHSCOPE_API_KEY` 或 `OPENAI_API_KEY` | AI 服务密钥（二选一，按供应商） |
| `OPENAI_BASE_URL` | OpenAI 兼容端点（如 `https://dashscope.aliyuncs.com/compatible-mode/v1`） |
| `OPENAI_MODEL` | 模型名（如 `qwen-plus`） |
| `PORT` | 后端端口（Render 会注入） |

### 7.2 密钥保护

- `.env` 文件**不提交 Git**（`.gitignore` 必含 `.env`）
- `.env.example` **只写空值模板**，例如：
  ```env
  OPENAI_API_KEY=
  OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
  OPENAI_MODEL=qwen-plus
  PORT=3000
  ```
- API Key 只在后端 `process.env` 读取，**绝不**通过任何接口返回前端
- 后端启动时检查 Key 是否存在，缺失则 `/api/health` 返回 `aiConfigured:false`

### 7.3 输入限制

| 项 | 限制 |
|----|------|
| text 长度 | ≤ 3000 字（后端硬限制） |
| 请求体大小 | ≤ 10KB |
| 请求频率 | 单 IP 每分钟 ≤ 10 次（简单限流） |

### 7.4 前端渲染安全

- 所有来自用户输入和 AI 返回的文本，渲染前必须经过 `escapeHtml()` 转义
- 转义：`<` → `&lt;`、`>` → `&gt;`、`&` → `&amp;`、`"` → `&quot;`、`'` → `&#39;`
- 只有受信任的结构标签（如 `<span class="task-num">`）才允许拼接
- `message` / `report` 需先整体转义，再做受控高亮替换（仅替换 `@人名`、`【标签】` 等已知模式）

### 7.5 隐私

- **不存储**任何用户输入内容
- **不打印完整用户输入和完整 AI 输出到日志**（日志只记长度、耗时、错误码、内容摘要 hash）
- 不将用户内容用于模型训练

---

## 8. 前端改造点

### 8.1 文件拆分

把现有 `huihou-xingdongpai.html` 拆成三件套：

| 新文件 | 来源 | 内容 |
|--------|------|------|
| `web/index.html` | 现有 HTML 的 `<body>` 结构 | 页面骨架（导航/Hero/Demo/价值/页脚） |
| `web/styles.css` | 现有 HTML 的 `<style>` | 全部样式，含字体替换 |
| `web/app.js` | 现有 HTML 的 `<script>` | 前端逻辑，重写为接真实 API |

### 8.2 改造清单

| 编号 | 改造项 | 说明 |
|------|--------|------|
| F1 | 删除 Google Fonts | 删除 `<link>` Google Fonts，CSS 字体变量改系统字体栈（见 8.3） |
| F2 | 增加场景选择 | 输入框上方加 3 个场景选项（会议纪要/群聊记录/任务布置），单选，切换时更新 placeholder 和示例 |
| F3 | 接真实 `/api/generate` | 用 `callGenerate(scene, text)` 替换原 `parseMeeting()`，POST 到后端 |
| F4 | loading 状态 | 生成时按钮 spinner + 输出区"AI 正在整理..."，禁用 Tab 切换 |
| F5 | error 状态 | 按 `error.code` 显示对应错误卡片（红/橙/黄），含"重试"按钮 |
| F6 | success 状态 | 输出区顶部显示绿色"✓ AI 已生成"标签，与错误强对比 |
| F7 | Key 未配置状态 | 页面加载调 `/api/health`，`aiConfigured:false` 时显示黄色提示卡片 |
| F8 | 真实复制 | `navigator.clipboard.writeText()` + 降级 `execCommand('copy')`，不只改按钮文字 |
| F9 | HTML 转义 | 所有输出文本经 `escapeHtml()` 后注入，`message`/`report` 转义后做受控高亮 |
| F10 | 移除规则解析主逻辑 | 原 `parseMeeting()`/`generateMessage()`/`generateReport()` 不再作为主生成逻辑 |

### 8.3 字体替换

删除 Google Fonts `<link>`，CSS 变量改为：
```css
--font-display: Georgia, 'Songti SC', 'STSong', 'SimSun', serif;
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
--font-mono: 'Cascadia Code', 'Consolas', 'Courier New', monospace;
```
保留"展示衬线 + 正文无衬线 + 等宽"三层层次，仅替换来源，保证离线可打开。

### 8.4 前端关键函数

| 函数 | 职责 |
|------|------|
| `escapeHtml(str)` | HTML 转义，防 XSS |
| `callGenerate(scene, text)` | POST `/api/generate`，返回 `{ok, data\|error}` |
| `checkHealth()` | GET `/api/health`，探测 Key 是否配置 |
| `renderTasks(tasks)` | 渲染任务清单（转义） |
| `renderRisks(risks)` | 渲染风险提醒（转义） |
| `renderMessage(msg)` | 渲染跟进消息（转义 + 受控高亮） |
| `renderReport(report)` | 渲染汇报草稿（转义 + 受控高亮） |
| `copyToClipboard(text)` | 真实写入剪贴板 + 降级 |
| `showState(state)` | 切换空/加载/成功/错误/Key 未配置状态 |

---

## 9. 部署方案（推荐 Render）

### 9.1 Render 配置

| 项 | 值 |
|----|-----|
| 服务类型 | Web Service |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| 环境变量 | 在 Render Dashboard 配置 `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` |

### 9.2 server 监听要求

```js
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on ${port}`);
});
```
- 必须监听 `process.env.PORT`（Render 注入）
- 必须绑定 `0.0.0.0`（Render 要求，否则外部不可访问）

### 9.3 package.json 脚本

```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "node server/index.js"
  }
}
```

### 9.4 Render 免费版冷启动说明

- 免费版服务 15 分钟无请求会休眠
- 首次请求需冷启动，可能延迟 30–60 秒
- 建议比赛演示前先访问一次预热
- 免费版每月 750 小时额度，单服务足够 Demo 使用

### 9.5 静态文件托管

后端用 `express.static('web')` 托管前端，访问根路径 `/` 返回 `web/index.html`，实现前后端同源部署。

---

## 10. 验证命令

### 10.1 本地启动

```bash
npm install
npm start
```
浏览器打开 `http://localhost:3000`

### 10.2 验证清单

| 编号 | 验证项 | 操作 | 预期结果 |
|------|--------|------|----------|
| V1 | 空输入测试 | 不输入内容，点"生成" | 前端提示"请先粘贴会议内容"，不发请求 |
| V2 | 示例输入测试 | 点"填入示例" → "生成" | 显示 loading → 成功渲染 4 个 Tab，含"✓ AI 已生成"标签 |
| V3 | 超长输入测试 | 粘贴 >3000 字内容 | 字数统计红色，提示精简；后端拒绝返回 INPUT_TOO_LONG |
| V4 | API Key 未配置测试 | 删除 .env 中 Key，重启 | 页面显示黄色"AI 服务未配置"提示 |
| V5 | AI 异常测试 | 配置错误 Key | 点生成后显示红色错误卡片 + 重试按钮 |
| V6 | XSS 输入测试 | 输入 `<script>alert(1)</script>` 和 `<img onerror=alert(1)>` | 输出区原样显示文本，不执行脚本 |
| V7 | 复制功能测试 | 生成后点"复制消息"/"复制草稿" | 系统剪贴板可粘贴出正确内容（非仅按钮变文字） |
| V8 | 移动端截图测试 | 浏览器 DevTools 切手机视图 | 输入输出上下布局，4 个 Tab 不溢出可点击 |
| V9 | 超时测试 | 模拟 AI 慢响应（或改小超时阈值） | 30 秒后显示"AI 响应超时，请重试" |
| V10 | 健康检查 | 访问 `/api/health` | 返回 `{ ok:true, aiConfigured:true/false }` |

### 10.3 与 PRD 验收标准映射

| TECH 验证 | PRD 验收 |
|-----------|----------|
| V2 | A1/A2/A3/A4/A5/A6 |
| V7 | A7 |
| V1 | B1 |
| V3 | B2 |
| V5 | B3 |
| V6 | 8.3 HTML 转义 |
| V8 | C1 响应式 |

---

*本 TECH 文档与 PRD/UI 一致，评审通过后进入 PLAN 阶段（任务分解与排期）。*
