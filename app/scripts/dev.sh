#!/bin/bash
# Local development server — exposed to local network
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env file found. Copying from .env.example..."
  cp .env.example .env
  echo "Fill in your Google OAuth credentials in .env"
  exit 1
fi

mkdir -p data

# Get local IP for network access
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
echo ""
echo "  Network:  http://${LOCAL_IP}:3000"
echo ""

npx next dev --hostname 0.0.0.0
