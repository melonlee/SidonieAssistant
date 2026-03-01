[English](./README.md) | [中文](./README_zh.md)

# Sidonie

**An intelligent companion that unifies chat, notes, study, and academic workflows — a Manus product born from real daily life.**

Sidonie is named after my wife and inspired by our little one, Dua. Their everyday friction with AI — the small frustrations and unmet needs — is what led to this product. I believe technology should start with the people closest to us: if it works for them, it can work for everyone. So Sidonie is a local-first, React-based interface that brings structured planning, file analysis, learning modules, and notes into one place — no backend required, just you and your API keys.

### Screenshots

<p align="center">
  <img src="docs/screenshots/homepage.png" width="32%" alt="Homepage" />
  <img src="docs/screenshots/paper-radar.png" width="32%" alt="Paper Radar" />
  <img src="docs/screenshots/help-child.png" width="32%" alt="Help Child" />
</p>

| Homepage | Paper Radar | Help Child |
| :---: | :---: | :---: |
| Chat entry, model selection | Discover & analyze arXiv, daily briefing | AI teaching assistant, curriculum |

## 1. Project Overview

**Sidonie** is an open-source front-end application that brings together:

- **Unified chat** with multi-session support, file uploads (PDF, Word, CSV, images), and streaming responses.
- **Structured reasoning** via `<plan>` and `<thought>` in model output for complex or multi-step tasks.
- **Notes** with tags and themes, persisted locally.
- **Study** module: curriculum (stages/topics), concept/quiz/visual cards, XP and badges, school notes, and review scheduling.
- **Academic** module for browsing and managing paper-like entries.

The stack is **React 19 + TypeScript + Vite**, with **Tailwind CSS** for UI. The AI layer talks to **Google Gemini** by default and can be extended with **DeepSeek, Kimi, Qwen** via API keys. No backend required for basic use — run locally and point to your API keys.

## 2. Architecture & Technical Solution

- **Front-end:** Single-page app (React 19, TypeScript, Vite). Views: Chat, Notes, Study, Academic.
- **AI integration:** `services/geminiService` — streaming chat, image generation, token estimation, optional Google Search grounding. Third-party models use the same service interface with configurable base URLs and keys.
- **State & persistence:** React state for sessions, messages, notes, and study data; `localStorage` for notes and preferences.
- **Content:** Markdown (react-markdown, remark-gfm), Mermaid diagrams, syntax highlighting. File parsing: PDF/Word/CSV and images via Gemini multimodal API.
- **Model configuration:** Centralized in `constants.ts` (model list, system instructions, study/academic prompts). User profile and custom instructions are merged into the system prompt.

## 3. Core Features

**Chat & reasoning**

- Multi-session chat with streaming; plan/thought extraction and display.
- Attachments: PDF, Word, CSV, images; analysis and inline display.
- Optional Google Search grounding for answers.
- Artifact generation: single self-contained HTML (e.g. games, tools) with Tailwind.

**Notes**

- Create, edit, delete notes; tags and theme colors.
- Local persistence; optional AI-assisted analysis from chat.

**Study**

- Custom curricula: stages and topics (bilingual).
- Learning cards: concept, quiz (JSON), interactive HTML visual.
- XP, levels, badges; school notes with optional AI interpretation and practice.
- Review scheduling (e.g. SM-2 style) for topics.

**Academic**

- Paper-style list: title, summary, authors, links; structure ready for real API integration.

**Multi-model & i18n**

- Models: Gemini 3 Flash/Pro, Flash Lite; DeepSeek V3/R1, Kimi, Qwen Plus/Max (with API keys).
- English and Chinese UI and content.

## 4. Quick Start

### Prerequisites

- **Node.js** (LTS recommended)

### Step 1: Clone and install

```bash
git clone https://github.com/melonlee/Sidonie.git
cd Sidonie
npm install
```

### Step 2: Configure API key

Set your Gemini API key so the app can call the API. The build injects `GEMINI_API_KEY` into the app.

- **Option A:** Create `.env` or `.env.local` in project root:

  ```
  GEMINI_API_KEY=your_gemini_api_key
  ```

- **Option B:** Export before run:

  ```bash
  export GEMINI_API_KEY="your_gemini_api_key"
  ```

Optional: set DeepSeek/Kimi/Qwen keys in Settings if you use third-party models.

### Step 3: Run

```bash
npm run dev
```

Open the dev URL (e.g. `http://localhost:5173`).

### Build for production

```bash
npm run build
npm run preview   # optional: preview production build
```

## 5. Contributing

Contributions are welcome:

1. Open an [Issue](https://github.com/melonlee/Sidonie/issues) for bugs or feature suggestions.
2. Fork the repo, create a branch, and open a Pull Request.

## 6. License

See [LICENSE](./LICENSE) in this repository.
