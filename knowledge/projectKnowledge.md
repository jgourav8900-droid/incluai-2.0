# INCLUAI Project Knowledge

## Modules Overview
- **Auth Service** (`services/authService.js`): Handles JWT authentication, password hashing, role/permission checks.
- **AI Service** (`services/aiService.js`): Orchestrates Gemini/RAG, maintains conversation context, generates responses.
- **RAG Service** (`services/ragService.js`): Embedding generation, vector store lookup, fallback token similarity.
- **Embedding Service** (`services/embeddingService.js`): Generates Gemini embeddings for document chunks.
- **Vector Store** (`services/vectorStore.js`): Simple in‑memory store persisted to `data/vectorStore.json`.
- **Database Service** (`services/dbService.js`): JSON file DB with collections: users, documents, tasks, reports, notifications, conversations, etc.
- **Conversation Service** (`services/conversationService.js`): Persists per‑user chat history.

## API Endpoints (v2)
| Path | Method | Purpose |
|------|--------|---------|
| `/api/v2/auth/signup` | POST | Register new user and company.
| `/api/v2/auth/login` | POST | Authenticate and receive JWT.
| `/api/v2/copilot/chat` | POST | Conversational AI with context & RAG.
| `/api/v2/copilot/demo` | POST | Public demo endpoint.
| `/api/v2/knowledge/documents` | GET | List indexed policy/company docs.
| `/api/v2/knowledge/search` | POST | Semantic search over docs.
| `/api/v2/knowledge/upload` | POST (admin) | Upload PDF/DOCX/TXT, parse & index.
| `/api/v2/tasks` | CRUD | Manage workplace tasks.
| `/api/v2/reports` | CRUD | Manage accessibility/barrier reports.
| `/api/v2/settings` | PUT | User preferences.

## Data Model Highlights
- **User**: `{id, companyId, employeeId, name, email, passwordHash, role, department, avatar, createdAt}`
- **Document**: `{id, companyId, title, category, section, content, tags, updatedAt, sourceFile?, uploadedBy?, uploadDate?}`
- **Task**: `{id, companyId, userId, creatorName, title, description, priority, deadline, status, assignedTo, createdAt}`
- **Conversation**: `{id, userId, companyId, messages: [{role, content, timestamp}]}`

## How the AI Works
1. Retrieve recent conversation turns (max 6).
2. Perform semantic RAG search via embeddings.
3. Build a system prompt that includes up to 4 most relevant docs.
4. Call Gemini (model `gemini-3.8-flash`).
5. Fallback to fast‑mode answer using top doc snippet when Gemini unavailable.
6. Append citation block with document title, section, and excerpt.

