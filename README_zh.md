[English](./README.md) | [中文](./README_zh.md)

# Sidonie

**统一对话、笔记、学习与学术的智能伴侣 —— 来自 Manus 的思路产品，源于真实日常。**

Sidonie 以我太太的名字命名，灵感则来自我们家的 Dua。她们日常使用 AI 时的种种不便与未被满足的需求，催生了这款产品。我相信：科技应当从身边人开始 —— 先让最亲近的人用得上、用得好，再谈更大的可能。因此 Sidonie 选择本地优先、单页前端：把结构化规划、文件分析、学习与笔记收进一个界面，无需自建后端，配置好 API Key 即可使用。

### 产品截图

<p align="center">
  <strong>首页</strong> — 对话入口、模型选择
</p>
<p align="center">
  <img src="docs/screenshots/homepage.png" width="80%" alt="首页" />
</p>

<p align="center">
  <strong>Paper Radar</strong> — 发现与分析 arXiv、每日简报
</p>
<p align="center">
  <img src="docs/screenshots/paper-radar.png" width="80%" alt="Paper Radar" />
</p>

<p align="center">
  <strong>Help Child</strong> — AI 助学、课程与进度
</p>
<p align="center">
  <img src="docs/screenshots/help-child.png" width="80%" alt="Help Child" />
</p>

## 1. 项目简介

**Sidonie** 是一款开源前端应用，整合了以下能力：

- **统一对话**：多会话、文件上传（PDF、Word、CSV、图片）与流式回复。
- **结构化推理**：通过模型输出中的 `<plan>`、`<thought>` 处理复杂或多步骤任务。
- **笔记**：支持标签与主题，本地持久化。
- **学习模块**：课程结构（阶段/主题）、概念/测验/可视化卡片、经验与徽章、课堂笔记与复习计划。
- **学术模块**：以论文形式管理条目（标题、摘要、作者、链接），结构可对接真实 API。

技术栈为 **React 19 + TypeScript + Vite**，UI 使用 **Tailwind CSS**。AI 层默认对接 **Google Gemini**，可通过配置 API Key 扩展 **DeepSeek、Kimi、Qwen**。基础使用无需自建后端，本地运行并配置 API Key 即可。

## 2. 架构与技术方案

- **前端**：单页应用（React 19、TypeScript、Vite）。视图：对话、笔记、学习、学术。
- **AI 集成**：`services/geminiService` 负责流式对话、图像生成、Token 估算及可选 Google 搜索增强；第三方模型复用同一接口，通过可配置 base URL 与 Key 接入。
- **状态与持久化**：会话、消息、笔记、学习数据由 React 状态管理；笔记与偏好写入 `localStorage`。
- **内容呈现**：Markdown（react-markdown、remark-gfm）、Mermaid 图表、代码高亮；PDF/Word/CSV 与图片通过 Gemini 多模态 API 解析。
- **模型配置**：集中在 `constants.ts`（模型列表、系统指令、学习/学术提示等）；用户画像与自定义指令会合并进系统提示。

## 3. 核心能力与功能

**对话与推理**

- 多会话流式对话；解析并展示计划与思考内容。
- 附件：PDF、Word、CSV、图片；支持分析与内联展示。
- 可选 Google 搜索增强回答。
- 产物生成：单文件自包含 HTML（如小游戏、小工具），可含 Tailwind。

**笔记**

- 创建、编辑、删除笔记；标签与主题色。
- 本地持久化；可与对话联动做 AI 分析。

**学习**

- 自定义课程：阶段与主题（中英双语）。
- 学习卡片：概念卡、测验卡（JSON）、交互式 HTML 可视化。
- 经验值、等级、徽章；课堂笔记可配合 AI 解读与练习生成。
- 主题复习计划（如类 SM-2 间隔复习）。

**学术**

- 论文式列表：标题、摘要、作者、链接；结构便于后续对接真实 API。

**多模型与国际化**

- 模型：Gemini 3 Flash/Pro、Flash Lite；DeepSeek V3/R1、Kimi、Qwen Plus/Max（需配置对应 API Key）。
- 界面与内容支持中英文。

## 4. 快速开始

### 环境要求

- **Node.js**（建议 LTS）

### 步骤 1：克隆并安装

```bash
git clone https://github.com/melonlee/Sidonie.git
cd Sidonie
npm install
```

### 步骤 2：配置 API Key

配置 Gemini API Key 以便应用调用接口；构建时会注入 `GEMINI_API_KEY`。

- **方式一**：在项目根目录创建 `.env` 或 `.env.local`：

  ```
  GEMINI_API_KEY=你的_gemini_api_key
  ```

- **方式二**：运行前在终端导出：

  ```bash
  export GEMINI_API_KEY="你的_gemini_api_key"
  ```

使用第三方模型时，可在设置中配置 DeepSeek/Kimi/Qwen 的 Key。

### 步骤 3：运行

```bash
npm run dev
```

在浏览器中打开开发地址（如 `http://localhost:5173`）。

### 生产构建

```bash
npm run build
npm run preview   # 可选：本地预览生产构建
```

## 5. 参与贡献

欢迎参与贡献：

1. 在 [Issues](https://github.com/melonlee/Sidonie/issues) 中提交问题或功能建议。
2. Fork 本仓库，创建分支并提交 Pull Request。

## 6. 许可证

详见本仓库 [LICENSE](./LICENSE)。
