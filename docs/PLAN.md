# 会后行动派 MVP 开发计划

> 基于 docs/PRD.md、docs/UI.md、docs/TECH.md 与现有 huihou-xingdongpai.html
> 版本：v1.0
> 日期：2026-06-20

---

## 严格遵守事项

- 不做登录、数据库、历史记录、复杂协作
- 不提交 `.env`
- 不把真实 API Key 写入代码或文档
- AI 失败必须显性报错，**不允许静默 fallback 假成功**
- 前端渲染必须做 HTML 转义
- 复制按钮必须真实写入剪贴板

---

## 阶段 0：项目初始化与安全基线

### 任务 0.1 初始化 package.json

- **目标**：建立项目依赖与启动脚本
- **创建/修改的文件**：`package.json`
- **具体步骤**：
  1. 在项目根目录创建 `package.json`
  2. 设置 `name`、`version`、`private:true`
  3. 依赖：`express`
  4. 脚本：`"start": "node server/index.js"`、`"dev": "node server/index.js"`
  5. 声明 `engines.node >= 18`
- **验证方式**：`npm install` 成功，`npm start` 不报错（即使 server 还不存在，应报明确的模块缺失而非语法错）
- **progress.md 记录**：`[阶段0-任务0.1] package.json 已创建，依赖 express，脚本 start/dev 已配置`

### 任务 0.2 创建 .gitignore

- **目标**：防止敏感文件和依赖进入仓库
- **创建/修改的文件**：`.gitignore`
- **具体步骤**：
  1. 创建 `.gitignore`，必含：`.env`、`node_modules/`、`*.log`、`.DS_Store`
- **验证方式**：`git status` 不显示 `.env` 和 `node_modules/`
- **progress.md 记录**：`[阶段0-任务0.2] .gitignore 已创建，含 .env / node_modules / *.log`

### 任务 0.3 创建 .env.example

- **目标**：提供环境变量模板，只写空值，不含真实 Key
- **创建/修改的文件**：`.env.example`
- **具体步骤**：
  1. 创建 `.env.example`，内容为空值模板：
     - `OPENAI_API_KEY=`
     - `OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`
     - `OPENAI_MODEL=qwen-plus`
     - `PORT=3000`
  2. 确认无任何真实密钥
- **验证方式**：人工检查文件内容，确认所有 Key 值为空或为公开默认值
- **progress.md 记录**：`[阶段0-任务0.3] .env.example 已创建，仅含空值模板，无真实 Key`

### 任务 0.4 创建 progress.md

- **目标**：建立开发进度跟踪文件
- **创建/修改的文件**：`progress.md`
- **具体步骤**：
  1. 创建 `progress.md`，初始内容含项目名、日期、阶段进度表头
- **验证方式**：文件存在且可读
- **progress.md 记录**：`[阶段0-任务0.4] progress.md 已创建`

### 任务 0.5 确认 .env 不提交

- **目标**：确保安全基线到位
- **创建/修改的文件**：无（验证性任务）
- **具体步骤**：
  1. 确认 `.gitignore` 含 `.env`
  2. 若 `.env` 已存在，确认 `git status` 不显示它
  3. 确认仓库中无任何真实 API Key
- **验证方式**：`git check-ignore .env` 返回 `.env`；全仓库搜索无真实 Key 格式字符串
- **progress.md 记录**：`[阶段0-任务0.5] 安全基线确认：.env 已被忽略，仓库无真实 Key`

---

## 阶段 1：拆分现有 HTML

### 任务 1.1 拆出 web/index.html

- **目标**：把 huihou-xingdongpai.html 的页面结构迁到 web/index.html，删除内联样式和脚本
- **创建/修改的文件**：`web/index.html`
- **具体步骤**：
  1. 创建 `web/` 目录
  2. 复制 huihou-xingdongpai.html 的 `<!DOCTYPE html>` 到 `</body>` 结构到 `web/index.html`
  3. 删除 `<style>...</style>` 块，替换为 `<link rel="stylesheet" href="styles.css">`
  4. 删除 `<script>...</script>` 块，替换为 `<script src="app.js"></script>`
  5. 保留所有 body 内的 HTML 结构（导航/Hero/Demo/价值/页脚）
