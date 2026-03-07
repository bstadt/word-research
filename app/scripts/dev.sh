#!/bin/bash
# Local development server
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "No .env file found. Copying from .env.example..."
  cp .env.example .env
  echo "Fill in your Google OAuth credentials and AUTH_SECRET in .env"
  exit 1
fi

mkdir -p data
npm run dev
