# RAG Assistant - Quick Commands Cheat Sheet

## 🚀 Start Application

```bash
# Complete Phase 0 startup
npm run phase0:start

# Or step by step
docker-compose up -d postgres redis          # Start databases
cd server/api && npm run dev                 # Start API server
```

## 🛑 Stop Application

```bash
# Complete shutdown
npm run stop

# Or step by step
pkill -f "tsx watch src/main.ts"            # Stop API
docker-compose down                          # Stop databases
```

## 📊 Check Status

```bash
# Docker containers
docker-compose ps

# API health
curl http://localhost:3000/api/v1/health

# Port usage
lsof -i:3000  # API
lsof -i:5433  # PostgreSQL
lsof -i:6379  # Redis
```

## 🐳 Docker Commands

```bash
docker-compose up -d          # Start all containers
docker-compose down           # Stop all containers
docker-compose logs -f        # View logs
docker-compose restart        # Restart containers
docker-compose ps             # Check status
```

## 🔧 Development

```bash
# API Server
cd server/api && npm run dev

# Frontend
npm run dev

# Database migrations
cd server/api
npm run migration:run

# Test S3 connection
cd server && npm run test:s3
```

## 📋 Key URLs

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Health Check | http://localhost:3000/api/v1/health |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |
| Frontend | http://localhost:5173 |

## ⚡ Quick Restart

```bash
# Full restart
npm run stop && npm run phase0:start

# Docker only
docker-compose restart

# API only
pkill -f "tsx watch" && cd server/api && npm run dev
```