- **验证方式**：浏览器打开 web/index.html，结构完整（样式暂未加载属正常）
- **progress.md 记录**：`[阶段1-任务1.1] web/index.html 已拆出，内联 style/script 改为外链`

### 任务 1.2 拆出 web/styles.css

- **目标**：迁移全部样式
- **创建/修改的文件**：`web/styles.css`
- **具体步骤**：
  1. 把原 HTML 的 `<style>` 内容完整复制到 `web/styles.css`
  2. 此任务暂保留 Google Fonts 引用（下一任务删除）
- **验证方式**：浏览器打开 web/index.html，视觉与原版一致
- **progress.md 记录**：`[阶段1-任务1.2] web/styles.css 已拆出，样式正常加载`

### 任务 1.3 拆出 web/app.js

- **目标**：迁移现有脚本（此阶段保留原规则解析，后续阶段再重写）
- **创建/修改的文件**：`web/app.js`
- **具体步骤**：
  1. 把原 HTML 的 `<script>` 内容完整复制到 `web/app.js`
  2. 保留 `parseMeeting`、`generateMessage`、`generateReport` 等函数（阶段 6 再移除主逻辑）
- **验证方式**：浏览器打开，点"填入示例"→"生成"，原 Demo 功能仍可用
- **progress.md 记录**：`[阶段1-任务1.3] web/app.js 已拆出，原规则解析功能保留可用`

### 任务 1.4 删除 Google Fonts 依赖

- **目标**：保证离线可打开
- **创建/修改的文件**：`web/index.html`、`web/styles.css`
- **具体步骤**：
  1. 删除 web/index.html 中的 `<link rel="preconnect">` 和 Google Fonts `<link>`
  2. 修改 web/styles.css 的字体变量：
     - `--font-display: Georgia, 'Songti SC', 'STSong', 'SimSun', serif;`
     - `--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;`
     - `--font-mono: 'Cascadia Code', 'Consolas', 'Courier New', monospace;`
- **验证方式**：断网后打开 web/index.html，字体正常显示，无 FOUT 闪烁，视觉层次保留
- **progress.md 记录**：`[阶段1-任务1.4] Google Fonts 已删除，改用系统字体栈，离线可打开`

### 任务 1.5 页面静态打开验证

- **目标**：确认拆分后页面完整可用
- **创建/修改的文件**：无（验证性任务）
- **具体步骤**：
  1. 双击直接打开 web/index.html（file:// 协议）
  2. 检查导航、Hero、Demo、价值、页脚均正常显示
  3. 检查原 Demo 的"填入示例→生成"仍可用
- **验证方式**：视觉与原 huihou-xingdongpai.html 一致，无控制台报错（除可能的 file:// 跨域）
- **progress.md 记录**：`[阶段1-任务1.5] 拆分后页面静态打开正常，视觉一致，原 Demo 可用`

---

## 阶段 2：前端 UI 改造

### 任务 2.1 增加场景选择

- **目标**：输入框上方加 3 个场景选项（meeting/chat/assignment）
- **创建/修改的文件**：`web/index.html`、`web/styles.css`、`web/app.js`
- **具体步骤**：
  1. 在输入框上方加 3 个单选按钮：会议纪要(meeting) / 群聊记录(chat) / 任务布置(assignment)
  2. 默认选中 meeting
  3. 切换场景时：清空输入框、更新 placeholder、更新"填入示例"对应的示例内容
  4. 场景值会随生成请求一起发送（阶段 6 接入）
- **验证方式**：切换 3 个场景，placeholder 和示例内容均变化
- **progress.md 记录**：`[阶段2-任务2.1] 场景选择已实现，3 个场景可切换，placeholder/示例同步更新`

### 任务 2.2 增加字数统计和隐私提示

