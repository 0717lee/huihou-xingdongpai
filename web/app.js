// ========== 示例会议记录 ==========
const SAMPLE_MEETING = `产品周会 · 2024年3月15日

参会人员：张明、李娜、王强、赵雪、陈晨

1. 张明负责本周五前完成新版首页设计稿，比较紧急。
2. 李娜跟进用户调研报告，下周一前提交。
3. 王强说后端接口开发需要等赵雪的数据库设计完成才能开始。
4. 营销活动的方案还没定，需要再讨论一下。
5. 赵雪负责数据库设计，本周三前完成。
6. 下周要做一次全员产品培训，时间待定。
7. 张明还要准备客户演示PPT，截止时间下周三。
8. 陈晨需要整理上版本用户反馈，本周内完成。`;

// ========== 阶段2：场景配置（meeting / chat / assignment） ==========
const SAMPLE_CHAT = `项目沟通群 · 2024年3月15日

@张明 客户那边的首页设计稿本周五前一定要给到，比较急。
@李娜 用户调研报告下周一前发我邮箱。
@王强 后端接口你先等着，赵雪把数据库设计完你再开工。
@赵雪 数据库设计本周三前搞定，辛苦。
营销活动方案大家再想想，下次会议定。
下周做一次全员产品培训，时间另行通知。
@张明 客户演示PPT下周三前准备好。
@陈晨 上版本用户反馈本周内整理出来发群里。`;

const SAMPLE_ASSIGNMENT = `任务布置 · 2024年3月15日

致项目组全体成员：

1. 张明，请在周五下班前完成新版首页设计稿，客户演示要用，优先级高。
2. 李娜，下周一前提交用户调研报告，需包含竞品分析和用户访谈结论。
3. 赵雪，本周三前完成数据库设计文档，王强的接口开发依赖此文档。
4. 王强，赵雪数据库设计完成后立即开始后端接口开发，预计下周五前完成核心接口。
5. 陈晨，本周内整理上版本用户反馈，按问题类型分类汇总。`;

const SCENES = {
  meeting: {
    label: '会议内容输入区',
    placeholder: '把会议纪要粘贴到这里...',
    sample: SAMPLE_MEETING,
    emptyHint: '在左侧粘贴会议内容并点击"生成方案"<br>这里将展示结构化的行动方案'
  },
  chat: {
    label: '群聊记录输入区',
    placeholder: '把群聊记录粘贴到这里...',
    sample: SAMPLE_CHAT,
    emptyHint: '在左侧粘贴群聊记录并点击"生成方案"<br>这里将展示结构化的行动方案'
  },
  assignment: {
    label: '任务布置输入区',
    placeholder: '把任务布置内容粘贴到这里...',
    sample: SAMPLE_ASSIGNMENT,
    emptyHint: '在左侧粘贴任务布置内容并点击"生成方案"<br>这里将展示结构化的行动方案'
  }
};

let currentScene = 'meeting';

// ========== 阶段6：工具函数（转义 / API 调用 / 剪贴板） ==========

// HTML 转义：防止 AI 返回内容触发 XSS
function escapeHtml(str){
  if(str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 错误码 → 用户友好文案映射（不暴露技术细节/环境变量名）
const ERROR_MESSAGES = {
  EMPTY_INPUT: { title: '请先输入内容', desc: '把会议纪要、群聊记录或任务布置粘贴到左侧输入框后重试' },
  INPUT_TOO_LONG: { title: '内容过长，无法生成', desc: '请精简内容后重试（上限 3000 字）' },
  INVALID_SCENE: { title: '场景无效', desc: '请选择有效的场景类型后重试' },
  AI_NOT_CONFIGURED: { title: '服务尚未就绪', desc: '演示环境的服务尚未配置完成，请联系部署者处理后再试' },
  AI_TIMEOUT: { title: '响应超时', desc: '服务响应时间过长，请稍后重试' },
  AI_BAD_RESPONSE: { title: '返回内容无法解析', desc: '返回的内容格式异常，请重试或调整输入内容' },
  AI_REQUEST_FAILED: { title: '服务暂时不可用', desc: '服务调用失败，请稍后重试' },
  NETWORK_ERROR: { title: '网络连接失败', desc: '无法连接到服务，请检查网络后重试' }
};

// GET /api/health：检查 AI 配置状态
async function callHealth(){
  try{
    const res = await fetch('/api/health', { method: 'GET' });
    if(!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, aiConfigured: !!data.aiConfigured };
  }catch(e){
    return { ok: false };
  }
}

// POST /api/generate：调用后端生成行动方案
async function callGenerate(scene, text){
  try{
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene, text })
    });
    const data = await res.json();
    return data; // { ok:true, data } 或 { ok:false, error:{ code, message } }
  }catch(e){
    return { ok: false, error: { code: 'NETWORK_ERROR', message: '网络连接失败' } };
  }
}

