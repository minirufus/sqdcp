#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
PYTHON_BIN="${PYTHON_BIN:-python3}"

# Common Node.js locations on macOS (Apple Silicon + Intel)
for _node_dir in \
  /opt/homebrew/bin \
  /opt/homebrew/opt/node/bin \
  /usr/local/bin; do
  if [[ -d "$_node_dir" ]]; then
    PATH="$_node_dir:$PATH"
  fi
done
export PATH

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
  # If node/npm already available, we're good
  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    return 0
  fi

  # --- nvm ---
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    source "$NVM_DIR/nvm.sh"
    # nvm may have a default alias; apply it
    nvm use default 2>/dev/null || true
  fi

  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    return 0
  fi

  # --- fnm ---
  if command -v fnm &>/dev/null; then
    # Try different fnm env variants
    eval "$(fnm env 2>/dev/null)" || eval "$(fnm env --use-on-cd 2>/dev/null)" || true
    # fnm may have a .node-version or .nvmrc; use the current alias
    fnm use 2>/dev/null || true
  fi

  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    return 0
  fi

  # --- nvm auto-install ---
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    echo "  Installing Node.js via nvm..."
    source "$NVM_DIR/nvm.sh"
    nvm install --lts --latest-npm
    nvm alias default "$(nvm current 2>/dev/null || echo 'lts/*')"
    # ensure node/npm are on PATH from nvm
    if command -v node &>/dev/null && command -v npm &>/dev/null; then
      return 0
    fi
  fi

  # --- Homebrew auto-install ---
  if command -v brew &>/dev/null; then
    echo "  Installing Node.js via Homebrew..."
    brew install node
    # brew may install to /opt/homebrew/bin (Apple Silicon) or /usr/local/bin (Intel)
    for _dir in /opt/homebrew/bin /usr/local/bin /opt/homebrew/opt/node/bin; do
      if [[ -x "$_dir/node" ]] && [[ -x "$_dir/npm" ]]; then
        PATH="$_dir:$PATH"
        export PATH
        return 0
      fi
    done
    # Last resort: re-source PATH from brew
    eval "$(brew shellenv 2>/dev/null)" || true
    if command -v node &>/dev/null && command -v npm &>/dev/null; then
      return 0
    fi
  fi

  echo "  ERROR: Node.js не найден и не удалось установить автоматически."
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
