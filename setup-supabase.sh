#!/bin/bash

# Supabase Setup Script for RiPis
# Run this on both RiPi #1 and RiPi #2 after setting up Supabase

echo "🚀 Setting up Supabase for AI Sales Agent..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python first."
    exit 1
fi

# Navigate to scraper-agent directory
cd scraper-agent || exit

# Install Supabase Python client
echo "📦 Installing Supabase Python client..."
pip3 install supabase --upgrade

# Check if .env exists
if [ ! -f "../.env" ]; then
    echo "⚠️ .env file not found in parent directory"
    echo "Please create .env with SUPABASE_URL and SUPABASE_ANON_KEY"
    exit 1
fi

# Test connection
echo "🔌 Testing Supabase connection..."
python3 -c "
import sys
sys.path.insert(0, '.')
from supabase_db import is_supabase_configured
if is_supabase_configured():
    print('✅ Supabase configured successfully!')
else:
    print('❌ Supabase not configured. Check your .env file.')
    sys.exit(1)
"

if [ $? -eq 0 ]; then
    echo "🎉 Supabase setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Set USE_SUPABASE=true in .env when ready"
    echo "2. Restart scraper: python3 ripi_scraper.py"
    echo "3. Monitor logs for 'Saved to Supabase' messages"
else
    echo "❌ Setup failed. Please check your configuration."
    exit 1
fi
