# AAMU-GDG-AI-Chatbot Backend

An Express server that answers student questions using:
- **RAG** over your Supabase vector store
- **Targeted web browsing** for school‑related pages
- **Chat memory** (short‑term conversation context)

## Features
- **/api/chat** — answers a question using:  
  1) class context (RAG) if needed,  
  2) school‑related web browsing when relevant,  
  3) otherwise the base LLM with chat history.
- **/api/clear-memory** — clears in‑memory chat history.
- **/api/health** — health check.

> Under the hood: `classInfoChain` decides if the question needs course/class context; `retriever` + `combinedDocuments` supply RAG context; `isSchoolRelated` + `browseSchoolWebsites` fetch trusted pages; `finalAnswerChain` writes the final answer; `memory.js` stores short‑term history.

---

## Requirements
- Node 18+
- Package manager (npm / pnpm / yarn)
- **OpenAI API key**
- **Supabase** vector DB set up (see *Supabase Setup* below)

---

## Environment Variables

Create a `.env` file in the backend project root:

```bash
# Required
OPENAI_API_KEY=sk-********************************

# Supabase (RAG) – request/obtain these before running
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=***************************8***
# OR if your retriever needs it:
# Server
PORT=5000
```

> **Note:** You’ll need the **Supabase keys** and **URL**  If you don’t have them yet, please request:
> - `SUPABASE_URL`
> - `SUPABASE_ANON_KEY` 

---

## Install & Run

```bash
# install deps
npm install

# dev
npm run dev

# or start (after build)
npm run build
npm start
```
## API Reference

### 1) POST `/api/chat`

**Request body**
```json
{
  "question": "When does registration open for Fall?"
}
```

**Response (200)**
```json
{
  "question": "When does registration open for Fall?",
  "answer": "Registration typically opens several months before the semester starts...",
  "timestamp": "2025-08-13T03:20:22.123Z",
  "success": true
}
```

**Errors (500)**
```json
{
  "error": "Internal server error",
  "message": "Failed to process your question. Please try again.",
  "success": false
}
```

**Notes**
- The backend automatically decides whether to use RAG, school‑site browsing, and/or chat memory.
- You can pass any natural‑language question; the chains handle routing.

---

### 2) POST `/api/clear-memory`

Clears short‑term conversation memory (kept in `memory.js`).

**Response**
```json
{
  "message": "Conversation memory cleared successfully",
  "success": true
}
```

---

### 3) GET `/api/health`

**Response**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-13T03:20:22.123Z"
}
```


## Frontend Integration (env switch)

From the frontend, set:
```env
VITE_API_PROVIDER=backend
VITE_BACKEND_BASE_URL=http://localhost:5000/api
```
