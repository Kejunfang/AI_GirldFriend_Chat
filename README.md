# AI Companion Chat

一个可本地开发、可继续扩展、可直接部署的 AI 陪伴聊天项目。  
前端基于 `Next.js App Router + TypeScript + Tailwind CSS`，后端使用 `Next.js Route Handlers`，数据层使用 `PostgreSQL + Prisma`，AI 调用使用 `Google GenAI SDK + Gemini API`。

当前版本已经移除了固定的“小丽 / 阿毅”人设。  
角色名字、她怎么称呼你、性格、语气、边界要求，都可以在页面里的 `角色设定` 面板里自己配置。

## 功能概览

- 多会话聊天窗口
- 短期记忆 + 长期记忆
- 浏览器语音输入
- AI 回复语音播报
- 可扩展的渠道层，已为微信预留抽象
- 单用户本地开发模式，适合先做 MVP

## 技术栈

- Next.js 15
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Gemini API
- Vitest

## 目录结构

```text
app/                  页面与 API 路由
components/           聊天界面与设置面板
lib/ai/               模型调用、Prompt、回复生成
lib/chat/             聊天主服务
lib/memory/           记忆提炼与读取
lib/channels/         渠道抽象（含微信占位）
lib/db/               Prisma 客户端
lib/audio/            浏览器语音输入与播报
prisma/               Schema、迁移、Seed
tests/                单元测试与接口测试
types/                共享类型与请求校验
```

## 环境要求

- Node.js 20+
- npm
- PostgreSQL 16+

如果你不想自己安装 PostgreSQL，可以直接用仓库里的 `docker-compose.yml`。

## 安装依赖

```bash
npm install
```

## 环境变量配置

这个项目在本地会用到两个环境文件：

1. `.env.local`
Next.js 运行时读取它，页面和 API route 用它。

2. `.env`
Prisma CLI 默认读取它，迁移和 seed 用它。

推荐做法：

```bash
cp .env.example .env.local
cp .env.example .env
```

然后按下面修改。

### `.env.local`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_companion_chat?schema=public"
GEMINI_API_KEY="替换成你自己的 Gemini API Key"
GEMINI_MODEL="gemini-2.5-flash"
DEV_USER_EXTERNAL_ID="local-dev-user"
APP_NAME="AI Companion Chat"
CHAT_MAX_INPUT_CHARS="600"
CHAT_MAX_REPLY_CHARS="220"
CHAT_RECENT_MESSAGE_LIMIT="12"
CHAT_MEMORY_LIMIT="8"
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="12"
```

### `.env`

如果你只是本地开发，Prisma 最少只需要这个：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_companion_chat?schema=public"
```

## PostgreSQL 配置方法

### 方式一：用 Docker，最省事

启动数据库：

```bash
docker compose up -d
```

这会启动一个本地 PostgreSQL 16，默认信息已经写在 `docker-compose.yml` 里：

- database: `ai_companion_chat`
- user: `postgres`
- password: `postgres`
- port: `5432`

### 方式二：用你自己本机的 PostgreSQL

如果你已经有 PostgreSQL，可以自己建库：

```bash
createdb ai_companion_chat
```

然后把 `.env.local` 和 `.env` 里的 `DATABASE_URL` 改成你的真实连接串，例如：

```env
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/ai_companion_chat?schema=public"
```

## 初始化 Prisma

第一次运行前执行：

```bash
npm run db:migrate
npm run db:seed
```

作用：

- `db:migrate`：创建表结构
- `db:seed`：创建一个本地开发用的默认用户和空会话

## 启动开发环境

```bash
npm run dev
```

打开浏览器：

```text
http://localhost:3000
```

## 怎么配置 AI 角色

页面顶部有一个 `角色设定` 按钮。打开后可以配置：

- `AI 名字`
这个角色叫什么。

- `她怎么称呼你`
例如你的名字、昵称、固定称呼。

- `关系定位`
例如“像一个温柔、稳定、会陪你聊天的女生朋友”。

- `性格气质`
例如“温柔、细心、自然、有分寸，不夸张”。

- `说话语气`
例如“像微信聊天，短句、自然、先共情，不像客服”。

- `边界要求`
例如“不要肉麻、不要强控制、不要做正式诊断”。

这些设置会保存在当前浏览器的 `localStorage`，不会写死到仓库里，也不会提交到 GitHub。

## 怎么测试聊天是否正常

1. 打开页面
2. 先点 `角色设定`，填一个你想要的角色
3. 输入一句话并发送
4. 检查是否返回 AI 回复

也可以直接检查健康接口：

```bash
curl http://localhost:3000/api/health
```

## 语音功能说明

- `语音输入`
点击输入框右侧的 `语音` 按钮，浏览器会请求麦克风权限，并把语音转成文本。

- `语音播报`
每条 AI 消息下都有 `播放语音`；顶部还可以开启自动播报。

- `兼容性`
语音输入依赖浏览器原生 Speech Recognition，通常 Chromium 浏览器支持更好。如果浏览器不支持，页面会自动退回纯文字模式。

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run db:migrate
npm run db:seed
npm run db:studio
```

## 如何清空本地聊天数据

如果你想清空数据库里的聊天记录，可以连接 PostgreSQL 后执行：

```sql
TRUNCATE TABLE memories, messages, conversations, users CASCADE;
```

然后重新执行：

```bash
npm run db:seed
```

## 上传到 GitHub 前要注意什么

- 不要提交 `.env.local`
- 不要提交 `.env`
- 不要提交 `.next`
- 不要提交 `node_modules`
- 不要提交任何真实 API key

仓库里已经保留了 `.env.example`，别人只需要复制它并填自己的配置即可。

## 后续扩展建议

- 把角色设定从浏览器本地存储升级到数据库持久化
- 增加多用户登录
- 接入微信公众号 / 企业微信
- 把语音从浏览器原生 API 升级为服务端音频链路
- 增加更精细的记忆提炼与召回策略
