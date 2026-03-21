#!/bin/bash

# ============================================
# RAG Assistant - Complete Shutdown Script
# ============================================
# This script stops all application components:
# - API Server
# - Background Worker
# - Docker Containers (PostgreSQL, Redis)
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  RAG Assistant - Complete Shutdown${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Stop API Server
print_status "Stopping API Server..."
if pkill -f "tsx watch src/main.ts" 2>/dev/null; then
    print_success "API Server stopped"
else
    print_warning "API Server was not running"
fi

# Also kill any node processes running main.ts
if pkill -f "node.*main.ts" 2>/dev/null; then
    print_success "Node main.ts process stopped"
fi

# Step 2: Stop Background Worker
print_status "Stopping Background Worker..."
if pkill -f "tsx watch.*worker" 2>/dev/null; then
    print_success "Background Worker stopped"
else
    print_warning "Background Worker was not running"
fi

# Step 3: Kill any remaining Node processes on ports 3000
print_status "Checking for processes on port 3000..."
if command -v lsof &> /dev/null; then
    PORT_3000_PID=$(lsof -ti:3000 2>/dev/null || true)
    if [ -n "$PORT_3000_PID" ]; then
        kill -9 $PORT_3000_PID 2>/dev/null || true
        print_success "Killed process on port 3000 (PID: $PORT_3000_PID)"
    else
        print_warning "No processes found on port 3000"
    fi
else
    print_warning "lsof not available, skipping port check"
fi

# Step 4: Stop Docker Containers
print_status "Stopping Docker containers..."
cd "$PROJECT_ROOT"

if docker-compose ps 2>/dev/null | grep -q "rag_postgres\|rag_redis"; then
    docker-compose down 2>/dev/null
    print_success "Docker containers stopped"
else
    print_warning "No Docker containers running"
fi

# Step 5: Verify all processes are stopped
print_status "Verifying shutdown..."
sleep 2

# Check for remaining processes
REMAINING=0

if pgrep -f "tsx watch src/main.ts" > /dev/null 2>&1; then
    print_error "API Server still running!"
    REMAINING=1
fi

if pgrep -f "tsx watch.*worker" > /dev/null 2>&1; then
    print_error "Background Worker still running!"
    REMAINING=1
fi

if command -v lsof &> /dev/null; then
    if lsof -ti:3000 > /dev/null 2>&1; then
        print_error "Port 3000 still in use!"
        REMAINING=1
    fi
fi

if docker-compose ps 2>/dev/null | grep -q "Up"; then
    print_error "Some Docker containers still running!"
    REMAINING=1
fi

echo ""
if [ $REMAINING -eq 0 ]; then
    print_success "============================================"
    print_success "  All components stopped successfully!"
    print_success "============================================"
else
    print_warning "============================================"
    print_warning "  Some components may still be running"
    print_warning "  Run this script again or kill processes manually"
    print_warning "============================================"
fi

echo ""
echo "Manual cleanup commands (if needed):"
echo "  # Kill API server"
echo "  pkill -f 'tsx watch src/main.ts'"
echo ""
echo "  # Kill worker"
echo "  pkill -f 'tsx watch.*worker'"
echo ""
echo "  # Stop Docker"
echo "  cd $PROJECT_ROOT && docker-compose down"
echo ""
echo "  # Kill process on port 3000"
echo "  kill -9 \$(lsof -ti:3000)"
echo ""
