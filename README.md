# CodeMentor AI 🧠

A production-ready, SaaS-grade Socratic coding tutor designed to help developers and computer science students learn programming concepts effectively through interactive feedback, static analysis, and an execution sandbox.

## 🚀 Overview
CodeMentor AI acts as an intelligent pair programmer and tutor. Instead of simply providing correct code to fix errors, it uses a Socratic teaching method—analyzing code and guiding users toward the solution using conceptual explanations, real-world analogies, and leading questions.

## 🏗 Architecture & Tech Stack

### Frontend (`/client`)
- **Framework**: React 19 + TypeScript + Vite
- **Styling & UI**: CSS Modules, Glassmorphism UI, Framer Motion (animations), Lucide React
- **Code Editor**: `@monaco-editor/react` for a rich, VS Code-like coding experience
- **State & Data**: Axios with HttpOnly Cookie & LocalStorage Interceptors
- **Data Visualization**: Recharts for learning analytics

### Backend (`/server`)
- **Framework**: Node.js + Express + TypeScript
- **Database**: MongoDB (via Mongoose)
- **Zero-Config Dev**: `mongodb-memory-server` for instant local development without cloud DB setup
- **Caching**: Local memory store / Redis fallback for storing conversational contexts
- **AI Integration**: Google Generative AI (`gemini-2.5-flash`) with advanced Server-Sent Events (SSE) streaming for real-time hint generation
- **Security & Auth**: Dual-source JWT validation, bcryptjs hashing, Helmet, and `express-rate-limit`

## ✨ Key Features (SaaS Ready)

- **Socratic Code Analysis**: The AI is strictly prompted to never give direct code fixes initially. It streams back a `conceptualGap`, an `analogy`, and a `leadingQuestion`.
- **Progressive Hint System (SSE Streaming)**: 
  - **Level 1 (Concept)**: Explains the programming principle.
  - **Level 2 (Pseudocode)**: Outlines the logical steps to fix the issue.
  - **Level 3 (Solution)**: Provides the actual code fix and explanation.
  - *Contextual Memory*: The AI remembers the context of previous hints to provide continuous, non-repetitive guidance.
- **AST Static Analysis & Visualization**: Pre-processes user code using Acorn to catch "Off-by-One", "Syntax", and "Scope" errors instantly. Generates Mermaid flowcharts to visualize code logic flow.
- **Execution Sandbox**: Integrated code execution environment allowing users to run their code and pipe `stdout`/`stderr` directly into the AI's context window.
- **Multi-Language Support**: Supports JavaScript, Python, C++, and Java.
- **SaaS-Grade Security**:
  - Split rate-limiting for Auth, Analysis, and Global endpoints.
  - Automatic `AbortController` cancellation to prevent memory leaks on dropped SSE connections.
  - Dual token persistence (Cookie + localStorage) preventing login loops.

## 📂 Directory Structure

```text
CodeMentorAI/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # HintSystem, MentorConsole, ExecutionSandbox, ErrorBoundary
│   │   ├── pages/          # Workspace, Analytics, Landing, Login, Register
│   │   ├── api.ts          # Axios Interceptors and SSE Fetch Handlers
│   │   └── AuthContext.tsx # Dual-source JWT Authentication state
├── server/                 # Backend Express application
│   ├── src/
│   │   ├── middleware/     # Auth, Rate Limiting, Usage Quota, Sanitization
│   │   ├── models/         # User, Submission (Mongoose Schemas)
│   │   ├── routes/         # auth.ts, code.ts, hints.ts, analytics.ts, execute.ts
│   │   ├── services/       # aiService.ts (Gemini), astService.ts, cacheService.ts
│   │   ├── devBootstrap.ts # Auto-starts Memory MongoDB for zero-config dev
│   │   └── app.ts          # Express Setup
└── package.json            # Root workspace config (concurrently runs both ends)
```

## 🛠 Setup & Running Locally

1. **Install Dependencies**
   Run the root installation script which installs dependencies for the root, client, and server:
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the `server/` directory:
   ```env
   # Backend Port
   PORT=3001
   
   # Leave blank to auto-bootstrap an in-memory local MongoDB
   # MONGODB_URI=mongodb://127.0.0.1:27017/codementor
   
   # AI Integration
   GOOGLE_AI_API_KEY=your_gemini_api_key_here
   
   # Security
   JWT_SECRET=codementor_jwt_super_secret_32chars_ok
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
   ```

3. **Start Development Servers**
   To concurrently start the Vite frontend server and the Express backend server (with auto-database bootstrapping):
   ```bash
   npm run dev
   ```

## 🔐 Rate Limit Architecture
- **Global API Rate Limit**: 100 requests / 15 minutes.
- **Auth Endpoints**: 5 requests / 15 minutes (Brute-force protection).
- **Code Analysis**: 10 analyses / hour (Usage Quota Mitigation).
- **Gemini Cooldown**: Built-in delay mechanism to prevent 429 errors from Google AI Studio.