- **目标**：输入框右下角字数统计 + 下方隐私提示
- **创建/修改的文件**：`web/index.html`、`web/styles.css`、`web/app.js`
- **具体步骤**：
  1. 输入框右下角加字数统计 `当前字数 / 2000`
  2. 字数规则：>1500 橙色、>2000 红色、>3000 禁止输入并提示
  3. 输入框下方加小字隐私提示："请勿粘贴含敏感商业信息或个人隐私的内容"
- **验证方式**：输入不同长度文本，字数颜色正确变化；超 3000 禁止继续输入
- **progress.md 记录**：`[阶段2-任务2.2] 字数统计与隐私提示已实现，超长有颜色提示和硬限制`

### 任务 2.3 实现五种状态

- **目标**：空状态、加载状态、错误状态、成功状态、AI Key 未配置状态
- **创建/修改的文件**：`web/index.html`、`web/styles.css`、`web/app.js`
- **具体步骤**：
  1. 空状态：输出区显示 📝 + 引导文案
  2. 加载状态：按钮 spinner + 输出区"AI 正在整理..."，禁用 Tab 切换
  3. 错误状态：红/橙/黄色错误卡片，含错误码对应文案 + 重试按钮
  4. 成功状态：输出区顶部绿色"✓ AI 已生成"标签 + 内容
  5. Key 未配置：黄色提示卡片"AI 服务未配置"
  6. 实现 `showState(state)` 函数统一切换
- **验证方式**：手动调用 showState 各状态，UI 正确切换，成功与错误强对比
- **progress.md 记录**：`[阶段2-任务2.3] 五种状态已实现，showState 可切换，成功/错误视觉强对比`

### 任务 2.4 修复移动端布局和 Tab 不溢出

- **目标**：响应式可用
- **创建/修改的文件**：`web/styles.css`
- **具体步骤**：
  1. 桌面端（≥901px）：Demo 左右分栏
  2. 手机端（≤900px）：上下堆叠，输入在上
  3. 4 个 Tab 在手机端文字缩短（任务/风险/消息/汇报），等宽排列，不溢出
  4. Tab 点击区域 ≥44px 高
  5. 生成按钮手机端全宽
- **验证方式**：DevTools 切手机视图，布局正常，Tab 可点击不溢出
- **progress.md 记录**：`[阶段2-任务2.4] 移动端布局已修复，Tab 不溢出，点击区域达标`

---

## 阶段 3：后端基础服务

### 任务 3.1 创建 server/index.js 骨架

- **目标**：建立 Express 服务，监听正确端口和地址
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 创建 `server/` 目录
  2. 创建 `server/index.js`，引入 express
  3. 监听 `process.env.PORT || 3000`，绑定 `0.0.0.0`
  4. 加 JSON body 解析（limit 10kb）
- **验证方式**：`npm start` 启动，控制台输出端口
- **progress.md 记录**：`[阶段3-任务3.1] server/index.js 骨架已创建，监听 PORT + 0.0.0.0`

### 任务 3.2 托管 web 静态文件

- **目标**：访问根路径返回前端页面
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 加 `app.use(express.static('web'))`
  2. 根路径 `/` 返回 web/index.html
- **验证方式**：浏览器访问 `http://localhost:3000`，页面正常显示
- **progress.md 记录**：`[阶段3-任务3.2] 静态文件托管已实现，根路径返回前端页面`

### 任务 3.3 实现 GET /api/health

- **目标**：健康检查 + 探测 AI Key 是否配置
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 实现 `GET /api/health`
  2. 返回 `{ ok:true, aiConfigured: <bool> }`
  3. aiConfigured 根据 `process.env.OPENAI_API_KEY` 或 `DASHSCOPE_API_KEY` 是否存在
- **验证方式**：`curl http://localhost:3000/api/health` 返回正确 JSON
- **progress.md 记录**：`[阶段3-任务3.3] /api/health 已实现，aiConfigured 正确反映 Key 状态`

### 任务 3.4 实现 POST /api/generate 参数校验

