#!/bin/bash
# Production start — build and run on port 3000
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Error: .env file required. See .env.example"
  exit 1
fi

mkdir -p data
npm run build
npm start
