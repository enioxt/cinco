#!/usr/bin/env bash
# orquestra-entrar.test.sh — goldens da porta única, foco F7 (1 janela = 1 papel).
# ORQUESTRA-LOCAL v1.2 — roda com HOME isolado; não toca ~/.egos real.
set -u
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="$RAIZ/scripts/orquestra-entrar.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export HOME="$TMP"
export EGOS_PORTA_SEM_ESCUTA=1
pass=0; fail=0
ok()   { echo "🟢 $1"; pass=$((pass+1)); }
ruim() { echo "🔴 $1"; fail=$((fail+1)); }

# g1 — entrada limpa registra o papel da janela (âncora = ancestral claude ou PPID)
if bash "$PORTA" revisor >/dev/null 2>&1 && [ "$(cat "$TMP"/.egos/orquestra/janela-*.papel 2>/dev/null)" = "revisor" ]; then
  ok "g1 entrada limpa grava papel da janela"
else ruim "g1 entrada limpa grava papel da janela"; fi

# g2 — reentrada com o MESMO papel é idempotente (não barra)
if bash "$PORTA" revisor >/dev/null 2>&1; then
  ok "g2 reentrada mesmo papel passa"
else ruim "g2 reentrada mesmo papel passa"; fi

# g3 — F7: papel DIFERENTE na mesma janela é RECUSADO (exit 3), sem efeito
saida="$(bash "$PORTA" coordenadora 2>&1)"; rc=$?
if [ "$rc" -eq 3 ] && echo "$saida" | grep -q "F7" && [ "$(cat "$TMP"/.egos/orquestra/janela-*.papel 2>/dev/null)" = "revisor" ]; then
  ok "g3 F7 barra troca de papel (exit 3, marca intacta)"
else ruim "g3 F7 barra troca de papel — rc=$rc"; fi

# g4 — marca de janela MORTA é varrida na entrada seguinte (pid reciclado não bloqueia)
sleep 0.01 & MORTO=$!; wait "$MORTO" 2>/dev/null
echo "forja" > "$TMP/.egos/orquestra/janela-$MORTO.papel"
bash "$PORTA" revisor >/dev/null 2>&1
if [ ! -f "$TMP/.egos/orquestra/janela-$MORTO.papel" ]; then
  ok "g4 marca de janela morta é varrida"
else ruim "g4 marca de janela morta é varrida"; fi

# g5 — --so-brief não grava marca nem barra (leitura é livre)
rm -rf "$TMP/.egos/orquestra"
if bash "$PORTA" forja --so-brief >/dev/null 2>&1 && [ ! -e "$TMP/.egos/orquestra/janela-$$.papel" ]; then
  ok "g5 --so-brief não registra papel"
else ruim "g5 --so-brief não registra papel"; fi

echo "---"
echo "porta goldens: $pass passou / $fail falhou"
[ "$fail" -eq 0 ]
