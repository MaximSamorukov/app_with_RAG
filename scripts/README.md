# RAG Assistant - Scripts Documentation

## 🚀 Startup Scripts

### Phase 0 Startup (Complete)

```bash
# From project root
./scripts/phase0-start.sh

# Or via npm
npm run phase0:start
```

**What it does:**
- ✅ Validates prerequisites (Node.js, Docker, npm)
- ✅ Validates `.env` configuration
- ✅ Starts Docker containers (PostgreSQL, Redis)
- ✅ Waits for services to be healthy
- ✅ Installs server dependencies
- ✅ Runs database migrations
- ✅ Provides startup summary

---

## 🛑 Shutdown Scripts

### Complete Shutdown

```bash
# From project root
./scripts/stop.sh

# Or via npm
npm run stop
npm run phase0:stop
```

**What it does:**
- ✅ Stops API Server (tsx watch)
- ✅ Stops Background Worker
- ✅ Kills processes on port 3000
- ✅ Stops Docker containers (PostgreSQL, Redis)
- ✅ Verifies all components are stopped
- ✅ Provides manual cleanup commands if needed

---

## 🐳 Docker Management

### Start Docker Containers

```bash
npm run docker:up
# Equivalent to: docker-compose up -d
```

### Stop Docker Containers

```bash
npm run docker:down
# Equivalent to: docker-compose down
```

### View Logs

```bash
npm run docker:logs
# Equivalent to: docker-compose logs -f
```

### Restart Docker Containers

```bash
npm run docker:restart
# Equivalent to: docker-compose restart
```

---

## 📋 Quick Reference

| Action | Command | Alternative |
|--------|---------|-------------|
| **Start Phase 0** | `./scripts/phase0-start.sh` | `npm run phase0:start` |
| **Stop All** | `./scripts/stop.sh` | `npm run stop` |
| **Docker Up** | `docker-compose up -d` | `npm run docker:up` |
| **Docker Down** | `docker-compose down` | `npm run docker:down` |
| **View Logs** | `docker-compose logs -f` | `npm run docker:logs` |
| **Start API** | `cd server/api && npm run dev` | - |
| **Start Worker** | `cd server/worker && npm run dev` | - |

---

## 🔧 Manual Commands

### Stop Specific Components

```bash
# Stop API server only
pkill -f "tsx watch src/main.ts"

# Stop worker only
pkill -f "tsx watch.*worker"

# Kill process on port 3000
kill -9 $(lsof -ti:3000)

# Stop specific Docker container
docker stop rag_postgres rag_redis

# Remove all containers and volumes
docker-compose down -v
```

### Check Running Processes

```bash
# Check API server
ps aux | grep "tsx watch"

# Check Docker containers
docker-compose ps

# Check port 3000
lsof -i:3000

# Check port 5433 (PostgreSQL)
lsof -i:5433

# Check port 6379 (Redis)
lsof -i:6379
```

### View Logs

```bash
# API Server logs (if running with npm)
cd server/api && npm run dev

# Docker logs
docker-compose logs -f postgres
docker-compose logs -f redis

# All logs
docker-compose logs -f
```

---

## 🎯 Typical Workflows

### Start Development Environment

```bash
# 1. Start everything
npm run phase0:start

# 2. Verify
curl http://localhost:3000/api/v1/health

# 3. Start frontend (optional)
npm run dev
```

### Stop Development Environment

```bash
# 1. Stop everything
npm run stop

# 2. Verify (should fail)
curl http://localhost:3000/api/v1/health
# Expected: Connection refused

# 3. Check status
docker-compose ps
# Expected: No containers
```

### Restart After Changes

```bash
# 1. Stop
npm run stop

# 2. Start
npm run phase0:start

# Or just restart Docker
npm run docker:restart
```

### Clean Slate (Reset Everything)

```bash
# 1. Stop all
npm run stop

# 2. Remove volumes (DELETES DATA!)
docker-compose down -v

# 3. Start fresh
npm run phase0:start
```

---

## 📊 Service Ports

| Service | Port | Access |
|---------|------|--------|
| API Server | 3000 | http://localhost:3000 |
| PostgreSQL | 5433 | localhost:5433 |
| Redis | 6379 | localhost:6379 |
| Frontend (Vite) | 5173 | http://localhost:5173 |

---

## ⚠️ Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i:3000

# Kill it
kill -9 <PID>

# Or use stop script
npm run stop
```

### Docker Containers Won't Start

```bash
# Force stop
docker-compose down

# Remove orphaned containers
docker-compose down --remove-orphans

# Try again
npm run phase0:start
```

### API Server Won't Start

```bash
# Check if port is free
lsof -i:3000

# Kill any remaining processes
pkill -f "tsx watch"

# Check logs
cat /tmp/api.log

# Start manually
cd server/api
npm run dev
```

---

## 📝 Script Locations

| Script | Path | Purpose |
|--------|------|---------|
| `phase0-start.sh` | `scripts/phase0-start.sh` | Complete Phase 0 startup |
| `stop.sh` | `scripts/stop.sh` | Complete shutdown |
| `test-s3-connection.ts` | `scripts/test-s3-connection.ts` | Test S3 connectivity |

---

**Last Updated:** March 21, 2026  
**Version:** 1.0
