#!/bin/sh
# Serves AegisWall at http://localhost:8765 (this machine only).
cd "$(dirname "$0")" && exec python3 server.py "$@"
