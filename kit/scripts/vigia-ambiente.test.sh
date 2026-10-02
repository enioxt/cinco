#!/usr/bin/env bash
# vigia-ambiente.test.sh — goldens do vigia. Os dois lados, sempre:
# o que ele PEGA (g1 g3 g4 g6) e o que ele DEIXA PASSAR de propósito (g2 g5).
# g2 é o incidente que motivou o motor (2026-08-29 11:53): só `medidoEm` mudou no
# sentinela e a v0 disparou — o medidor tem que pegar o incidente que o motivou,
# e a defesa tem que provar que NÃO dispara mais nele.
set -u
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT
MOTOR="$(cd "$(dirname "$0")" && pwd)/vigia-ambiente.sh"
PASS=0; FAIL=0

ok()   { PASS=$((PASS+1)); echo "  🟢 $1"; }
falha(){ FAIL=$((FAIL+1)); echo "  🔴 $1"; }

# ambiente sintético: repo git mínimo + sentinela falso + arquivo vigiado
git init -q "$DIR/repo" && git -C "$DIR/repo" -c user.email=t@t -c user.name=t commit -q --allow-empty -m base
printf '{\n  "veredito": "no-ar",\n  "desde": "X",\n  "medidoEm": "T1",\n  "caidos": []\n}\n' > "$DIR/sentinela.json"
echo "estado-v1" > "$DIR/vigiado.json"

roda() { # roda o vigia com intervalo 1s e 2 ciclos; devolve a saída
  EGOS_VIGIA_INTERVALO=1 EGOS_VIGIA_CICLOS=2 \
  EGOS_VIGIA_SENTINELA="$DIR/sentinela.json" EGOS_VIGIA_REPO="$DIR/repo" \
  EGOS_VIGIA_FILES="$DIR/vigiado.json" bash "$MOTOR"
}

# g1 — mtime/tamanho do arquivo vigiado muda → DETECTA
( sleep 1.2; echo "estado-v2-maior" > "$DIR/vigiado.json" ) &
OUT="$(roda)"; wait
grep -q "MUDANCA DETECTADA" <<<"$OUT" && ok "g1 arquivo vigiado mudou → detecta" || falha "g1 não detectou mudança de arquivo"

# g2 — SÓ medidoEm muda no sentinela → NÃO dispara (o falso positivo medido)
( sleep 1.2; sed -i 's/"medidoEm": "T1"/"medidoEm": "T2"/' "$DIR/sentinela.json" ) &
OUT="$(roda)"; wait
grep -q "teto atingido sem mudanca" <<<"$OUT" && ok "g2 heartbeat do sentinela (medidoEm) → silêncio" || falha "g2 disparou no ruído do heartbeat"

# g3 — veredito do sentinela vira "caido" → DETECTA
( sleep 1.2; sed -i 's/"veredito": "no-ar"/"veredito": "caido"/' "$DIR/sentinela.json" ) &
OUT="$(roda)"; wait
grep -q "MUDANCA DETECTADA" <<<"$OUT" && ok "g3 veredito no-ar→caido → detecta" || falha "g3 não detectou virada de veredito"

# g4 — arquivo vigiado AUSENTE que passa a existir → DETECTA (ausência é estado dito)
rm -f "$DIR/vigiado.json"
( sleep 1.2; echo "nasceu" > "$DIR/vigiado.json" ) &
OUT="$(roda)"; wait
grep -q "MUDANCA DETECTADA" <<<"$OUT" && ok "g4 AUSENTE→existe → detecta" || falha "g4 não detectou nascimento de arquivo"

# g5 — nada muda → expira em silêncio com aviso (não inventa evento)
OUT="$(roda)"
grep -q "teto atingido sem mudanca" <<<"$OUT" && ok "g5 nada mudou → expira dito" || falha "g5 inventou evento sem mudança"

# g6 — commit novo no repo → DETECTA
( sleep 1.2; git -C "$DIR/repo" -c user.email=t@t -c user.name=t commit -q --allow-empty -m novo ) &
OUT="$(roda)"; wait
grep -q "MUDANCA DETECTADA" <<<"$OUT" && ok "g6 HEAD avançou → detecta" || falha "g6 não detectou commit novo"

# g7 — arquivo re-escrito com conteúdo IDÊNTICO (touch/heartbeat) → NÃO dispara
# (o 2º falso positivo medido, 2026-08-29 12:06: canário re-escreve estado a cada rodada)
( sleep 1.2; touch "$DIR/vigiado.json"; printf 'nasceu\n' > "$DIR/vigiado.json" ) &
OUT="$(roda)"; wait
grep -q "teto atingido sem mudanca" <<<"$OUT" && ok "g7 re-escrita idêntica → silêncio" || falha "g7 disparou em touch sem mudança de conteúdo"

echo "---"
echo "vigia goldens: $PASS passou / $FAIL falhou"
[ "$FAIL" -eq 0 ] || exit 1
