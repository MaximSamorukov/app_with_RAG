#!/bin/bash

# ===========================================
# RAG Assistant - Phase 0 Startup Script
# ===========================================
# This script initializes the development environment:
# - Validates environment configuration
# - Starts Docker containers (PostgreSQL, Redis)
# - Waits for services to be healthy
# - Installs dependencies
# - Runs database migrations
# ===========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ===========================================
# Helper Functions
# ===========================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# ===========================================
# Prerequisites Check
# ===========================================

echo ""
echo "============================================"
echo "  RAG Assistant - Phase 0 Startup"
echo "============================================"
echo ""

log_info "Checking prerequisites..."

check_command "docker"
check_command "docker-compose"
check_command "node"
check_command "npm"

# Check Node.js version (requires 20+)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    log_error "Node.js version 20 or higher is required. Current version: $(node -v)"
    exit 1
fi

log_success "All prerequisites are installed"

# ===========================================
# Environment Validation
# ===========================================

log_info "Validating environment configuration..."

ENV_FILE="$PROJECT_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
    log_error ".env file not found at $ENV_FILE"
    log_info "Copy .env.example to .env and fill in the values:"
    echo "  cp .env.example .env"
    exit 1
fi

# Load environment variables
set -a
source "$ENV_FILE"
set +a

# Validate required environment variables
VALIDATION_FAILED=0

# JWT Secrets
if [ -z "$JWT_ACCESS_SECRET" ] || [ "$JWT_ACCESS_SECRET" = "your-super-secret-access-token-key-change-in-production" ]; then
    log_error "JWT_ACCESS_SECRET is not set or still has default value"
    VALIDATION_FAILED=1
fi

if [ -z "$JWT_REFRESH_SECRET" ] || [ "$JWT_REFRESH_SECRET" = "your-super-secret-refresh-token-key-change-in-production" ]; then
    log_error "JWT_REFRESH_SECRET is not set or still has default value"
    VALIDATION_FAILED=1
fi

# S3 Configuration
if [ -z "$S3_ENDPOINT" ]; then
    log_error "S3_ENDPOINT is not set"
    VALIDATION_FAILED=1
fi

if [ -z "$S3_BUCKET" ]; then
    log_error "S3_BUCKET is not set"
    VALIDATION_FAILED=1
fi

if [ -z "$S3_ACCESS_KEY_ID" ]; then
    log_error "S3_ACCESS_KEY_ID is not set"
    VALIDATION_FAILED=1
fi

if [ -z "$S3_SECRET_ACCESS_KEY" ]; then
    log_error "S3_SECRET_ACCESS_KEY is not set"
    VALIDATION_FAILED=1
fi

# Database Configuration
if [ -z "$DB_HOST" ]; then
    log_error "DB_HOST is not set"
    VALIDATION_FAILED=1
fi

if [ -z "$DB_NAME" ]; then
    log_error "DB_NAME is not set"
    VALIDATION_FAILED=1
fi

if [ -z "$DB_USER" ]; then
    log_error "DB_USER is not set"
    VALIDATION_FAILED=1
fi

if [ -z "$DB_PASSWORD" ]; then
    log_error "DB_PASSWORD is not set"
    VALIDATION_FAILED=1
fi

# Redis Configuration
if [ -z "$REDIS_HOST" ]; then
    log_error "REDIS_HOST is not set"
    VALIDATION_FAILED=1
fi

if [ $VALIDATION_FAILED -eq 1 ]; then
    echo ""
    log_error "Environment validation failed. Please check your .env file."
    log_info "Required variables:"
    echo "  - JWT_ACCESS_SECRET (generate a secure random string)"
    echo "  - JWT_REFRESH_SECRET (generate a secure random string)"
    echo "  - S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY"
    echo "  - DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
    echo "  - REDIS_HOST"
    exit 1
fi

log_success "Environment validation passed"

# ===========================================
# Docker Containers
# ===========================================

log_info "Starting Docker containers..."

cd "$PROJECT_ROOT"

# Check if containers are already running
if docker-compose ps | grep -q "rag_postgres.*Up"; then
    log_warning "PostgreSQL container is already running"
else
    log_info "Starting PostgreSQL..."
    docker-compose up -d postgres
fi

if docker-compose ps | grep -q "rag_redis.*Up"; then
    log_warning "Redis container is already running"
else
    log_info "Starting Redis..."
    docker-compose up -d redis
fi

# ===========================================
# Wait for Services to be Healthy
# ===========================================

log_info "Waiting for services to be healthy..."

# Wait for PostgreSQL
MAX_RETRIES=30
RETRY_COUNT=0

echo -n "  Waiting for PostgreSQL"
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec rag_postgres pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        echo ""
        log_success "PostgreSQL is ready"
        break
    fi
    echo -n "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo ""
    log_error "PostgreSQL failed to start within timeout"
    docker-compose logs postgres
    exit 1
fi

# Wait for Redis
RETRY_COUNT=0
echo -n "  Waiting for Redis"
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec rag_redis redis-cli ping > /dev/null 2>&1; then
        echo ""
        log_success "Redis is ready"
        break
    fi
    echo -n "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo ""
    log_error "Redis failed to start within timeout"
    docker-compose logs redis
    exit 1
fi

log_success "All services are healthy"

# ===========================================
# Install Dependencies
# ===========================================

log_info "Installing dependencies..."

# Install root dependencies
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    log_info "Installing root dependencies..."
    npm install
else
    log_warning "Root dependencies already installed"
fi

# Install server dependencies
if [ ! -d "$PROJECT_ROOT/server/node_modules" ]; then
    log_info "Installing server dependencies..."
    cd "$PROJECT_ROOT/server"
    npm run install:all
else
    log_warning "Server dependencies already installed"
fi

log_success "Dependencies installed"

# ===========================================
# Database Migrations
# ===========================================

log_info "Running database migrations..."

cd "$PROJECT_ROOT/server"

# Check if migrations exist
if [ ! -d "$PROJECT_ROOT/server/api/src/migrations" ]; then
    log_warning "No migrations directory found. Skipping migrations."
    log_info "Migrations will be created when entities are defined."
else
    # Check if TypeORM is configured
    if [ -f "$PROJECT_ROOT/server/api/ormconfig.ts" ] || [ -f "$PROJECT_ROOT/server/api/ormconfig.js" ]; then
        log_info "Running migrations..."
        npm run migration:run || {
            log_error "Migration failed"
            exit 1
        }
        log_success "Migrations completed"
    else
        log_warning "TypeORM configuration not found. Skipping migrations."
    fi
fi

# ===========================================
# Summary
# ===========================================

echo ""
echo "============================================"
echo "  Phase 0 Startup Complete!"
echo "============================================"
echo ""
log_success "Infrastructure is ready"
echo ""
echo "Services running:"
echo "  - PostgreSQL: $DB_HOST:$DB_PORT (database: $DB_NAME)"
echo "  - Redis: $REDIS_HOST:$REDIS_PORT"
echo ""
echo "Next steps:"
echo "  1. Test S3 connection: npm run test:s3 (from server directory)"
echo "  2. Start API server: cd server/api && npm run dev"
echo "  3. Start worker: cd server/worker && npm run dev"
echo "  4. Start frontend: npm run dev (from project root)"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo ""
