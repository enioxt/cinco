#!/usr/bin/env bash
# orquestra-viva.test.sh — goldens do servidor /estado + /comando contra fixture
# EGOS_FILA_DIR temporária. Sobe o servidor numa porta de teste e derruba ao final.
set -u
DIR="$(mktemp -d)"; trap 'limpar' EXIT
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORTA=4598
SRV_PID=""

limpar() {
  [ -n "$SRV_PID" ] && kill "$SRV_PID" 2>/dev/null
  rm -rf "$DIR"
}

PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  🟢 $1"; }
falha(){ FAIL=$((FAIL+1)); echo "  🔴 $1"; }

F() { EGOS_FILA_DIR="$DIR" bun "$REPO_DIR/scripts/fila.ts" "$@"; }

subir_servidor() {
  local fila_dir="${1:-$DIR}"
  cd "$REPO_DIR"
  EGOS_FILA_DIR="$fila_dir" EGOS_ORQUESTRA_PORT="$PORTA" EGOS_REPO_DIR="$REPO_DIR" \
    nohup bun scripts/orquestra-viva.ts >"$DIR.log" 2>&1 &
  SRV_PID=$!
  for _ in $(seq 1 20); do
    curl -sf -o /dev/null "http://127.0.0.1:${PORTA}/estado" && return 0
    sleep 0.5
  done
  echo "[ERROR] servidor não subiu em 10s — log:"; cat "$DIR.log"
  exit 1
}

# --- g6: raiz de fila que NUNCA existiu (mktemp -d já cria $DIR, então usa um
# subcaminho não criado) → /estado responde com aviso ⚪, não 500 ---
subir_servidor "$DIR/fila-que-nao-existe"
OUT="$(curl -sf "http://127.0.0.1:${PORTA}/estado")"
echo "$OUT" | grep -q '"filaExiste":false' && ok "g6 fila inexistente: /estado responde sem 500" || falha "g6 fila inexistente falhou: $OUT"
kill "$SRV_PID" 2>/dev/null; wait "$SRV_PID" 2>/dev/null; SRV_PID=""

# --- monta fixture: agente "forja" com 1 pendente e escuta viva (pid deste shell) ---
F postar forja "revisar orquestra" --corpo "cena 3d" --de coordenadora >/dev/null
mkdir -p "$DIR/forja"
cat > "$DIR/forja/.escutando" <<JSON
{"pid": $$, "sessao": "teste-g2", "armadoEm": "2026-08-30T00:00:00.000Z", "intervalo": 60}
JSON

# --- agente "novato" com escuta órfã (pid morto) ---
F postar novato "job orfao" --de coordenadora >/dev/null
mkdir -p "$DIR/novato"
PID_MORTO=999999
cat > "$DIR/novato/.escutando" <<JSON
{"pid": $PID_MORTO, "sessao": "teste-g3", "armadoEm": "2026-08-30T00:00:00.000Z", "intervalo": 60}
JSON

subir_servidor
ESTADO="$(curl -sf "http://127.0.0.1:${PORTA}/estado")"

echo "$ESTADO" | grep -q "revisar orquestra" && ok "g1 /estado lista pendente com título correto" || falha "g1 título ausente: $ESTADO"

echo "$ESTADO" | python3 -c "
import json,sys
j=json.load(sys.stdin)
sys.exit(0 if j['agentes']['forja']['escuta']['status']=='viva' else 1)
" && ok "g2 escuta viva com pid do próprio shell" || falha "g2 escuta viva não detectada"

echo "$ESTADO" | python3 -c "
import json,sys
j=json.load(sys.stdin)
sys.exit(0 if j['agentes']['novato']['escuta']['status']=='orfa' else 1)
" && ok "g3 .escutando com pid morto = orfa" || falha "g3 órfã não detectada"

# --- g4: POST /comando ping cria arquivo em pendentes ---
ANTES=$(ls "$DIR/forja/pendentes" | wc -l)
RESP="$(curl -sf -X POST "http://127.0.0.1:${PORTA}/comando" -H 'content-type: application/json' -d '{"acao":"ping","agente":"forja"}')"
DEPOIS=$(ls "$DIR/forja/pendentes" | wc -l)
echo "$RESP" | grep -q '"ok":true' && [ "$DEPOIS" -eq $((ANTES+1)) ] && ok "g4 POST ping cria job em pendentes" || falha "g4 ping não criou job: $RESP (antes=$ANTES depois=$DEPOIS)"

# --- g5: POST agente inexistente = 400 e nenhum arquivo criado ---
ANTES_TOTAL=$(find "$DIR" -name '*.json' | wc -l)
CODE="$(curl -s -o "$DIR.resp" -w '%{http_code}' -X POST "http://127.0.0.1:${PORTA}/comando" -H 'content-type: application/json' -d '{"acao":"ping","agente":"fantasma"}')"
DEPOIS_TOTAL=$(find "$DIR" -name '*.json' | wc -l)
[ "$CODE" = "400" ] && [ "$ANTES_TOTAL" -eq "$DEPOIS_TOTAL" ] && ok "g5 agente inexistente: 400 e zero arquivo criado" || falha "g5 falhou: code=$CODE antes=$ANTES_TOTAL depois=$DEPOIS_TOTAL resp=$(cat "$DIR.resp")"

kill "$SRV_PID" 2>/dev/null; wait "$SRV_PID" 2>/dev/null; SRV_PID=""

echo "---"; echo "orquestra-viva goldens: $PASS passou / $FAIL falhou"
[ "$FAIL" -eq 0 ] || exit 1
