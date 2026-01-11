#!/bin/bash

echo "========================================"
echo " RASPBERRY PI - AI AGENT STARTUP"
echo "========================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[1/2] Installing dependencies..."
    npm install
else
    echo "[1/2] Dependencies already installed"
fi

echo "[2/2] Starting Raspberry Pi Agent..."
echo ""
echo "========================================"
echo " RASPBERRY PI AGENT ONLINE"
echo "========================================"
echo ""
echo "Device: Raspberry Pi"
echo ""
echo "Press Ctrl+C to stop the agent"
echo "========================================"
echo ""

# Replace with your actual script when ready
# Example: node raspberry-pi-agent.js

# For now, just keep running
while true; do
    sleep 1
done