- **目标**：校验 scene 和 text，返回对应错误码
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 实现 `POST /api/generate`
  2. 校验 scene 必须是 meeting/chat/assignment，否则 INVALID_SCENE（文案"请选择有效场景"）
  3. 校验 text 非空，否则 EMPTY_INPUT
  4. 校验 text ≤3000 字，否则 INPUT_TOO_LONG
  5. 返回 `{ ok:false, error:{ code, message } }`
- **验证方式**：curl 测试空输入、超长输入、非法 scene，均返回对应错误码
- **progress.md 记录**：`[阶段3-任务3.4] /api/generate 参数校验已实现，3 类错误码正确返回`

### 任务 3.5 返回 AI_NOT_CONFIGURED 或占位错误（不假成功）

- **目标**：此阶段不接 AI，但必须显性报错，绝不假成功
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 参数校验通过后，检查 AI Key
  2. Key 未配置 → 返回 `{ ok:false, error:{ code:"AI_NOT_CONFIGURED", message:"AI 服务未配置，请联系部署者配置" } }`
  3. Key 已配置但 AI 未接入 → 返回 `{ ok:false, error:{ code:"AI_REQUEST_FAILED", message:"AI 服务暂未接入" } }`
  4. **严禁**返回 ok:true 或假数据
- **验证方式**：无 Key 时返回 AI_NOT_CONFIGURED；有 Key 时返回 AI_REQUEST_FAILED；绝不返回 ok:true
- **progress.md 记录**：`[阶段3-任务3.5] 占位逻辑已实现，无 Key 返回 AI_NOT_CONFIGURED，有 Key 返回 AI_REQUEST_FAILED，无假成功`

---

## 阶段 4：AI 接入

### 任务 4.1 读取环境变量

- **目标**：从 process.env 读取 AI 配置
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 读取 `OPENAI_API_KEY` 或 `DASHSCOPE_API_KEY`（优先 OPENAI_API_KEY）
  2. 读取 `OPENAI_BASE_URL`（默认 dashscope 兼容端点）
  3. 读取 `OPENAI_MODEL`（默认 qwen-plus）
  4. 启动时打印配置是否就绪（不打印 Key 值）
- **验证方式**：配置 Key 后启动，日志显示"AI 配置就绪"；不打印 Key 本身
- **progress.md 记录**：`[阶段4-任务4.1] 环境变量读取已实现，Key 不打印到日志`

### 任务 4.2 调用 OpenAI 兼容接口

- **目标**：用 fetch 调用 AI 接口
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 用原生 fetch 调 `${OPENAI_BASE_URL}/chat/completions`
  2. Header 含 `Authorization: Bearer ${apiKey}`
  3. body 含 model、messages、temperature:0.3、max_tokens:2000、response_format
  4. 接口返回非 200 → AI_REQUEST_FAILED
- **验证方式**：配置真 Key，curl 调 /api/generate，后端日志可见 AI 请求和响应状态
- **progress.md 记录**：`[阶段4-任务4.2] AI 接口调用已实现，非 200 返回 AI_REQUEST_FAILED`

### 任务 4.3 设置 30 秒超时

- **目标**：防止 AI 慢响应卡死
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 用 AbortController 设置 30 秒超时
  2. 超时 → 返回 `{ ok:false, error:{ code:"AI_TIMEOUT", message:"AI 响应超时，请重试" } }`
- **验证方式**：临时改小超时阈值（如 1 秒）验证超时分支返回 AI_TIMEOUT
- **progress.md 记录**：`[阶段4-任务4.3] 30 秒超时已实现，超时返回 AI_TIMEOUT`

### 任务 4.4 构造系统 Prompt 和用户 Prompt

- **目标**：按 TECH.md 第 5 节构造 Prompt
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 实现 systemPrompt（角色 + JSON 结构 + 字段规则，要求只返回 JSON 无 Markdown）
  2. 实现 userPrompt 模板（场景标签 + 内容）
  3. sceneLabel 映射：meeting→会议纪要、chat→群聊记录、assignment→老师或领导布置任务