// 真实复制到剪贴板：优先 navigator.clipboard，降级 execCommand
async function copyToClipboard(text){
  // 优先现代 API
  if(navigator.clipboard && navigator.clipboard.writeText){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(e){
      // 权限失败则降级
    }
  }
  // 降级：临时 textarea + execCommand
  try{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }catch(e){
    return false;
  }
}

// ========== 渲染函数 ==========
function renderTasks(tasks){
  if(tasks.length === 0){
    return '<div class="output-empty"><div class="output-empty-icon">§</div><p>未识别到任务<br>请尝试粘贴更详细的内容</p></div>';
  }
  let html = '<div class="task-list">';
  tasks.forEach((t,i) => {
    const priorityClass = t.priority === '高' ? 'priority-high' : t.priority === '中' ? 'priority-mid' : 'priority-low';
    const priorityLabel = t.priority === '高' ? '高' : t.priority === '中' ? '中' : '低';
    // 所有字段先 escapeHtml，再拼接（priority 已受限于 高/中/低，仍转义保持一致）
    const safeId = escapeHtml(t.id);
    const safeTask = escapeHtml(t.task);
    const safeOwner = escapeHtml(t.owner);
    const safeDeadline = escapeHtml(t.deadline);
    const safePriority = escapeHtml(priorityLabel);
    const safePriorityClass = escapeHtml(priorityClass);
    let metaHtml = '';
    metaHtml += `<span class="task-meta-item owner">负责人 · ${safeOwner}</span>`;
    metaHtml += `<span class="task-meta-item deadline">截止 · ${safeDeadline}</span>`;
    metaHtml += `<span class="task-meta-item ${safePriorityClass}">优先级 · ${safePriority}</span>`;
    if(t.dependency){
      metaHtml += `<span class="task-meta-item status">依赖 · ${escapeHtml(t.dependency)}</span>`;
    }
    if(t.unclear){
      metaHtml += `<span class="task-meta-item status">待确认</span>`;
    }
    html += `
      <div class="task-item" style="animation-delay:${i*0.08}s">
        <div class="task-item-header">
          <div class="task-num">${safeId}</div>
          <div class="task-text">${safeTask}</div>
        </div>
        <div class="task-meta">${metaHtml}</div>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

function renderRisks(risks){
  if(risks.length === 0){
    return '<div class="output-empty"><div class="output-empty-icon">§</div><p>未检测到风险</p></div>';
  }
  let html = '<div class="risk-list">';
  risks.forEach((r,i) => {
    // type 已受限于 danger/warning/info，title/desc 全部转义
    // 去 emoji：用编辑感编号替代 icon
    const safeType = escapeHtml(r.type);
    const riskNum = String(i + 1).padStart(2, '0');
    const safeTitle = escapeHtml(r.title);
    const safeDesc = escapeHtml(r.desc);
    html += `
      <div class="risk-item ${safeType}" style="animation-delay:${i*0.08}s">
        <div class="risk-icon">${riskNum}</div>
        <div class="risk-content">
          <div class="risk-title">${safeTitle}</div>
          <div class="risk-desc">${safeDesc}</div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

function renderMessage(msg){
  // 阶段6：先整体 escapeHtml 防 XSS，再做受控高亮（仅替换 @人名、【标签】、分隔线）
  const safe = escapeHtml(msg);
  const formatted = safe
    .replace(/@([\u4e00-\u9fa5]{2,3})/g, '<span class="mention">@$1</span>')
    .replace(/(【[^】]+】)/g, '<span class="highlight">$1</span>')
    .replace(/(━{3,})/g, '<span style="color:var(--line)">$1</span>');
  return `
    <div class="message-draft">${formatted}</div>
    <div class="draft-actions">
      <button class="draft-copy-btn" data-copy-type="message">复制消息</button>
    </div>
  `;
}

function renderReport(report){
  // 阶段6：先整体 escapeHtml 防 XSS，再做受控格式化
  const safe = escapeHtml(report);
  let formatted = safe
    .replace(/(【[^】]+】)/g, '<div class="report-section-title">$1</div>');
  // 将非标题行转为 report-item
  formatted = formatted.split('\n').map(line => {
    if(line.includes('report-section-title') || line.trim() === '') return line;
    if(line.trim().startsWith('·')){
      return `<div class="report-item">${line.trim()}</div>`;
    }
    return line;
  }).join('\n');

  return `
    <div class="report-draft">${formatted}</div>
    <div class="draft-actions">
      <button class="draft-copy-btn" data-copy-type="report">复制草稿</button>
    </div>
  `;
}

// ========== 复制功能（阶段6：真实写入剪贴板） ==========
// 使用事件委托处理复制按钮点击（renderMessage/renderReport 重新生成按钮后仍可用）
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.draft-copy-btn');
  if(!btn) return;
  const type = btn.dataset.copyType;
  const text = (type === 'message' && currentResult) ? currentResult.message
            : (type === 'report' && currentResult) ? currentResult.report
            : '';
  if(!text){
    btn.textContent = '无内容可复制';
    btn.style.color = 'var(--vermilion)';
    btn.style.borderColor = 'var(--vermilion)';
    setTimeout(() => { btn.textContent = '复制' + (type === 'message' ? '消息' : '草稿'); btn.style.color = ''; btn.style.borderColor = ''; }, 2000);
    return;
  }
  const ok = await copyToClipboard(text);
  const original = '复制' + (type === 'message' ? '消息' : '草稿');
  if(ok){
    btn.textContent = '已复制';
    btn.style.color = 'var(--moss)';
    btn.style.borderColor = 'var(--moss)';
  }else{
    btn.textContent = '复制失败';
    btn.style.color = 'var(--vermilion)';
    btn.style.borderColor = 'var(--vermilion)';
  }
  setTimeout(() => { btn.textContent = original; btn.style.color = ''; btn.style.borderColor = ''; }, 2000);
});

// ========== 主交互逻辑 ==========
let currentResult = null;
let currentTab = 'tasks';

// ========== 阶段2：字数统计 ==========
const CHAR_SOFT_LIMIT = 2000;
const CHAR_HARD_LIMIT = 3000;
function updateCharCount(){
  const area = document.getElementById('inputArea');
  const counter = document.getElementById('charCount');
  const len = area.value.length;
  counter.classList.remove('warn','danger');
  if(len > CHAR_HARD_LIMIT){
    counter.classList.add('danger');
    counter.textContent = `${len} / ${CHAR_SOFT_LIMIT}（已超上限）`;
  }else if(len >= 1500){
    counter.classList.add('warn');
    counter.textContent = `${len} / ${CHAR_SOFT_LIMIT}`;
  }else{
    counter.textContent = `${len} / ${CHAR_SOFT_LIMIT}`;
  }
}

// ========== 阶段2：场景切换 ==========
function switchScene(scene){
  if(!SCENES[scene]) return;
  currentScene = scene;
  const cfg = SCENES[scene];
  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scene === scene);
  });
  document.getElementById('inputLabel').textContent = cfg.label;
  const area = document.getElementById('inputArea');
  area.placeholder = cfg.placeholder;
  // 切换场景时清空输入与输出，避免误用旧内容
  area.value = '';
  currentResult = null;
  updateCharCount();
  showState('empty');
}

