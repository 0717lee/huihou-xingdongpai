# 会后行动派

让会议结论变成可执行的任务。粘贴会议纪要、群聊记录或任务布置，AI 自动整理出任务清单、负责人、截止时间、优先级、风险提醒和汇报草稿。

## 线上体验

https://huihou-xingdongpai.onrender.com

## 功能特性

- **三种场景**：会议纪要 / 群聊记录 / 任务布置
- **四个输出**：
  - 任务清单（含负责人、截止时间、优先级、依赖关系）
  - 风险提醒（自动识别逾期、未指派、依赖阻塞）
  - 跟进消息（按人 @ 分组，可直接复制发群）
  - 汇报草稿（结构化总结，可直接复制上报）
- **安全设计**：
  - 前端输入校验（3000 字上限）
  - HTML 转义防 XSS
  - .env 不入库
  - AI 失败显性报错，不静默 fallback

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript（无框架）
- **后端**：Node.js + Express
- **AI 接入**：OpenAI 兼容协议（阿里云 DashScope）
- **部署**：Render

## 本地开发

### 环境要求

- Node.js >= 18

### 安装与运行

```bash
npm install
npm start
```

服务启动后访问 http://localhost:3000

### 环境变量

复制 `.env.example` 为 `.env`，填入 AI 服务密钥：

```bash
cp .env.example .env
```

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `OPENAI_API_KEY` 或 `DASHSCOPE_API_KEY` | 是（二选一） | AI 服务密钥，OPENAI_API_KEY 优先 |
| `OPENAI_BASE_URL` | 否 | 默认 `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `OPENAI_MODEL` | 否 | 默认 `qwen-plus` |
| `PORT` | 否 | 默认 3000，部署平台自动注入 |

## 部署

### Render 部署

1. Fork 本仓库到你的 GitHub
2. 在 Render 创建 Web Service，连接 GitHub 仓库
3. 配置：
   - Build Command：`npm install`
   - Start Command：`npm start`
4. 在 Render Dashboard → Environment 中添加环境变量（见上表）

## 项目结构

```
.
├── server/
│   └── index.js          # 后端服务（Express + AI 代理）
├── web/
│   ├── index.html        # 前端页面
│   ├── styles.css        # 东方编辑主义设计系统
│   └── app.js            # 前端交互逻辑
├── .env.example          # 环境变量模板
├── .gitignore
├── package.json
└── README.md
```

## 设计理念

前端采用**东方编辑主义**设计系统：墨黑 + 暖纸白 + 朱砂红，细线分割，编号系统，零 emoji、零渐变、零毛玻璃，追求克制、专业、可读的视觉风格。

## License

MIT