- **验证方式**：代码 review，Prompt 内容与 TECH.md 5.1/5.2 一致
- **progress.md 记录**：`[阶段4-任务4.4] Prompt 构造已实现，与 TECH.md 第 5 节对齐`

### 任务 4.5 返回真实 AI 响应

- **目标**：后端内部拿到真实 AI content 并确认"AI 可达"，但 /api/generate 仍不返回 ok:true
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 提取 `choices[0].message.content`
  2. 在后端日志记录"AI 可达"+ content 长度（不打印完整 content）
  3. 此阶段 /api/generate 仍返回 `{ ok:false, error:{ code:"AI_REQUEST_FAILED", message:"AI 服务暂未完成解析" } }`，**不返回 ok:true**
  4. 直到阶段 5 JSON 解析校验完成，才允许返回 ok:true + data
- **验证方式**：curl 调 /api/generate，后端日志显示"AI 可达"，但响应仍是 ok:false（非 ok:true）
- **progress.md 记录**：`[阶段4-任务4.5] AI 可达已验证（后端日志），/api/generate 仍不返回 ok:true，待阶段 5 解析完成才放行`

---

## 阶段 5：JSON 解析与校验

### 任务 5.1 提取 AI JSON

- **目标**：从 AI 输出中提取纯 JSON
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 去除可能的 ` ```json ` 和 ` ``` ` 代码块标记（兜底）
  2. trim 首尾空白
- **验证方式**：对含代码块标记的 AI 输出能正确提取 JSON 字符串
- **progress.md 记录**：`[阶段5-任务5.1] JSON 提取已实现，可去除代码块标记`

### 任务 5.2 JSON.parse

- **目标**：解析 JSON，失败返回 AI_BAD_RESPONSE
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. `JSON.parse(content)`
  2. 失败 → 返回 `{ ok:false, error:{ code:"AI_BAD_RESPONSE", message:"AI 返回内容无法解析，请重试" } }`
  3. **不静默 fallback 假成功**
- **验证方式**：构造非法 JSON 输入，返回 AI_BAD_RESPONSE，不返回 ok:true
- **progress.md 记录**：`[阶段5-任务5.2] JSON.parse 已实现，失败返回 AI_BAD_RESPONSE，无假成功`

### 任务 5.3 校验 tasks/risks/message/report

- **目标**：校验顶层字段类型
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. tasks 必须是数组，否则 AI_BAD_RESPONSE
  2. risks 必须是数组，否则 AI_BAD_RESPONSE
  3. message 必须是字符串
  4. report 必须是字符串
- **验证方式**：构造缺字段或类型错误的 JSON，返回 AI_BAD_RESPONSE
- **progress.md 记录**：`[阶段5-任务5.3] 顶层字段校验已实现，类型错误返回 AI_BAD_RESPONSE`

### 任务 5.4 缺失字段补默认值

- **目标**：tasks 和 risks 内部字段缺失补默认值
- **创建/修改的文件**：`server/index.js`
- **具体步骤**：
  1. 按 TECH.md 6.2 表格补默认值（owner→未指派、deadline→未指定、priority→中、dependency→null、unclear→false 等）
  2. risks 字段：type→info、icon→⚠️、title/desc→""
- **验证方式**：构造缺失部分字段的 AI 返回，补默认值后结构完整
- **progress.md 记录**：`[阶段5-任务5.4] 缺失字段补默认值已实现，按 TECH.md 6.2 表格`

### 任务 5.5 解析失败返回 AI_BAD_RESPONSE（整合验证）

- **目标**：确认整个解析链路不允许静默 fallback
- **创建/修改的文件**：无（验证性任务）
- **具体步骤**：
  1. 测试：合法 JSON → ok:true + data
  2. 测试：非法 JSON → AI_BAD_RESPONSE
  3. 测试：字段类型错 → AI_BAD_RESPONSE
  4. 确认任何情况下都不返回 ok:true + 空 data 来掩盖错误
