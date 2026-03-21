# RAG Assistant - Quick Start Guide

> **Phase 0: Infrastructure Setup**  
> This guide walks you through setting up the RAG Assistant development environment from scratch.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start (5 minutes)](#quick-start-5-minutes)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Software | Version | Verify Command |
|----------|---------|----------------|
| **Node.js** | 20+ LTS | `node -v` |
| **npm** | 9+ | `npm -v` |
| **Docker** | 20+ | `docker --version` |
| **Docker Compose** | 2.0+ | `docker-compose --version` |
| **Git** | 2.0+ | `git --version` |

### Installing Prerequisites

#### Ubuntu/Debian

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Logout and login again for Docker group changes to take effect
```

#### macOS

```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Install Docker Desktop
brew install --cask docker
```

#### Windows

1. Download and install [Node.js 20 LTS](https://nodejs.org/)
2. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## Quick Start (5 minutes)

If you have all prerequisites installed, follow these steps:

### Step 1: Clone and Navigate

```bash
cd /home/maksim/projects/app_with_RAG
```

### Step 2: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials (see Configuration section below)
# Required: JWT secrets, S3 credentials
```

### Step 3: Run the Startup Script

```bash
# Make the script executable (first time only)
chmod +x scripts/phase0-start.sh

# Run the Phase 0 startup script
./scripts/phase0-start.sh
```

The script will:
- ✅ Validate your `.env` configuration
- ✅ Start PostgreSQL and Redis containers
- ✅ Wait for services to be healthy
- ✅ Install all dependencies
- ✅ Run database migrations

### Step 4: Test S3 Connection

```bash
cd server
npm run test:s3

# Or directly
npx tsx server/scripts/test-s3-connection.ts
```

### Step 5: Start Development Servers

Open **three separate terminals**:

**Terminal 1 - API Server:**
```bash
cd server/api
npm run dev
```

**Terminal 2 - Background Worker:**
```bash
cd server/worker
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd /home/maksim/projects/app_with_RAG
npm run dev
```

### Step 6: Verify

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000/health
- **PostgreSQL:** `localhost:5433`
- **Redis:** `localhost:6379`

---

## Detailed Setup

### 1. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Generate JWT Secrets

Generate secure random secrets for JWT tokens:

```bash
# Generate JWT_ACCESS_SECRET (64 characters)
openssl rand -hex 32

# Generate JWT_REFRESH_SECRET (64 characters)
openssl rand -hex 32
```

Update your `.env` file:

```env
JWT_ACCESS_SECRET=<generated-access-secret>
JWT_REFRESH_SECRET=<generated-refresh-secret>
```

### 3. Configure S3 Storage

The application uses cloud S3 storage (not MinIO). Update your `.env` with your S3 provider credentials:

```env
# S3 Configuration
S3_ENDPOINT=https://s3.twcstorage.ru
S3_REGION=ru-1
S3_BUCKET=d7840e6f-436099f3-59cd-4346-b7fa-ecf01931ab1a
S3_ACCESS_KEY_ID=QUYE8OBY2DFSMQOM0I0D
S3_SECRET_ACCESS_KEY=<your-secret-key>
S3_FORCE_PATH_STYLE=true
```

**For AWS S3:**
```env
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_FORCE_PATH_STYLE=false
```

### 4. Configure AI Provider

Update your `.env` with AI provider credentials:

```env
# OpenAI
AI_PROVIDER=openai
AI_API_KEY=sk-your-openai-api-key
AI_MODEL=gpt-4o-mini
AI_EMBEDDING_MODEL=text-embedding-3-small

# OR Anthropic
# AI_PROVIDER=anthropic
# AI_API_KEY=sk-ant-your-anthropic-key
# AI_MODEL=claude-3-5-sonnet-20241022
```

---

## Verification

### Check Docker Containers

```bash
docker-compose ps
```

Expected output:
```
NAME            STATUS                    PORTS
rag_postgres    Up (healthy)              0.0.0.0:5433->5432/tcp
rag_redis       Up (healthy)              0.0.0.0:6379->6379/tcp
```

### Test Database Connection

```bash
docker exec -it rag_postgres psql -U postgres -d rag_assistant -c "SELECT version();"
```

### Test Redis Connection

```bash
docker exec -it rag_redis redis-cli ping
# Expected: PONG
```

### Test API Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "s3": "connected"
}
```

### Test S3 Connection

```bash
cd server
npm run test:s3

# Or directly
npx tsx server/scripts/test-s3-connection.ts
```

---

## Troubleshooting

### Common Issues

#### 1. Docker Containers Won't Start

**Symptoms:** `docker-compose up` fails or containers exit immediately

**Solutions:**
```bash
# Check Docker is running
sudo systemctl status docker

# Check for port conflicts
docker ps | grep -E "5433|6379"

# View container logs
docker-compose logs postgres
docker-compose logs redis

