#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
PYTHON_BIN="${PYTHON_BIN:-python3}"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo
  echo "Stopping SQDCP Tracker..."
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "========================================"
echo "  SQDCP Tracker"
echo "========================================"
echo

echo "[1/4] Preparing Python environment..."
cd "$BACKEND"
if [[ ! -d ".venv" ]]; then
  "$PYTHON_BIN" -m venv .venv
fi
source .venv/bin/activate
python -m pip install -r requirements.txt -q
echo "  OK"

echo "[2/4] Starting backend (Flask)..."
python run.py &
BACKEND_PID=$!
echo "  OK - http://localhost:8000"

ensure_node() {
  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    return 0
  fi

  # init nvm if installed
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    source "$NVM_DIR/nvm.sh"
  fi

  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    return 0
  fi

  # try fnm
  if command -v fnm &>/dev/null; then
    eval "$(fnm env --use-on-cd 2>/dev/null)"
    if command -v node &>/dev/null && command -v npm &>/dev/null; then
      return 0
    fi
  fi

  # auto-install via nvm
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    echo "  Installing Node.js via nvm..."
    source "$NVM_DIR/nvm.sh"
    nvm install --lts --latest-npm
    return 0
  fi

  # auto-install via brew
  if command -v brew &>/dev/null; then
    echo "  Installing Node.js via Homebrew..."
    brew install node
    return 0
  fi

  echo "  ERROR: Node.js не найден и не удалось установить автоматически."
  echo "  Установите вручную: https://nodejs.org"
  exit 1
}

echo "[3/4] Checking frontend deps..."
cd "$FRONTEND"
ensure_node
if [[ ! -d "node_modules" ]]; then
  npm install
fi
echo "  OK"

echo "[4/4] Starting frontend (Vite)..."
npm run dev &
FRONTEND_PID=$!
echo "  OK - http://localhost:5173"

echo
echo "========================================"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo
echo "  Press Ctrl+C to stop both servers."
echo "========================================"
echo

wait "$BACKEND_PID" "$FRONTEND_PID"