- **验证方式**：3 类测试均符合预期，无假成功
- **progress.md 记录**：`[阶段5-任务5.5] 解析链路验证通过，任何失败均显性报错，无假成功`

---

## 阶段 6：前端接真实 API

### 任务 6.1 用 fetch POST /api/generate 替换规则解析

- **目标**：移除 parseMeeting 主逻辑，改调后端
- **创建/修改的文件**：`web/app.js`
- **具体步骤**：
  1. 实现 `callGenerate(scene, text)`：fetch POST /api/generate
  2. 生成按钮点击 → 前端校验 → callGenerate
  3. 移除 parseMeeting/generateMessage/generateReport 作为主生成逻辑（可保留为调试用，默认不可达）
  4. 网络错误 → 映射为 NETWORK_ERROR
- **验证方式**：点生成，Network 面板可见 POST /api/generate 请求
- **progress.md 记录**：`[阶段6-任务6.1] 前端已改调 /api/generate，规则解析主逻辑已移除`

### 任务 6.2 根据 ok/data/error 渲染成功或错误

- **目标**：按后端响应分支渲染
- **创建/修改的文件**：`web/app.js`
- **具体步骤**：
  1. ok:true → showState('success') + 渲染 4 个 Tab
  2. ok:false → showState('error') + 按 error.code 显示文案
  3. 默认选中"任务清单"Tab
- **验证方式**：成功时显示"✓ AI 已生成"+内容；失败时显示错误卡片
- **progress.md 记录**：`[阶段6-任务6.2] ok/data/error 分支渲染已实现，成功/错误视觉强对比`

### 任务 6.3 所有输出 escapeHtml

- **目标**：防 XSS
- **创建/修改的文件**：`web/app.js`
- **具体步骤**：
  1. 实现 `escapeHtml(str)`：`<>&"'` 转义
  2. renderTasks/renderRisks：所有字段转义后注入
  3. renderMessage/renderReport：先整体转义，再做受控高亮（仅替换 @人名、【标签】等已知模式）
  4. 禁止对 AI 返回内容直接 innerHTML
- **验证方式**：输入 `<script>alert(1)</script>`，输出区原样显示文本不执行
- **progress.md 记录**：`[阶段6-任务6.3] escapeHtml 已实现，所有输出转义，XSS 不执行`

### 任务 6.4 实现真实复制 clipboard

- **目标**：复制按钮真实写入剪贴板
- **创建/修改的文件**：`web/app.js`
- **具体步骤**：
  1. 实现 `copyToClipboard(text)`：优先 `navigator.clipboard.writeText`
  2. 降级：临时 textarea + `document.execCommand('copy')`
  3. 成功：按钮变"✓ 已复制"（绿色，2 秒恢复）
  4. 失败：按钮变"✗ 复制失败"（红色，2 秒恢复）
  5. **不只改按钮文字**
- **验证方式**：点复制后，系统剪贴板可粘贴出正确内容
- **progress.md 记录**：`[阶段6-任务6.4] 真实复制已实现，clipboard API + 降级，剪贴板可粘贴`

### 任务 6.5 重试按钮可用

- **目标**：错误状态可重试
- **创建/修改的文件**：`web/app.js`
- **具体步骤**：
  1. 错误卡片含"重试"按钮
  2. 重试时复用上次输入内容和场景
  3. 重试时 showState('loading')
- **验证方式**：触发错误后点重试，重新发起请求
- **progress.md 记录**：`[阶段6-任务6.5] 重试按钮已实现，复用上次输入`

---

## 阶段 7：本地验收

### 任务 7.1 空输入测试

- **目标**：验证空输入处理
- **创建/修改的文件**：无
- **具体步骤**：不输入内容点生成
- **验证方式**：前端提示"请先粘贴会议内容"，不发请求
- **progress.md 记录**：`[阶段7-任务7.1] 空输入测试通过：前端提示，不发请求`

### 任务 7.2 示例输入真实 AI 测试

