#!/bin/bash
# Wipe the local database and clear auth cookie for fresh testing
set -e

cd "$(dirname "$0")/.."

DB_PATH="data/word-research.db"

rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
echo "Database cleared. It will be recreated on next app start."

echo "Clearing auth cookie via browser..."
open "http://localhost:3000/api/auth/logout"
