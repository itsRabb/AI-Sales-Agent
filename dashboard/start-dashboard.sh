#!/bin/bash

# ============================================
# AI Agent Dashboard Startup Script (Linux/Pi)
# ============================================

echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   Starting AI Agent Command Center       ║"
echo "╚═══════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed!"
    echo ""
    echo "Install with: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "              sudo apt-get install -y nodejs"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Navigate to script directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ ERROR: Failed to install dependencies"
        exit 1
    fi
    echo ""
    echo "✅ Dependencies installed successfully"
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  WARNING: .env file not found"
    echo ""
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add your agent URLs!"
    echo ""
    echo "Run: nano .env"
    echo ""
    read -p "Press Enter after you've configured .env..."
fi

# Start the dashboard
echo ""
echo "🚀 Starting Command Center..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Dashboard URL: http://localhost:4000"
echo "  Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Try to open browser (works on Pi with GUI)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:4000 2>/dev/null &
fi

# Start server
node server.js

# If server stops
echo ""
echo ""
echo "⏹️  Dashboard stopped"
echo ""