- **目标**：验证核心链路
- **创建/修改的文件**：无
- **具体步骤**：填入示例 → 生成
- **验证方式**：loading → 成功渲染 4 个 Tab，含"✓ AI 已生成"，任务≥5 条，风险≥2 条
- **progress.md 记录**：`[阶段7-任务7.2] 示例输入测试通过：AI 真实返回，4 Tab 正确渲染`

### 任务 7.3 超长输入测试

- **目标**：验证超长处理
- **创建/修改的文件**：无
- **具体步骤**：粘贴 >3000 字内容
- **验证方式**：字数红色提示，后端返回 INPUT_TOO_LONG
- **progress.md 记录**：`[阶段7-任务7.3] 超长输入测试通过：前端提示 + 后端 INPUT_TOO_LONG`

### 任务 7.4 API Key 未配置测试

- **目标**：验证 Key 未配置状态
- **创建/修改的文件**：无
- **具体步骤**：删除 .env 中 Key，重启
- **验证方式**：页面显示黄色"AI 服务未配置"提示
- **progress.md 记录**：`[阶段7-任务7.4] Key 未配置测试通过：黄色提示卡片显示`

### 任务 7.5 错误 Key 测试

- **目标**：验证 AI 异常处理
- **创建/修改的文件**：无
- **具体步骤**：配置错误 Key
- **验证方式**：点生成显示红色错误卡片 + 重试按钮
- **progress.md 记录**：`[阶段7-任务7.5] 错误 Key 测试通过：红色错误卡片 + 重试按钮`

### 任务 7.6 XSS 输入测试

- **目标**：验证 XSS 防护
- **创建/修改的文件**：无
- **具体步骤**：输入 `<script>alert(1)</script>` 和 `<img onerror=alert(1)>`
- **验证方式**：输出区原样显示文本，不执行脚本
- **progress.md 记录**：`[阶段7-任务7.6] XSS 测试通过：输入原样显示，不执行脚本`

### 任务 7.7 复制功能测试

- **目标**：验证真实复制
- **创建/修改的文件**：无
- **具体步骤**：生成后点复制消息/复制草稿
- **验证方式**：系统剪贴板可粘贴出正确内容
- **progress.md 记录**：`[阶段7-任务7.7] 复制测试通过：剪贴板真实写入`

### 任务 7.8 移动端截图测试

- **目标**：验证响应式
- **创建/修改的文件**：无
- **具体步骤**：DevTools 切手机视图
- **验证方式**：上下布局，4 个 Tab 不溢出可点击，截图保存
- **progress.md 记录**：`[阶段7-任务7.8] 移动端测试通过：布局正常，Tab 不溢出`

### 任务 7.9 记录结果到 progress.md

- **目标**：汇总验收结果
- **创建/修改的文件**：`progress.md`
- **具体步骤**：把 7.1–7.8 结果汇总写入 progress.md
- **验证方式**：progress.md 含完整验收记录
- **progress.md 记录**：`[阶段7-任务7.9] 验收结果已汇总，V1–V8 全部通过`

---

## 阶段 8：部署准备

### 任务 8.1 检查 .env 不在 git

- **目标**：确认安全
- **创建/修改的文件**：无
- **具体步骤**：`git check-ignore .env`、`git status` 确认
- **验证方式**：.env 被忽略，仓库无真实 Key
- **progress.md 记录**：`[阶段8-任务8.1] 确认 .env 不在 git，仓库无真实 Key`

### 任务 8.2 检查 start 命令

- **目标**：确认部署命令
- **创建/修改的文件**：无
- **具体步骤**：确认 package.json 的 start 脚本为 `node server/index.js`
- **验证方式**：`npm start` 本地可启动
- **progress.md 记录**：`[阶段8-任务8.2] start 命令确认：node server/index.js`

### 任务 8.3 检查 PORT 和 0.0.0.0

- **目标**：确认 Render 兼容
- **创建/修改的文件**：无
- **具体步骤**：确认 server 监听 `process.env.PORT || 3000` + `0.0.0.0`
- **验证方式**：代码 review，两项均符合
- **progress.md 记录**：`[阶段8-任务8.3] PORT 和 0.0.0.0 监听确认`

