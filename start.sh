#!/usr/bin/env bash

# Run this from project root: ./start.sh
# Starts backend and frontend in separate terminals if possible.

echo "Starting backend..."
cd "$(dirname "$0")/backend" || exit 1
if [ -d ".venv" ]; then
  ./.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload
else
  echo "Please create the backend virtualenv first: python3 -m venv .venv"
  exit 1
fi