# Restart containers
docker-compose down
docker-compose up -d
```

#### 2. Port Already in Use

**Symptoms:** `Error starting userland proxy: listen tcp 0.0.0.0:5433: bind: address already in use`

**Solutions:**
```bash
# Find what's using the port
lsof -i :5433
# or
netstat -tulpn | grep 5433

# Stop the conflicting service
# or change the port in docker-compose.yml
```

#### 3. Environment Variables Not Loading

**Symptoms:** Application fails with "undefined" errors

**Solutions:**
```bash
# Verify .env file exists
ls -la .env

# Check .env syntax (no spaces around =)
cat .env

# Restart containers to reload env
docker-compose down
docker-compose up -d
```

#### 4. S3 Connection Fails

**Symptoms:** S3 test script fails with connection errors

**Solutions:**
1. Verify endpoint URL includes `https://`
2. Check credentials are correct (no extra spaces)
3. Test `S3_FORCE_PATH_STYLE` setting (try both `true` and `false`)
4. Check network connectivity:
   ```bash
   curl -I https://s3.twcstorage.ru
   ```

#### 5. Database Migration Errors

**Symptoms:** `migration failed` or `relation already exists`

**Solutions:**
```bash
# Check database is accessible
docker exec -it rag_postgres psql -U postgres -d rag_assistant

# View existing tables
\dt

# If needed, reset database (WARNING: deletes all data)
docker-compose down -v
./scripts/phase0-start.sh
```

#### 6. Node Modules Issues

**Symptoms:** `Cannot find module` errors

**Solutions:**
```bash
# Clean install
rm -rf node_modules server/api/node_modules server/worker/node_modules
rm -rf package-lock.json server/package-lock.json

npm install
cd server
npm run install:all
```

#### 7. pgvector Extension Not Found

**Symptoms:** `extension "vector" does not exist`

**Solutions:**
```bash
# Ensure using correct PostgreSQL image
docker-compose down
docker rmi pgvector/pgvector:pg16
docker-compose up -d postgres

# Manually enable extension
docker exec -it rag_postgres psql -U postgres -d rag_assistant -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Getting Help

If you encounter issues not covered here:

1. Check the logs: `docker-compose logs -f`
2. Review `.env` configuration
3. Verify all prerequisites are installed correctly
4. Check GitHub Issues for similar problems

---

## Next Steps

After completing Phase 0 setup:

### Phase 1: Authentication
- [ ] Implement JWT authentication
- [ ] Create user registration/login endpoints
- [ ] Set up RBAC (Role-Based Access Control)

### Phase 2: Document Management
- [ ] Implement file upload to S3
- [ ] Create document indexing pipeline
- [ ] Set up text extraction workers

### Phase 3: RAG Pipeline
- [ ] Implement vector search with pgvector
- [ ] Set up reranking service
- [ ] Create chat endpoints with SSE streaming

### Development Workflow

```bash
# Daily development
./scripts/phase0-start.sh  # Start infrastructure

# In separate terminals:
cd server/api && npm run dev
cd server/worker && npm run dev
npm run dev  # Frontend

# Before committing
npm run lint
npm run typecheck

# View logs
docker-compose logs -f
```

### Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# View service logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Access PostgreSQL shell
docker exec -it rag_postgres psql -U postgres -d rag_assistant

# Access Redis CLI
docker exec -it rag_redis redis-cli

# Run S3 test
cd server && npx tsx scripts/test-s3-connection.ts

# Run all tests
npm test
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENT (SPA)                      │
│          React 19 + Vite 5 · TypeScript                  │
│              http://localhost:5173                       │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────┐
│                    API SERVER (Node.js)                   │
│              Express · TypeORM · BullMQ                  │
│              http://localhost:3000                       │
└─────┬───────────────────────────────────────────────────┘
      │
      ├─────────────┬──────────────┬──────────────────────┐
      │             │              │                      │
┌─────▼──────┐ ┌────▼──────┐ ┌────▼────┐      ┌─────────▼────────┐
│ PostgreSQL │ │   Redis   │ │  S3     │      │   AI Provider    │
│ + pgvector │ │  BullMQ   │ │ (Cloud) │      │ (OpenAI/Custom)  │
│ localhost  │ │ localhost │ │ External│      │   External       │
│ :5433      │ │ :6379     │ │         │      │                  │
└────────────┘ └───────────┘ └─────────┘      └──────────────────┘
```

---

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit `.env`** - It's in `.gitignore` for a reason
2. **Generate strong secrets** - Use `openssl rand -hex 32` for JWT secrets
3. **Use IAM roles in production** - Don't hardcode credentials in production
4. **Enable CORS properly** - Update `CORS_ORIGIN` for your production domain
5. **Use HTTPS in production** - Never expose HTTP endpoints publicly

---

## License

MIT License - See LICENSE file for details

---

**Ready to start building?** Run `./scripts/phase0-start.sh` and begin development! 🚀
