# INCLUAI 2.0 ✦ Real Feels & Workplace Intelligence Platform

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B%20%7C%20v22%2B-brightgreen.svg)](https://nodejs.org)
[![Express Version](https://img.shields.io/badge/Express-4.21%2B-blue.svg)](https://expressjs.com)
[![Tests](https://img.shields.io/badge/Tests-35%2F35%20Passing-success.svg)](file:///tests/api.test.js)
[![License](https://img.shields.io/badge/License-Proprietary-orange.svg)](#)

---

## 1. Executive Summary

**INCLUAI 2.0** unifies two cohesive, interlinked experiences under a single, high-performance Node.js/Express platform:

1. **✦ Real Feels Public Experience (`/`)**: A creative, aesthetic landing experience with interactive 3D universe physics, magnetic smooth cursor, 3D carousel of relatable workplace moments, 3D text manifesto, and a vibe-powered early-access waitlist with instant cryptographic VIP JWT issuance.
2. **🏢 Workplace Intelligence 2.0 Platform (`/app`)**: An enterprise operational hub offering grounded AI Copilot RAG search with verifiable citations, confidential workplace reporting, task management, dynamic analytics dashboards, and real-time process telemetry.

---

## 2. Platform Architecture & Data Flow

```
                                  INCLUAI 2.0 PLATFORM
                                 (http://localhost:5000)
                                            │
         ┌──────────────────────────────────┴──────────────────────────────────┐
         │                                                                     │
         ▼                                                                     ▼
✦ Real Feels Landing (/)                                     🏢 Workplace Platform (/app)
├── 3D Universe Orbital Canvas                              ├── Public Product Overview (#landing)
├── Relatable Moments 3D Ring (#moments)                    ├── Verifiable AI Copilot (#copilot)
├── Product Feature Drops (#drops)                          ├── Confidential Inclusion Hub (#reports)
├── 3D Animated Manifesto (#manifesto)                     ├── Company Knowledge Base (#knowledge)
└── "Save My Spot" Vibe Waitlist (#join)                    ├── Interactive Task Boards (#tasks)
         │                                                  ├── Live Analytics Trends (#analytics)
         │ POST /api/v2/waitlist                            └── Real Infrastructure Telemetry
         ▼                                                                     ▲
┌─────────────────────────────────┐                                            │
│  Cryptographic JWT VIP Token    │────────────────────────────────────────────┘
│  Auto-stores into localStorage  │   Direct One-Click Seamless Transition
└─────────────────────────────────┘
```

---

## 3. Directory Layout

```
incluai-2.0/
├── server.js                      # Express application gateway & static router
├── package.json                   # Scripts and project dependencies
├── .env.example                   # Environment configuration template
├── .env                           # Local runtime environment variables
│
├── index.html                     # Root "Real Feels" landing page
├── app.html                       # Root Workplace Intelligence 2.0 platform
│
├── public/                        # Static distribution directory served by Express
│   ├── index.html                 # Production landing page with 3D canvas & waitlist
│   └── app.html                   # Single-page enterprise workplace platform
│
├── data/
│   └── db.json                    # Atomic persistent JSON database store
│
├── routes/
│   ├── auth.js                    # JWT login, signup, verification, and demo accounts
│   ├── waitlist.js                # Spot reservation, vibe tracking & public stats
│   ├── copilot.js                 # Grounded AI Copilot synthesis with RAG context
│   ├── knowledge.js               # Document indexing, semantic search & upload
│   ├── reports.js                 # Confidential incident submission (anonymized)
│   ├── messages.js                # Team communication and direct messaging
│   ├── tasks.js                   # Enterprise task backlog and status tracking
│   ├── email.js                   # Provider email dispatch (Mock, Gmail, Graph)
│   ├── analytics.js               # Dashboard metrics and departmental distributions
│   ├── settings.js                # User settings and notification preferences
│   ├── notifications.js           # In-app notification center and read receipts
│   └── observability.js           # System health, process metrics & audit trail
│
├── services/
│   ├── authService.js             # Cryptographic JWT creation and RBAC middleware
│   ├── dbService.js               # Thread-safe atomic file-based JSON storage
│   ├── ragService.js              # Vector TF-IDF similarity document search
│   ├── aiService.js               # Grounded answer synthesis & agent actions
│   └── metricsService.js          # Live Node.js memory & event loop telemetry
│
└── tests/
    └── api.test.js                # Automated end-to-end integration test suite
```

---

## 4. How to Run the Application on Windows

### Prerequisites
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **Terminal**: PowerShell or Windows Command Prompt

### Step 1: Open the Terminal in the Project Root
```powershell
cd "c:\Users\Gourav\OneDrive\Music\Desktop\incluai 2.0"
```

### Step 2: Install Dependencies (If not already installed)
```powershell
npm.cmd install
```

### Step 3: Run the Integration Test Suite
To verify that all 15 endpoints, authentication, RAG, and waitlist systems are functional:
```powershell
.\test.bat
# or
node tests/api.test.js
# or
npm.cmd test
```
*(Expected output: `TEST SUMMARY: 15 Passed, 0 Failed`)*

### Step 4: Start the Server
You can launch directly via the convenience batch file:
```powershell
.\start.bat
# or in development mode:
.\dev.bat
# or directly with Node:
node server.js
# or with npm on Windows:
npm.cmd start
```

### Step 5: Open in Your Browser
Once started, the server runs at:
- **Real Feels Experience**: [http://localhost:5000](http://localhost:5000)
- **Workplace Intelligence 2.0**: [http://localhost:5000/app](http://localhost:5000/app)
- **System Telemetry**: [http://localhost:5000/api/v2/observability/metrics](http://localhost:5000/api/v2/observability/metrics)
- **Health Check**: [http://localhost:5000/api/v2/observability/health](http://localhost:5000/api/v2/observability/health)

---

## 5. Built-In Test & Demo Accounts

You can test different platform roles using the pre-seeded credentials or test accounts:

| Role | Name | Email | Password | Platform Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Employee** | Maya Patel | `emp@comp001.internal` | `password123` | AI Copilot Q&A, draft emails, submit reports, manage personal tasks |
| **HR Admin** | Sarah Connor | `hr@comp001.internal` | `password123` | Access all reports, change report statuses, upload policy documents |
| **Org Admin** | David Vance | `admin@comp001.internal` | `password123` | Full admin privileges, system telemetry, audit trail inspection |
| **Early Member (VIP)** | Waitlist Signer | *(Any Email via Landing Form)* | *(Auto-Issued JWT)* | Instant access to COMP001 workplace platform & collective vibe stats |

---

## 6. REST API Reference

### ✦ Waitlist & Public Telemetry
- `POST /api/v2/waitlist`: Reserve an early access VIP spot, store current vibe, and receive JWT session token.
- `GET /api/v2/waitlist/stats`: Returns live collective vibe telemetry and average hype statistics.

### 🔐 Authentication & Session
- `POST /api/v2/auth/login`: Authenticate with email and password, receive JWT.
- `POST /api/v2/auth/signup`: Register new account with company domain validation.
- `GET /api/v2/auth/me`: Validate active JWT bearer token and return user metadata.

### 🤖 Grounded AI Copilot & Knowledge (RAG)
- `POST /api/v2/copilot/chat`: Send employee query; returns grounded answer with policy citation and optional draft email action.
- `GET /api/v2/copilot/history`: Returns context-aware conversational turns for multi-turn dialogues.
- `POST /api/v2/copilot/hr-policy`: Dedicated HR policy assistant grounding specific entitlements.
- `GET /api/v2/knowledge/documents`: List authorized company policy documents.
- `POST /api/v2/knowledge/search`: Vector-like semantic TF-IDF query across policy documents.
- `POST /api/v2/knowledge/upload`: Upload new organizational guidelines via JSON (HR/Org Admin only).
- `POST /api/v2/knowledge/upload-file`: Multipart upload for `.pdf`, `.docx`, `.txt`, `.csv` with automated text extraction and vector chunking.

### ⚡ Enterprise AI Intelligence Engine (Phase C)
- `POST /api/v2/copilot/advanced/meeting-summary`: AI Meeting Assistant parsing transcripts into summaries, decisions, and action items.
- `POST /api/v2/copilot/advanced/sentiment`: Employee Sentiment Analysis scoring polarity (-1.0 to 1.0) and workplace inclusion index (0–100).
- `POST /api/v2/copilot/advanced/executive-report`: AI Report Generator summarizing incident clearance SLAs and assigning inclusion grades.
- `GET /api/v2/copilot/advanced/workplace-risks`: Workplace Risk Detection identifying recurring hotspots and bottlenecks.
- `POST /api/v2/copilot/advanced/check-accessibility`: Interactive WCAG 2.1 AA accessibility checker and remediation auditor.

### 📋 Reports & Inclusion Hub
- `POST /api/v2/reports`: Submit confidential workplace report (automatically strips PII and IP headers).
- `GET /api/v2/reports`: Fetch all company reports (HR/Org Admin) or submitter's own non-anonymous reports.
- `PATCH /api/v2/reports/:id/status`: Update incident status (e.g. `Under Review` $\to$ `Resolved`).

### 📊 Analytics & Infrastructure Observability
- `GET /api/v2/analytics/dashboard`: Retrieve active tasks, resolved reports, category charts, and AI recommendations.
- `GET /api/v2/observability/health`: Instant service liveness probe.
- `GET /api/v2/observability/metrics`: Real Node.js process heap memory, uptime, latency, and error counts.

---

## 7. Link Integrity & Connected Features

All links within the project are interconnected:
- **Anchors on Landing**: `#moments`, `#drops`, `#manifesto`, and `#join` all execute smooth scroll transitions with animated iris expansion.
- **Cross-Platform Bridges**:
  - `index.html` contains persistent CTA links to `/app` in the navbar, hero, and footer.
  - `app.html` contains persistent navigation links (`✦ Real Feels`) in the top navigation bar and sidebar pointing back to `/`.
- **VIP Onboarding**: Completing the "save my spot" form triggers the reservation banner and enables direct one-click navigation into `#home` on `/app`.