document.querySelectorAll('.scene-btn').forEach(btn => {
  btn.addEventListener('click', () => switchScene(btn.dataset.scene));
});

// 输入实时字数统计
document.getElementById('inputArea').addEventListener('input', updateCharCount);

document.getElementById('sampleBtn').addEventListener('click', () => {
  const area = document.getElementById('inputArea');
  area.value = SCENES[currentScene].sample;
  area.placeholder = SCENES[currentScene].placeholder;
  updateCharCount();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  const area = document.getElementById('inputArea');
  area.value = '';
  area.placeholder = SCENES[currentScene].placeholder;
  updateCharCount();
  currentResult = null;
  showState('empty');
});

// ========== 阶段6：状态切换（空 / 加载 / 成功 / 错误 / Key 未配置） ==========
// 阶段6 已接真实 /api/generate，移除临时调试入口
let lastInput = null; // 保存上次输入 { scene, text }，供重试使用

function showState(state, opts){
  opts = opts || {};
  const container = document.getElementById('outputContent');
  const cfg = SCENES[currentScene] || SCENES.meeting;
  let html = '';
  switch(state){
    case 'empty':
      html = `
        <div class="output-empty">
          <div class="output-empty-icon">§</div>
          <p>${cfg.emptyHint}</p>
        </div>`;
      break;
    case 'loading':
      html = `
        <div class="state-card loading">
          <div class="state-card-icon">…</div>
          <div class="state-card-title">正在整理行动方案</div>
          <div class="state-card-desc">正在解析内容、识别任务、负责人与截止时间，请稍候</div>
        </div>`;
      break;
    case 'success':
      // 成功状态由 renderOutput 渲染具体内容，这里不直接处理
      return;
    case 'error':
      // 阶段6：错误卡片含重试按钮，复用上次输入内容和场景
      html = `
        <div class="state-card error">
          <div class="state-card-icon">!</div>
          <div class="state-card-title">${escapeHtml(opts.title || '生成失败')}</div>
          <div class="state-card-desc">${escapeHtml(opts.desc || '请检查输入内容后重试，或稍后再试')}</div>
          ${lastInput ? '<button class="state-card-retry" id="retryBtn">重试</button>' : ''}
        </div>`;
      break;
    case 'keyNotConfigured':
      html = `
        <div class="state-card warning">
          <div class="state-card-icon">!</div>
          <div class="state-card-title">服务尚未就绪</div>
          <div class="state-card-desc">演示环境的服务尚未配置完成，请联系部署者处理后再试。</div>
        </div>`;
      break;
    default:
      return;
  }
  container.innerHTML = html;
  // 绑定重试按钮
  const retryBtn = document.getElementById('retryBtn');
  if(retryBtn){
    retryBtn.addEventListener('click', () => {
      if(lastInput) generate(lastInput.scene, lastInput.text);
    });
  }
}

