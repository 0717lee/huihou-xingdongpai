// ========== 会后行动派 · 后端服务（阶段 5：JSON 解析与校验） ==========
// 阶段 5：AI 请求成功后返回原始 content 给解析函数
// 解析校验通过后 /api/generate 才返回 ok:true + data
// 解析失败/字段类型错误/content 为空都返回 AI_BAD_RESPONSE

// 加载本地 .env 文件（.env 已在 .gitignore 中，不会提交）
require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== 中间件：JSON body 解析（limit 10kb） ==========
app.use(express.json({ limit: '10kb' }));

// ========== 静态文件托管：web/ 目录 ==========
app.use(express.static(path.join(__dirname, '..', 'web')));

// ========== AI 配置（环境变量） ==========
// 优先 OPENAI_API_KEY，其次 DASHSCOPE_API_KEY
const AI_API_KEY = process.env.OPENAI_API_KEY || process.env.DASHSCOPE_API_KEY || '';
const AI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const AI_MODEL = process.env.OPENAI_MODEL || 'qwen-plus';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 30000; // 默认 30 秒超时，测试时可临时调小

function isAiConfigured(){
  return Boolean(AI_API_KEY && AI_API_KEY.trim().length > 0);
}

// ========== Prompt 构造（严格参考 docs/TECH.md 第 5 节） ==========
const SYSTEM_PROMPT = `你是一个会议行动项整理助手。用户会粘贴会议纪要、群聊记录或任务布置内容，你需要整理成结构化行动方案。

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
- report：含【本周行动项总览】【高优先级任务】【常规任务】【风险项】【下一步计划】5 个段落`;

const SCENE_LABELS = {
  meeting: '会议纪要',
  chat: '群聊记录',
  assignment: '老师或领导布置任务'
};

function buildUserPrompt(scene, text){
  const sceneLabel = SCENE_LABELS[scene] || '会议纪要';
  return `【场景】${sceneLabel}\n【内容】\n${text}\n\n请按系统指令整理并返回 JSON。`;
}

// ========== 调用 AI（OpenAI 兼容接口） ==========
async function callAi(scene, text){
  const userPrompt = buildUserPrompt(scene, text);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try{
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    if(!response.ok){
      // 接口非 200，返回 AI_REQUEST_FAILED
      return { ok: false, code: 'AI_REQUEST_FAILED', message: `AI 服务暂未接入` };
    }

    const data = await response.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if(!content){
      return { ok: false, code: 'AI_BAD_RESPONSE', message: 'AI 返回内容为空' };
    }

    // 阶段 5：AI 请求成功，返回原始 content 给解析函数
    // 不打印完整用户输入或完整 AI 输出，只记录长度
    console.log(`[会后行动派] AI 可达，返回 content 长度：${content.length}`);

    return { ok: true, content };
  }catch(err){
    if(err.name === 'AbortError'){
      return { ok: false, code: 'AI_TIMEOUT', message: 'AI 响应超时，请稍后重试' };
    }
    // 网络错误等其他异常
    return { ok: false, code: 'AI_REQUEST_FAILED', message: 'AI 服务暂未接入' };
  }finally{
    clearTimeout(timer);
  }
}

// ========== JSON 解析与校验（阶段 5） ==========

// 提取 JSON 内容：支持纯 JSON、```json ... ```、``` ... ``` 包裹
function extractJsonContent(content){
  if(!content || typeof content !== 'string') return '';
  let s = content.trim();
  // 去除 ```json ... ``` 或 ``` ... ``` 包裹（兜底，AI 偶尔不遵守 json_object 约定）
  const fenceMatch = s.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if(fenceMatch){
    s = fenceMatch[1].trim();
  }
  return s;
}

// 解析 AI 返回的 JSON：JSON.parse 失败返回 AI_BAD_RESPONSE
function parseAiJson(content){
  const jsonStr = extractJsonContent(content);
  if(!jsonStr){
    return { ok: false, code: 'AI_BAD_RESPONSE', message: 'AI 返回内容无法解析，请重试' };
  }
  try{
    const parsed = JSON.parse(jsonStr);
    return { ok: true, parsed };
  }catch(e){
    return { ok: false, code: 'AI_BAD_RESPONSE', message: 'AI 返回内容无法解析，请重试' };
  }
}

// 合法值枚举
const VALID_PRIORITIES = ['高', '中', '低'];
const VALID_RISK_TYPES = ['danger', 'warning', 'info'];

