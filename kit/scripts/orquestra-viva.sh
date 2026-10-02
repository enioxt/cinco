#!/usr/bin/env bash
# orquestra-viva.sh — sobe orquestra-viva.ts (se ainda não estiver de pé) e abre
# a janela standalone (Chrome --app) fora do VSCode. ORQUESTRA-LOCAL v1.
# Sempre-no-topo: wmctrl não está instalado nesta máquina — documentado, não
# executado: `wmctrl -r "EGOS — Orquestra Viva" -b add,above`.
set -euo pipefail

PORTA="${EGOS_ORQUESTRA_PORT:-4599}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$HOME/.egos/orquestra-viva.log"
mkdir -p "$HOME/.egos"

porta_responde() {
  curl -sf -o /dev/null "http://127.0.0.1:${PORTA}/estado"
}

parar() {
  local pid
  pid="$(lsof -ti tcp:"${PORTA}" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -z "$pid" ]; then
    echo "orquestra-viva: nada ouvindo na porta ${PORTA}"
    exit 0
  fi
  kill "$pid"
  echo "orquestra-viva: parado (pid $pid)"
  exit 0
}

if [ "${1:-}" = "--parar" ]; then
  parar
fi

if porta_responde; then
  echo "orquestra-viva: já de pé em http://127.0.0.1:${PORTA}"
else
  echo "orquestra-viva: subindo servidor…"
  cd "$REPO_DIR"
  EGOS_ORQUESTRA_PORT="$PORTA" nohup bun scripts/orquestra-viva.ts >>"$LOG" 2>&1 &
  disown

  ESPERADO=0
  for _ in $(seq 1 20); do
    if porta_responde; then ESPERADO=1; break; fi
    sleep 0.5
  done
  if [ "$ESPERADO" -ne 1 ]; then
    echo "[ERROR] orquestra-viva: servidor não respondeu em 10s — ver $LOG" >&2
    exit 1
  fi
  echo "orquestra-viva: de pé em http://127.0.0.1:${PORTA}"
fi

if command -v google-chrome >/dev/null 2>&1; then
  google-chrome --app="http://127.0.0.1:${PORTA}" --window-size=1360,860 >/dev/null 2>&1 &
  disown
  echo "orquestra-viva: janela aberta (Chrome --app)"
else
  echo "[ERROR] orquestra-viva: google-chrome não encontrado — abra manualmente http://127.0.0.1:${PORTA}" >&2
  exit 1
fi
