# RAG Assistant

A corporate web application that enables organizations to build a knowledge base and provide users with an intelligent chat interface using Retrieval-Augmented Generation (RAG).

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development](#development)
- [Environment Configuration](#environment-configuration)
- [Database Migrations](#database-migrations)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

**RAG Assistant** allows organizations to:
- Upload documents (PDF, DOCX, MD, TXT) to build a knowledge base
- Automatically chunk and index documents using vector embeddings
- Chat with an AI assistant that responds based on relevant document fragments
- Manage system instructions (prompts) for customizing AI behavior
- Track analytics and query logs

## 🏗️ Architecture

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

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 5, TypeScript 5.9 |
| **Backend** | Node.js 20, Express 4, TypeORM 0.3 |
| **Database** | PostgreSQL 16 + pgvector |
| **Queue** | BullMQ 5.x + Redis 7 |
| **Storage** | MinIO (dev) / AWS S3 (prod) |
| **AI** | Provider-agnostic (OpenAI / Anthropic) |

## 📦 Prerequisites

- **Node.js** 20 LTS or higher
- **Docker** & **Docker Compose** (for local development)
- **npm** or **pnpm**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd app_with_RAG
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# At minimum, set your AI provider API key
```

### 3. Start All Services with Docker Compose

```bash
# Start PostgreSQL, Redis, MinIO, API, and Worker
docker-compose up -d
```

### 4. Run Database Migrations

```bash
# Navigate to the API directory
cd server/api

# Install dependencies
npm install

# Run migrations
npm run migration:run
```

### 5. Verify Setup

```bash
# Check health endpoint
curl http://localhost:3000/api/v1/health

# Expected response:
# {"status":"healthy","timestamp":"...","services":{"database":"connected","redis":"not_configured"}}
```

## 💻 Development

### Frontend Development

```bash
# Install root dependencies
npm install

# Start Vite dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Development

```bash
# Install API dependencies
cd server/api
npm install

# Start API in development mode (with hot reload)
npm run dev

# In another terminal, start the worker
cd server/worker
npm install
npm run dev
```

### Using Docker Compose for Development

```bash
# Start all services (including API and Worker in dev mode)
docker-compose up -d

# View logs
docker-compose logs -f api
docker-compose logs -f worker

# Stop all services
docker-compose down
```

## ⚙️ Environment Configuration

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `rag_assistant` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_ACCESS_SECRET` | JWT access token secret | *(required)* |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | *(required)* |
| `AI_PROVIDER` | AI provider (`openai` or `anthropic`) | `openai` |
| `AI_API_KEY` | AI provider API key | *(required)* |
| `S3_ENDPOINT` | S3 endpoint (for MinIO) | *(required for dev)* |
| `S3_ACCESS_KEY_ID` | S3 access key | *(required)* |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | *(required)* |

See `.env.example` for all available configuration options.

## 🗄️ Database Migrations

### Run Migrations

```bash
cd server/api
npm run migration:run
```

### Generate New Migration

```bash
cd server/api
npm run migration:generate --name=MigrationName
```

### Revert Last Migration

```bash
cd server/api
npm run migration:revert
```

### Create Empty Migration

```bash
cd server/api
npm run migration:create --name=MigrationName
```

## 📡 API Endpoints

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Full health check with service status |
| `GET` | `/api/v1/health/ready` | Readiness probe |
| `GET` | `/api/v1/health/live` | Liveness probe |
| `GET` | `/` | API info |

### Additional Endpoints (To be implemented)

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/documents` - List documents
- `POST /api/v1/documents` - Upload document
- `GET /api/v1/chat/sessions` - List chat sessions
- `POST /api/v1/chat/messages` - Send message (SSE)

## 📁 Project Structure

```
app_with_RAG/
├── .env.example              # Environment variables template
├── docker-compose.yml        # Docker Compose configuration
├── package.json              # Root package.json
├── README.md                 # This file
├── src/                      # Frontend source (React)
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
├── server/                   # Backend source
│   ├── api/                  # Express API server
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules
│   │   │   ├── common/       # Shared utilities
│   │   │   ├── database/     # TypeORM entities & migrations
│   │   │   └── main.ts       # Entry point
│   │   ├── package.json
│   │   └── Dockerfile
│   ├── worker/               # Background worker
│   │   ├── src/
│   │   │   ├── jobs/         # BullMQ job processors
│   │   │   ├── services/     # Worker services
│   │   │   └── main.ts       # Entry point
│   │   ├── package.json
│   │   └── Dockerfile
│   └── package.json          # Workspace root
└── technical_description/    # Project documentation
```

## 🔧 Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### pgvector Extension Not Found

Ensure you're using the correct PostgreSQL image with pgvector:

```bash
# The docker-compose.yml uses: pgvector/pgvector:pg16
docker pull pgvector/pgvector:pg16
```

### Migration Errors

```bash
# Reset database (DEVELOPMENT ONLY)
docker-compose down -v
docker-compose up -d postgres
npm run migration:run
```

### Port Already in Use

If port 3000 or 5432 is already in use:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or change the port in .env
PORT=3001
```

### MinIO Access

MinIO console is available at `http://localhost:9001`
- Username: `minioadmin`
- Password: `minioadmin`

Create a bucket named `rag-assistant-documents` for file storage.

## 📝 License

MIT