// ========== 阶段6：主生成流程（调真实 /api/generate） ==========
async function generate(scene, text){
  const btn = document.getElementById('generateBtn');
  btn.classList.add('loading');
  btn.disabled = true;
  showState('loading');

  try{
    // 1. 先检查 AI 配置状态
    const health = await callHealth();
    if(health.ok && !health.aiConfigured){
      showState('keyNotConfigured');
      return;
    }
    // health 请求本身失败时，仍继续尝试 generate（让 generate 返回更具体的错误）

    // 2. 调用后端生成
    const res = await callGenerate(scene, text);

    if(res.ok && res.data){
      // 成功：渲染 4 个 Tab
      currentResult = res.data;
      currentTab = 'tasks';
      document.querySelectorAll('.output-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'tasks'));
      renderOutput(currentTab);
    }else{
      // 失败：按 error.code 映射用户友好文案
      const code = (res.error && res.error.code) || 'AI_REQUEST_FAILED';
      if(code === 'AI_NOT_CONFIGURED'){
        showState('keyNotConfigured');
      }else{
        const msg = ERROR_MESSAGES[code] || ERROR_MESSAGES.AI_REQUEST_FAILED;
        showState('error', { title: msg.title, desc: msg.desc });
      }
    }
  }catch(e){
    showState('error', { title: '生成失败', desc: '发生意外错误，请稍后重试' });
  }finally{
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

document.getElementById('generateBtn').addEventListener('click', () => {
  const text = document.getElementById('inputArea').value.trim();
  if(!text){
    const inputArea = document.getElementById('inputArea');
    inputArea.style.borderColor = 'var(--vermilion)';
    inputArea.placeholder = '请先粘贴内容，或点击"示例"...';
    setTimeout(() => { inputArea.style.borderColor = ''; }, 2000);
    return;
  }

  // 超长输入硬限制：禁止生成
  if(text.length > CHAR_HARD_LIMIT){
    showState('error', {
      title: '内容过长，无法生成',
      desc: `当前 ${text.length} 字，超过 ${CHAR_HARD_LIMIT} 字上限。请精简内容后重试。`
    });
    return;
  }

  // 保存上次输入供重试使用
  lastInput = { scene: currentScene, text };
  generate(currentScene, text);
});

// Tab 切换
document.querySelectorAll('.output-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.output-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    if(currentResult){
      renderOutput(currentTab);
    }
  });
});

function renderOutput(tab){
  const container = document.getElementById('outputContent');
  if(!currentResult){
    showState('empty');
    return;
  }

  // 成功状态：前置成功标签（去 AI 字眼）
  const successTag = '<div class="output-success-tag">已生成</div>';
  let body = '';
  switch(tab){
    case 'tasks':
      body = renderTasks(currentResult.tasks);
      break;
    case 'risks':
      body = renderRisks(currentResult.risks);
      break;
    case 'message':
      body = renderMessage(currentResult.message);
      break;
    case 'report':
      body = renderReport(currentResult.report);
      break;
  }
  container.innerHTML = successTag + body;
}

// ========== 导航栏滚动效果 ==========
window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  if(window.scrollY > 10){
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});


// ========== 平滑滚动 ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e){
    const target = document.querySelector(this.getAttribute('href'));
    if(target){
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