// 校验并规范化 AI 数据
// 顶层类型错误直接 AI_BAD_RESPONSE；tasks/risks 内部字段缺失补默认值
function normalizeAiData(parsed){
  if(!parsed || typeof parsed !== 'object'){
    return { ok: false, code: 'AI_BAD_RESPONSE', message: 'AI 返回内容无法解析，请重试' };
  }
  // 顶层校验：tasks/risks 必须是数组，message/report 必须是字符串
  if(!Array.isArray(parsed.tasks)){
    return { ok: false, code: 'AI_BAD_RESPONSE', message: 'AI 返回内容无法解析，请重试' };
  }
  if(!Array.isArray(parsed.risks)){
    return { ok: false, code: 'AI_BAD_RESPONSE', message: 'AI 返回内容无法解析，请重试' };
  }
  if(typeof parsed.message !== 'string'){
    return { ok: false, code: 'AI_BAD_RESPONSE', message: 'AI 返回内容无法解析，请重试' };
  }
  if(typeof parsed.report !== 'string'){
    return { ok: false, code: 'AI_BAD_RESPONSE', message: 'AI 返回内容无法解析，请重试' };
  }

  // tasks 内部字段补默认值
  const tasks = parsed.tasks.map((t, i) => {
    const task = (t && typeof t === 'object') ? t : {};
    // priority 只能是 高/中/低，否则默认"中"
    const priority = VALID_PRIORITIES.includes(task.priority) ? task.priority : '中';
    // dependency 只能是字符串或 null，否则 null
    let dependency = null;
    if(typeof task.dependency === 'string'){
      dependency = task.dependency;
    }
    return {
      id: typeof task.id === 'number' ? task.id : (i + 1),
      task: typeof task.task === 'string' ? task.task : '',
      owner: typeof task.owner === 'string' ? task.owner : '未指派',
      deadline: typeof task.deadline === 'string' ? task.deadline : '未指定',
      priority,
      dependency,
      unclear: typeof task.unclear === 'boolean' ? task.unclear : false
    };
  });

  // risks 内部字段补默认值
  const risks = parsed.risks.map(r => {
    const risk = (r && typeof r === 'object') ? r : {};
    // type 只能是 danger/warning/info，否则 info
    const type = VALID_RISK_TYPES.includes(risk.type) ? risk.type : 'info';
    return {
      type,
      icon: typeof risk.icon === 'string' ? risk.icon : '⚠️',
      title: typeof risk.title === 'string' ? risk.title : '',
      desc: typeof risk.desc === 'string' ? risk.desc : ''
    };
  });

  return {
    ok: true,
    data: {
      tasks,
      risks,
      message: parsed.message,
      report: parsed.report
    }
  };
}

// ========== GET /api/health：健康检查 + AI 配置探测 ==========
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    aiConfigured: isAiConfigured()
  });
});

// ========== POST /api/generate：参数校验 + AI 调用 ==========
const VALID_SCENES = ['meeting', 'chat', 'assignment'];
const TEXT_MAX_LENGTH = 3000;

app.post('/api/generate', async (req, res) => {
  const { scene, text } = req.body || {};

  // 1. scene 校验：必须是 meeting/chat/assignment
  if(!VALID_SCENES.includes(scene)){
    return res.json({
      ok: false,
      error: { code: 'INVALID_SCENE', message: '请选择有效场景' }
    });
  }

  // 2. text 非空校验
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if(!trimmed){
    return res.json({
      ok: false,
      error: { code: 'EMPTY_INPUT', message: '请输入需要整理的内容' }
    });
  }

  // 3. text 长度校验：不能超过 3000 字
  if(text.length > TEXT_MAX_LENGTH){
    return res.json({
      ok: false,
      error: { code: 'INPUT_TOO_LONG', message: `内容超过 ${TEXT_MAX_LENGTH} 字上限，请精简后重试` }
    });
  }

  // 4. 参数校验通过，检查 AI Key
  if(!isAiConfigured()){
    return res.json({
      ok: false,
      error: { code: 'AI_NOT_CONFIGURED', message: 'AI 服务未配置，请联系部署者配置' }
    });
  }

  // 5. 调用 AI
  const aiResult = await callAi(scene, text);
  if(!aiResult.ok){
    return res.json({
      ok: false,
      error: { code: aiResult.code, message: aiResult.message }
    });
  }

  // 6. 解析 AI 返回的 JSON
  const parseResult = parseAiJson(aiResult.content);
  if(!parseResult.ok){
    return res.json({
      ok: false,
      error: { code: parseResult.code, message: parseResult.message }
    });
  }

  // 7. 校验并规范化数据
  const normResult = normalizeAiData(parseResult.parsed);
  if(!normResult.ok){
    return res.json({
      ok: false,
      error: { code: normResult.code, message: normResult.message }
    });
  }

  // 8. 解析校验通过，返回 ok:true + data
  // 日志只记录数量，不打印完整内容
  console.log(`[会后行动派] 解析成功：tasks=${normResult.data.tasks.length} risks=${normResult.data.risks.length}`);
  return res.json({
    ok: true,
    data: normResult.data
  });
});

// ========== 启动服务：监听 PORT + 0.0.0.0 ==========
// 仅在直接运行（npm start / node server/index.js）时启动，被 require 时不启动
if(require.main === module){
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[会后行动派] 服务已启动：http://localhost:${PORT}`);
    // 启动日志只显示 AI 配置是否就绪，不打印 Key
    console.log(`[会后行动派] AI 配置状态：${isAiConfigured() ? '已就绪' : '未配置'}`);
  });
}

// 导出解析函数供测试使用
module.exports = { extractJsonContent, parseAiJson, normalizeAiData };
