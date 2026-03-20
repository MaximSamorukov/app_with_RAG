# RAG Assistant — Project Context

## Project Overview

**RAG Assistant** is a corporate web application that enables organizations to build a knowledge base and provide users with an intelligent chat interface. The system uses **Retrieval-Augmented Generation (RAG)** to generate responses based on relevant fragments from uploaded documents.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT (SPA)                      │
│          React 19 + Vite 5 · TypeScript                  │
│      ┌──────────────────┬──────────────────────┐        │
│      │  Admin Panel     │  User Chat Interface  │        │
│      └────────┬─────────┴──────────┬───────────┘        │
└───────────────┼────────────────────┼────────────────────┘
                │ HTTPS / SSE        │
┌───────────────▼────────────────────▼────────────────────┐
│                    API SERVER (Node.js)                   │
│              Express · TypeORM · BullMQ 5.x               │
│  ┌──────────┬──────────┬──────────┬──────────────────┐  │
│  │  Auth    │  Docs    │ Prompts  │  Chat / RAG      │  │
│  │  Module  │  Module  │  Module  │  Module          │  │
│  └────┬─────┴────┬─────┴────┬─────┴──────┬───────────┘  │
│       │          │          │             │               │
│  ┌────▼──────────▼──────────▼─────────────▼───────────┐  │
│  │            Background Worker (BullMQ 5.x)           │  │
│  │   parse → chunk → embed → upsert pgvector           │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────┬─────────────┬──────────────────────────────────┘
          │             │
    ┌─────▼──────┐ ┌────▼──────┐  ┌────────────┐
    │ PostgreSQL │ │    S3     │  │ AI Provider│
    │ + pgvector │ │ (files)   │  │ (LLM+Embed)│
    └────────────┘ └───────────┘  └────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 5, TypeScript 5.9 |
| **Backend** | Node.js 20, Express 4, TypeORM 0.3 |
| **Database** | PostgreSQL 16 + pgvector |
| **Queue** | BullMQ 5.x + Redis |
| **Storage** | AWS S3 / S3-compatible |
| **AI** | Provider-agnostic |

### Key Features

- **Authentication**: JWT-based auth with access/refresh tokens, role-based access control (RBAC)
- **Document Management**: Upload PDF/DOCX/MD/TXT files, automatic text extraction and chunking
- **RAG Pipeline**: Vector search in pgvector, cross-encoder reranking, streaming responses via SSE
- **Admin Panel**: Document management, instruction (system prompt) editor, user management, analytics
- **Chat Interface**: Single active session per user, 200 message limit, source citations

## Building and Running

### Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose (for local development)
- PostgreSQL 16 with pgvector extension
- Redis 7

### Development Commands

```bash
# Install dependencies
npm install

# Start development server (Vite)
npm run dev

# Build for production
npm run build

# Run linter
npm lint

# Preview production build
npm run preview
```

### Project Structure

```
app_with_RAG/
├── src/                    # Frontend source code
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Entry point
│   ├── index.css          # Global styles
│   ├── App.css            # Component styles
│   └── assets/            # Static assets (images, icons)
├── server/                 # Backend source code (to be implemented)
├── public/                 # Public static files
│   ├── favicon.svg
│   └── icons.svg
├── technical_description/  # Project documentation
│   ├── 01_functional_description.md
│   ├── 02_technical_specification.md
│   ├── 03_implementation_roadmap.md
│   └── *.md               # Additional spec documents
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tsconfig.app.json      # App-specific TS config
├── vite.config.ts         # Vite configuration
└── eslint.config.js       # ESLint configuration
```

### Backend Structure (Planned)

```
apps/
├── api/                   # Express API server
│   └── src/modules/
│       ├── auth/          # Authentication module
│       ├── documents/     # Document management
│       ├── instructions/  # System prompts
│       ├── chat/          # Chat & RAG
│       ├── users/         # User management
│       └── analytics/     # Dashboard & logs
├── worker/                # BullMQ background workers
└── web/                   # React SPA (currently in src/)
```

## Development Conventions

### TypeScript

- **Strict mode** enabled (`strict: true`)
- **No unused** locals or parameters
- **ES2023** target for modern features
- **Module resolution**: `bundler` mode for Vite compatibility
- **JSX**: `react-jsx` (automatic runtime)

Configuration files:
- `tsconfig.json` — Solution file referencing app and node configs
- `tsconfig.app.json` — Frontend application config
- `tsconfig.node.json` — Build tooling config (Vite, ESLint)

### Code Style

- **ESLint**: Uses `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- **Formatting**: Following ESLint auto-fix rules
- **Naming**: camelCase for variables/functions, PascalCase for components/types

### Git Workflow

Based on the implementation roadmap:
- Feature branches: `feature/{name}` or `phase-{n}/{task}`
- Commits should be descriptive and reference tasks
- PRs required for merging to main

### Testing Practices (Planned)

| Test Type | Framework | Coverage |
|-----------|-----------|----------|
| Unit | Jest / Vitest | Services, utilities |
| Integration | Supertest + Jest | API endpoints |
| E2E | Playwright | Critical user flows |

## Key Documentation

| Document | Description |
|----------|-------------|
| `technical_description/01_functional_description.md` | Functional requirements, user stories, UX states |
| `technical_description/02_technical_specification.md` | Technical architecture, API contracts, database schema |
| `technical_description/03_implementation_roadmap.md` | Phase-by-phase implementation plan with agent assignments |

## Implementation Phases

The project follows an iterative development approach with 7 phases:

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Infrastructure & scaffolding | In progress |
| 1 | Authentication & RBAC | Pending |
| 2 | Document upload & indexing | Pending |
| 3 | RAG pipeline & chat | Pending |
| 4 | Instruction management | Pending |
| 5 | Full admin panel | Pending |
| 6 | Production readiness | Pending |

## Current State

The project is in **Phase 0** (Infrastructure & scaffolding):
- ✅ Frontend: React + Vite + TypeScript skeleton is set up
- ✅ Basic styling with CSS variables (light/dark theme support)
- ⏳ Backend: `server/` directory exists but is empty
- ⏳ Docker Compose: Not yet configured
- ⏳ Database: Schema and migrations not implemented

## AI Agent Roles

For implementing this project, the following specialized agent roles are defined:

| Agent | Responsibility |
|-------|----------------|
| **Infra Agent** | Docker, CI/CD, environment setup, migrations |
| **Backend Agent** | Node.js, Express, TypeORM, services, controllers |
| **AI Agent** | AI adapters (embedding, completion), RAG pipeline, chunking, provider-agnostic integration |
| **Worker Agent** | BullMQ workers, background processing, retry logic |
| **Frontend Agent** | React components, routing, state management |
| **QA Agent** | Unit, integration, and E2E tests |

## Important Notes

- **Single active session** per user (enforced at database level)
- **200 message limit** per chat session (auto-rotate with notification)
- **One active instruction** at a time (system prompt for RAG)
- **Provider-agnostic AI**: Supports any provider via adapter interface (OpenAI, Anthropic, Ollama, vLLM, custom)
- **Hybrid chunking**: Structural chunking for DOCX/MD, sliding window for PDF
- **Vector search**: pgvector with HNSW index, cosine similarity, threshold 0.75
- **Reranking**: Cross-encoder reranking (top-20 → top-5)
- **Embedding dimensions**: Configurable via settings (default 1536 for OpenAI-compatible)
