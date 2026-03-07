#!/bin/bash
# Wipe the local database for testing
set -e

cd "$(dirname "$0")/.."

DB_PATH="data/word-research.db"

rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
echo "Database cleared. It will be recreated on next app start."
