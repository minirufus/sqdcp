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
# wait for backend to be ready
for _i in {1..15}; do
  if curl -s http://localhost:8000/api/boards >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
echo "  OK - http://localhost:8000"

ensure_node() {
  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    return 0
  fi

  # --- Search nvm-managed Node ---
  NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    source "$NVM_DIR/nvm.sh"
    local_version="$(nvm current 2>/dev/null | tr -d '[:space:]')"
    if [[ "$local_version" != "none" ]] && [[ "$local_version" != "system" ]] && [[ -n "$local_version" ]] && [[ -d "$NVM_DIR/versions/node/$local_version/bin" ]]; then
      PATH="$NVM_DIR/versions/node/$local_version/bin:$PATH"
      export PATH
    fi
  fi

  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    return 0
  fi

  # --- Search fnm-managed Node ---
  if command -v fnm &>/dev/null; then
    fnm_dir="$(fnm current 2>/dev/null | tr -d '[:space:]')"
    if [[ -z "$fnm_dir" ]] || [[ ! -d "$fnm_dir" ]]; then
      fnm_dir="$HOME/.local/share/fnm/aliases/default/bin"
    else
      fnm_dir="$fnm_dir/bin"
    fi
    if [[ -x "$fnm_dir/node" ]] && [[ -x "$fnm_dir/npm" ]]; then
      PATH="$fnm_dir:$PATH"
      export PATH
    fi
  fi

  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    return 0
  fi

  # --- Auto-install via nvm ---
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    echo "  Installing Node.js via nvm..."
    # shellcheck source=/dev/null
    source "$NVM_DIR/nvm.sh"
    nvm install --lts --latest-npm
    nvm alias default "$(nvm current 2>/dev/null)"
    PATH="$NVM_DIR/versions/node/$(nvm current 2>/dev/null | tr -d '[:space:]')/bin:$PATH"
    export PATH
  fi

  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    return 0
  fi

  # --- Fallback: common macOS paths ---
  for _dir in /opt/homebrew/bin /usr/local/bin /opt/homebrew/opt/node/bin; do
    if [[ -x "$_dir/node" ]] && [[ -x "$_dir/npm" ]]; then
      PATH="$_dir:$PATH"
      export PATH
      return 0
    fi
  done

  echo "  ERROR: Node.js не найден."
  echo "  Установите вручную: https://nodejs.org"
  exit 1
}

echo "[3/4] Checking frontend deps..."
cd "$FRONTEND"
ensure_node
if [[ ! -d "node_modules" ]]; then
  npm install --no-fund --no-audit || npm install --no-fund --no-audit
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
