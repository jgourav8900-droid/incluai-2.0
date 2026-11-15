# INCLUAI 2.0 — Complete Project Architecture & Capabilities Explanation
**Frontend + Backend + Database + AI Copilot + Observability + Email + Messaging + Security**

---

## 1. Executive Summary: What is INCLUAI 2.0?

**INCLUAI 2.0** is an intelligent workplace operating system and AI-assisted platform. It unifies daily employee operations, automated HR support, enterprise communications, accessibility reporting, and high-fidelity infrastructure observability into a coherent, role-governed environment.

In an organization with hundreds or thousands of employees, operations often suffer from fragmented tooling:
- HR leave policies and handbooks are buried across shared drives.
- Team communication is split across fragmented chat apps and email silos.
- Accessibility barriers and workplace concerns often go unreported due to friction or anonymity concerns.
- Infrastructure and system health across enterprise services lack unified real-time visibility.

**INCLUAI 2.0** solves this with a multi-tenant, modular architecture centered around an authorized AI Copilot with tool calling and a dedicated **Capabilities & Observability Layer ("Clarity across every layer")**.

---

## 2. Full Architecture Blueprint

| Layer | Technology Stack | Primary Function |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JS / React (Geist & JetBrains Mono) | Responsive employee workspace, AI chat, dashboards, and live telemetry cards |
| **Capabilities Layer** | Technical Dark UI, Web Animations API, SVG/Canvas Holographic Wireframes | "Clarity across every layer" infrastructure monitoring, signals, insights, and automated reports |
| **Backend API** | Node.js & Express.js | Request orchestration, business rules, RBAC enforcement, session management |
| **Database** | MongoDB & Vector Store | Persistent collections for users, organizations, messages, reports, documents, and audit logs |
| **AI Copilot** | LLM API + Retrieval-Augmented Generation (RAG) | Grounded policy Q&A, context-aware drafting, task creation, and feedback summarization |
| **Communication** | Gmail API, Microsoft Graph, WebSockets | Authorized email synchronization and real-time intra-company messaging |
| **Security & RBAC** | Cryptographic token sessions, hashing, tenant isolation | Guaranteed cross-tenant isolation, principle of least privilege, prompt injection defense |

---

## 3. The Capabilities & Observability Layer: "Clarity Across Every Layer"

Implemented as a single-file, zero-dependency, high-precision technical interface (`index.html`), this layer provides operators and leadership with unambiguous insight across three core vectors:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 01 ────                // CAPABILITIES               ● FULL VISIBILITY │
│                                                                        │
│               CLARITY ACROSS EVERY LAYER                              │
│   A unified view of your infrastructure. Detect patterns, anticipate   │
│   issues, and optimize performance before problems arise.              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ REAL-TIME        │       │ ACTIONABLE       │       │ AUTOMATED        │
│ SIGNALS          │       │ INSIGHTS         │       │ REPORTING        │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ Holographic      │       │ Holographic      │       │ Holographic      │
│ Radar Rings &    │       │ 3D Cylinders &   │       │ Layered Document │
│ Core Orb         │       │ Wireframe Sphere │       │ Sheets Wireframe │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ Live system data │       │ Instant analysis │       │ Health reports   │
│ & continuous     │       │ for intelligent  │       │ generated at a   │
│ tracking.        │       │ decisions.       │       │ glance.          │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Key Technical Characteristics:
1. **Artboard Containment System (`826 × 552`)**: Every length is calculated via `N * var(--u)`, where `--u = max(1px, min(100vw / 826, 100vh / 552))`. Excess display area is redistributed into flexible gaps rather than letterbox bands.
2. **True Holographic Wireframes (Zero Black Squares)**: Icons are rendered over `#000000` with `mix-blend-mode: screen` and softened by a radial gradient mask (`mask-image: radial-gradient(...)`). The pure black background is mathematically converted to complete transparency, letting the amber glow bloom organically.
3. **Web Animations API Timeline**: Orchestrates entrance sequencing with `fill: 'backwards'` (strip items rise, rule draws, headline rises in fixed mask, lede settles, cards rise staggered, and icons perform pop/wipe sequences).
4. **Hardware & Accessibility Adaptation**: Full graceful degradation for `prefers-reduced-motion` and responsive tablet/mobile viewports.

