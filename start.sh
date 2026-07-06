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
    NODE_VER="$(node --version | cut -d'.' -f1 | tr -d 'v')"
    if [[ "$NODE_VER" -lt 18 ]]; then
      echo "  WARNING: Node.js $(node --version) слишком старый. Нужен >= 18."
    fi
    echo "  Found: node $(node --version)"
    return 0
  fi

  # --- nvm: find latest installed version ---
  NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -d "$NVM_DIR/versions/node" ]]; then
    for _nv in "$NVM_DIR/versions/node"/*/bin; do
      if [[ -x "$_nv/node" ]] && [[ -x "$_nv/npm" ]]; then
        PATH="$_nv:$PATH"
        export PATH
        echo "  Found: node $("$_nv/node" --version) (nvm)"
        return 0
      fi
    done
  fi

  # --- fnm ---
  for _fd in \
    "$HOME/.local/share/fnm/aliases/default/bin" \
    "$HOME/.fnm/aliases/default/bin" \
    "$HOME/.local/share/fnm/node-versions"/*/installation/bin \
    "$HOME/.fnm/node-versions"/*/installation/bin; do
    if [[ -x "$_fd/node" ]] && [[ -x "$_fd/npm" ]]; then
      PATH="$_fd:$PATH"
      export PATH
      echo "  Found: node $("$_fd/node" --version) (fnm)"
      return 0
    fi
  done

  # --- brew / system ---
  for _bd in /opt/homebrew/bin /usr/local/bin /opt/homebrew/opt/node/bin; do
    if [[ -x "$_bd/node" ]] && [[ -x "$_bd/npm" ]]; then
      PATH="$_bd:$PATH"
      export PATH
      echo "  Found: node $("$_bd/node" --version) (brew)"
      return 0
    fi
  done

  # --- nvm auto-install ---
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    echo "  Installing Node.js via nvm..."
    # shellcheck source=/dev/null
    source "$NVM_DIR/nvm.sh"
    nvm install --lts --latest-npm || true
    for _nv in "$NVM_DIR/versions/node"/*/bin; do
      if [[ -x "$_nv/node" ]] && [[ -x "$_nv/npm" ]]; then
        PATH="$_nv:$PATH"
        export PATH
        echo "  Installed: node $("$_nv/node" --version)"
        return 0
      fi
    done
  fi

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