### 任务 8.4 列出 Render 环境变量

- **目标**：明确部署需配置的变量
- **创建/修改的文件**：无
- **具体步骤**：列出需在 Render Dashboard 配置的环境变量
- **验证方式**：清单含 OPENAI_API_KEY、OPENAI_BASE_URL、OPENAI_MODEL
- **progress.md 记录**：`[阶段8-任务8.4] Render 环境变量清单已列出`

### 任务 8.5 部署前检查清单

- **目标**：确保部署无遗漏
- **创建/修改的文件**：无
- **具体步骤**：输出检查清单
- **验证方式**：清单全部勾选
- **progress.md 记录**：`[阶段8-任务8.5] 部署前检查清单已输出`

**部署前检查清单**：
- [ ] .env 不在 git
- [ ] package.json start 脚本正确
- [ ] server 监听 process.env.PORT + 0.0.0.0
- [ ] 代码已推 GitHub
- [ ] Render 服务已创建（Build: npm install, Start: npm start）
- [ ] Render 环境变量已配置（OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL）
- [ ] 本地 V1–V8 全部通过

---

## 阶段 9：比赛材料整理

### 任务 9.1 线上体验地址

- **目标**：记录 Render URL
- **创建/修改的文件**：`progress.md`
- **具体步骤**：部署后记录 Render 公开 URL
- **验证方式**：URL 可公开访问
- **progress.md 记录**：`[阶段9-任务9.1] 线上体验地址：<URL>`

### 任务 9.2 首页截图

- **目标**：展示产品入口
- **创建/修改的文件**：截图保存
- **具体步骤**：截桌面端首页全屏
- **验证方式**：截图清晰含 Hero + Demo 入口
- **progress.md 记录**：`[阶段9-任务9.2] 首页截图已保存`

### 任务 9.3 生成结果截图

- **目标**：展示核心功能
- **创建/修改的文件**：截图保存
- **具体步骤**：截 4 个 Tab 的生成结果
- **验证方式**：4 张截图均含"✓ AI 已生成"+真实内容
- **progress.md 记录**：`[阶段9-任务9.3] 生成结果截图已保存（4 个 Tab）`

### 任务 9.4 错误/安全状态截图

- **目标**：展示健壮性
- **创建/修改的文件**：截图保存
- **具体步骤**：截错误卡片、Key 未配置、XSS 防护
- **验证方式**：3 张截图展示错误处理和安全
- **progress.md 记录**：`[阶段9-任务9.4] 错误/安全状态截图已保存`

### 任务 9.5 移动端截图

- **目标**：展示响应式
- **创建/修改的文件**：截图保存
- **具体步骤**：截手机视图
- **验证方式**：截图展示上下布局 + Tab 不溢出
- **progress.md 记录**：`[阶段9-任务9.5] 移动端截图已保存`

### 任务 9.6 TRAE Session ID 记录

- **目标**：满足比赛要求
- **创建/修改的文件**：`progress.md`
- **具体步骤**：记录本次开发的 TRAE Session ID
- **验证方式**：ID 已记录
- **progress.md 记录**：`[阶段9-任务9.6] TRAE Session ID：<ID>`

### 任务 9.7 发帖正文补充建议

- **目标**：准备比赛发帖
- **创建/修改的文件**：`progress.md`
- **具体步骤**：撰写发帖正文建议（产品定位、核心功能、技术亮点、体验地址）
- **验证方式**：正文完整含 4 要素
- **progress.md 记录**：`[阶段9-任务9.7] 发帖正文建议已输出`

---

## 停止点说明

**每完成一个阶段，TRAE 必须先汇报验证结果，等待用户确认后再进入下一阶段。**

汇报内容包含：
1. 本阶段完成的任务清单
2. 每个任务的验证结果
3. progress.md 已记录的内容
4. 遇到的问题（如有）
5. 请求确认进入下一阶段

未经确认，不得擅自开始下一阶段。