---

## 4. Deep-Dive: Core System Components

### 4.1 Frontend Workspace
- **Multi-Tenant Login**: Collects Organization ID, Employee ID, and secure credentials. Transmits to the backend over TLS.
- **Role-Adaptive Dashboard**: Dynamically renders quick actions, active tasks, team announcements, and notification counters based on authenticated permissions.
- **AI Copilot Sidebar**: Chat interaction with streaming responses, contextual policy citations, and action verification modals.

### 4.2 Backend Processing Engine (Node.js & Express)
- **Zero-Trust Input Validation**: Never trusts incoming payload claims. Company ID and privileges are strictly derived from verified session tokens.
- **Modular Routers**:
  - `/api/v2/auth`: Session life-cycle, MFA, and credential validation.
  - `/api/v2/copilot`: RAG coordination, vector retrieval, and LLM orchestration.
  - `/api/v2/comms`: Email integration (Gmail / Microsoft Graph) and internal chat websockets.
  - `/api/v2/reports`: Workplace inclusion and accessibility report ingestion with privacy filtering.
  - `/api/v2/observability`: System node telemetry and capabilities streaming.

### 4.3 Database Architecture (MongoDB)
- **Tenant Partitioning**: Every record enforces `{ companyId: ObjectId("...") }` compound indexing.
- **Collections**:
  - `companies`: Tenant profile, custom policies, and global settings.
  - `users`: Identity, hashed passwords (Argon2/bcrypt), departmental assignments, and RBAC roles (`Employee`, `Manager`, `HR_Admin`, `Super_Admin`).
  - `documents`: Metadata, access levels, chunk embeddings, and object storage URIs.
  - `reports`: Issue descriptions, categorized accessibility friction points, status states (`Submitted`, `Under Review`, `Resolved`), and anonymized submitter references.
  - `audit_logs`: Immutable security-sensitive operation logs.

### 4.4 AI Copilot & Grounded RAG Pipeline
1. **Document Ingestion**: Company handbooks are parsed, sanitized, chunked (~500 tokens), and vectorized using an embedding model.
2. **Contextual Retrieval**: When an employee queries policy rules, semantic search retrieves only the top matching chunks that the employee's role is permitted to read.
3. **Grounded Generation**: The LLM synthesizes the final response strictly citing retrieved chunks, eliminating hallucinations.
4. **Agent Tool Calling**: When requested to perform actions (e.g., draft leave request, file a report), the model invokes strictly parameterized backend tools requiring user confirmation before execution.

---

## 5. Security & Privacy Safeguards

1. **Tenant Separation**: Strict backend query filtering prevents Company A from accessing Company B records.
2. **True Anonymity in Reporting**: Anonymized feedback removes IP logs, session IDs, and identifiable metadata at ingestion time.
3. **Prompt Injection Defense**: Retrieved RAG documents and external email bodies are treated as untrusted data inputs, never as executable instructions.
4. **Secret Management**: AI API keys and OAuth refresh tokens are sequestered in environment configurations and never transmitted to client browsers.

---

## 6. How to Run & Verify the Capabilities Section

The standalone, responsive capabilities section is located at:
`C:\Users\Gourav\.gemini\antigravity\scratch\incluai-2.0\index.html`

### Quick Verification Steps:
1. Double-click or open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
2. Check on a standard resolution (e.g. `1440 × 960`):
   - Notice the amber gradient on **"Clarity"** glowing over the `#050505` canvas.
   - Observe the three glass cards with backdrop blur and amber radial highlights.
   - Verify that the holographic radar, cylinders, spheres, and report sheets display **without any visible black squares**.
3. Resize the window down to test responsive tablet (stacked horizontal cards) and mobile layouts.
