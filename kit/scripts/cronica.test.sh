#!/usr/bin/env bash
# cronica.test.sh — goldens do motor de narrativa (cronica.ts coletar/gerar, EGOS_CRONICA_FAKE=1
# sempre que não é o teste de falha) + dos endpoints /cronica no orquestra-viva.ts (porta de teste).
set -u
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CRONICA_TS="$REPO_DIR/scripts/cronica.ts"
PORTA=4651
SRV_PID=""
declare -a TMP_DIRS=()

limpar() {
  [ -n "$SRV_PID" ] && kill "$SRV_PID" 2>/dev/null
  for d in "${TMP_DIRS[@]:-}"; do rm -rf "$d"; done
}
trap limpar EXIT

PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  🟢 $1"; }
falha(){ FAIL=$((FAIL+1)); echo "  🔴 $1"; }

novo_tmp() { local d; d="$(mktemp -d)"; TMP_DIRS+=("$d"); printf '%s' "$d"; }

# =====================================================================
# g1 — ficha conta certo (2 agentes, pend/andamento/concluidos, latências)
# =====================================================================
FILA1="$(novo_tmp)"; CRON1="$(novo_tmp)"
mkdir -p "$FILA1/forja/pendentes" "$FILA1/forja/em-andamento" "$FILA1/forja/concluidos"
mkdir -p "$FILA1/revisor/pendentes" "$FILA1/revisor/em-andamento" "$FILA1/revisor/concluidos"

cat > "$FILA1/forja/pendentes/p1.json" <<'JSON'
{"id":"p1","agente":"forja","titulo":"pendente 1","de":"coordenadora","criadoEm":"2026-08-30T04:00:00.000Z"}
JSON
cat > "$FILA1/forja/em-andamento/a1.json" <<'JSON'
{"id":"a1","agente":"forja","titulo":"andamento 1","de":"coordenadora","criadoEm":"2026-08-30T04:00:00.000Z","executadoPor":"sess1","pegoEm":"2026-08-30T04:05:00.000Z"}
JSON
cat > "$FILA1/forja/concluidos/c1.json" <<'JSON'
{"id":"c1","agente":"forja","titulo":"job concluido 1","de":"coordenadora","criadoEm":"2026-08-30T04:00:00.000Z","executadoPor":"sess1","pegoEm":"2026-08-30T04:03:00.000Z","resultado":"feito com sucesso","concluidoEm":"2026-08-30T04:09:00.000Z"}
JSON
cat > "$FILA1/revisor/concluidos/c2.json" <<'JSON'
{"id":"c2","agente":"revisor","titulo":"revisao 1","de":"coordenadora","criadoEm":"2026-08-30T04:10:00.000Z","executadoPor":"sess2","pegoEm":"2026-08-30T04:12:00.000Z","resultado":"aprovado","concluidoEm":"2026-08-30T04:20:00.000Z"}
JSON

C1() { EGOS_FILA_DIR="$FILA1" EGOS_CRONICA_DIR="$CRON1" EGOS_REPO_DIR="$REPO_DIR" bun "$CRONICA_TS" "$@"; }

FICHA1="$(C1 coletar)"
echo "$FICHA1" | python3 -c "
import json,sys
j=json.load(sys.stdin)
assert j['totais']['nAgentes']==2, f\"nAgentes={j['totais']['nAgentes']}\"
assert j['totais']['nJobs']==4, f\"nJobs={j['totais']['nJobs']}\"
assert j['totais']['ilegiveis']==0
forja=[a for a in j['agentes'] if a['nome']=='forja'][0]
assert forja['pendentes']==1 and forja['emAndamento']==1 and forja['concluidosTotal']==1
c=forja['concluidos'][0]
assert c['esperaMin']==3.0, f\"esperaMin={c['esperaMin']}\"
assert c['execucaoMin']==6.0, f\"execucaoMin={c['execucaoMin']}\"
revisor=[a for a in j['agentes'] if a['nome']=='revisor'][0]
assert revisor['concluidos'][0]['esperaMin']==2.0
assert revisor['concluidos'][0]['execucaoMin']==8.0
" && ok "g1 ficha conta certo (2 agentes, 4 jobs, latências corretas)" || falha "g1 ficha errada: $FICHA1"

# =====================================================================
# g2 — história escrita (gerar FAKE, sem --tom)
# =====================================================================
# g2 conta commits: o repositório é criado aqui, com 1 commit, em vez de depender de onde o kit
# foi parar (quem baixa o kit não tem git nenhum e o g2b falhava sempre — medido 30/09).
# env -u GIT_*: dentro de um hook, o git herdado apontaria para o repositório real.
REPO_G="$(mktemp -d)"; TMP_DIRS+=("$REPO_G")
env -u GIT_DIR -u GIT_INDEX_FILE -u GIT_WORK_TREE git -C "$REPO_G" init -q
env -u GIT_DIR -u GIT_INDEX_FILE -u GIT_WORK_TREE git -C "$REPO_G" -c user.name=teste -c user.email=teste@exemplo.invalid commit -q --allow-empty -m "commit de teste"
C1G() { EGOS_CRONICA_FAKE=1 EGOS_FILA_DIR="$FILA1" EGOS_CRONICA_DIR="$CRON1" EGOS_REPO_DIR="$REPO_G" bun "$CRONICA_TS" "$@"; }
C1G gerar >/tmp/cronica-g2.out 2>&1
COD=$?
if [ "$COD" -eq 0 ] && [ -f "$CRON1/historia.md" ] && grep -q "forja" "$CRON1/historia.md" && grep -q "revisor" "$CRON1/historia.md"; then
  ok "g2 história escrita (historia.md existe, cita forja e revisor)"
else
  falha "g2 falhou: cod=$COD $(cat /tmp/cronica-g2.out) $(cat "$CRON1/historia.md" 2>/dev/null)"
fi
python3 -c "
import json
j=json.load(open('$CRON1/historia.json'))
assert j['fatos']=={'nAgentes':2,'nJobs':4,'nCommits':j['fatos']['nCommits']}
assert j['fatos']['nCommits']>0
assert j['tom']=='caloroso e direto, como quem conta a história da equipe na madrugada'
" && ok "g2b historia.json com fatos + tom default" || falha "g2b historia.json errado"

# =====================================================================
# g3 — tom persiste e muda
# =====================================================================
TOM1="$(python3 -c "import json; print(json.load(open('$CRON1/config.json'))['tom'])")"
[ "$TOM1" = "caloroso e direto, como quem conta a história da equipe na madrugada" ] && ok "g3a tom default persistido no config" || falha "g3a tom default não persistiu: $TOM1"

C1G gerar --tom "sombrio e econômico" >/tmp/cronica-g3.out 2>&1
TOM2="$(python3 -c "import json; print(json.load(open('$CRON1/config.json'))['tom'])")"
TOM2H="$(python3 -c "import json; print(json.load(open('$CRON1/historia.json'))['tom'])")"
[ "$TOM2" = "sombrio e econômico" ] && [ "$TOM2H" = "sombrio e econômico" ] && ok "g3b --tom muda config e historia.json" || falha "g3b não mudou: config=$TOM2 historia=$TOM2H"

C1G gerar >/tmp/cronica-g3c.out 2>&1
TOM3H="$(python3 -c "import json; print(json.load(open('$CRON1/historia.json'))['tom'])")"
[ "$TOM3H" = "sombrio e econômico" ] && ok "g3c gerar sem --tom reusa o tom persistido" || falha "g3c não reusou: $TOM3H"

# =====================================================================
# g4 — fila vazia = história dita vazia (⚪, não inventada)
# =====================================================================
FILA_VAZIA="$(novo_tmp)"; CRON4="$(novo_tmp)"
EGOS_CRONICA_FAKE=1 EGOS_FILA_DIR="$FILA_VAZIA" EGOS_CRONICA_DIR="$CRON4" EGOS_REPO_DIR="$REPO_DIR" \
  bun "$CRONICA_TS" gerar >/tmp/cronica-g4.out 2>&1
if grep -q "⚪ CRÔNICA VAZIA" "$CRON4/historia.md" 2>/dev/null && ! grep -qi "forja\|revisor" "$CRON4/historia.md"; then
  ok "g4a fila existente mas vazia: história dita vazia, nada inventado"
else
  falha "g4a falhou: $(cat "$CRON4/historia.md" 2>/dev/null)"
fi

FILA_INEXISTENTE="$FILA_VAZIA/nunca-foi-criado"
CRON4B="$(novo_tmp)"
EGOS_CRONICA_FAKE=1 EGOS_FILA_DIR="$FILA_INEXISTENTE" EGOS_CRONICA_DIR="$CRON4B" EGOS_REPO_DIR="$REPO_DIR" \
  bun "$CRONICA_TS" gerar >/tmp/cronica-g4b.out 2>&1
grep -q "⚪ CRÔNICA VAZIA" "$CRON4B/historia.md" 2>/dev/null && ok "g4b diretório de fila que nunca existiu também é dito vazio" || falha "g4b falhou: $(cat "$CRON4B/historia.md" 2>/dev/null)"

# =====================================================================
# g5 — JSON corrompido é pulado e CONTADO (⚪ dito, nunca escondido)
# =====================================================================
FILA5="$(novo_tmp)"
mkdir -p "$FILA5/novato/pendentes" "$FILA5/novato/em-andamento" "$FILA5/novato/concluidos"
cat > "$FILA5/novato/concluidos/bom.json" <<'JSON'
{"id":"bom","agente":"novato","titulo":"job legivel","de":"coordenadora","criadoEm":"2026-08-30T04:00:00.000Z","resultado":"ok"}
JSON
echo '{ isso nao fecha' > "$FILA5/novato/concluidos/corrompido.json"
echo 'nem json e' > "$FILA5/novato/pendentes/corrompido2.json"

FICHA5="$(EGOS_FILA_DIR="$FILA5" EGOS_CRONICA_DIR="$(novo_tmp)" EGOS_REPO_DIR="$REPO_DIR" bun "$CRONICA_TS" coletar)"
COD5=$?
echo "$FICHA5" | python3 -c "
import json,sys
j=json.load(sys.stdin)
novato=[a for a in j['agentes'] if a['nome']=='novato'][0]
assert novato['ilegiveis']==2, f\"ilegiveis={novato['ilegiveis']}\"
assert novato['concluidosTotal']==2, f\"concluidosTotal={novato['concluidosTotal']}\"
assert len(novato['concluidos'])==1
assert j['totais']['ilegiveis']==2
" && [ "$COD5" -eq 0 ] && ok "g5 JSON corrompido contado (2 ilegiveis), motor não crasha" || falha "g5 falhou (cod=$COD5): $FICHA5"

# =====================================================================
# g6 — falha do claude → exit 1, stderr visível, história anterior intacta
# =====================================================================
FAKEBIN="$(novo_tmp)"
cat > "$FAKEBIN/claude" <<'BASH'
#!/usr/bin/env bash
echo "erro fake: simulando falha real do claude -p" >&2
exit 1
BASH
chmod +x "$FAKEBIN/claude"

CRON6="$(novo_tmp)"
echo "HISTORIA ANTIGA - NAO TROCAR" > "$CRON6/historia.md"
echo '{"geradoEm":"2026-01-01T00:00:00.000Z","tom":"antigo","fatos":{"nAgentes":0,"nJobs":0,"nCommits":0}}' > "$CRON6/historia.json"

PATH="$FAKEBIN:$PATH" EGOS_FILA_DIR="$FILA1" EGOS_CRONICA_DIR="$CRON6" EGOS_REPO_DIR="$REPO_DIR" \
  bun "$CRONICA_TS" gerar >/tmp/cronica-g6.out 2>/tmp/cronica-g6.err
COD6=$?
CONTEUDO6="$(cat "$CRON6/historia.md")"
if [ "$COD6" -eq 1 ] && [ -s /tmp/cronica-g6.err ] && [ "$CONTEUDO6" = "HISTORIA ANTIGA - NAO TROCAR" ]; then
  ok "g6 falha do claude: exit 1, stderr não-vazio, história anterior intacta"
else
  falha "g6 falhou: cod=$COD6 stderr=$(cat /tmp/cronica-g6.err) historia=$CONTEUDO6"
fi

# =====================================================================
# g7-g10 — endpoints /cronica no orquestra-viva.ts (porta de teste, FAKE ligado no servidor)
# =====================================================================
FILA7="$(novo_tmp)"; CRON7="$(novo_tmp)"
mkdir -p "$FILA7/forja/concluidos"
cat > "$FILA7/forja/concluidos/c1.json" <<'JSON'
{"id":"c1","agente":"forja","titulo":"tile da orquestra","de":"coordenadora","criadoEm":"2026-08-30T04:00:00.000Z","pegoEm":"2026-08-30T04:02:00.000Z","resultado":"cartao 3d no ar","concluidoEm":"2026-08-30T04:10:00.000Z"}
JSON

cd "$REPO_DIR"
EGOS_FILA_DIR="$FILA7" EGOS_CRONICA_DIR="$CRON7" EGOS_ORQUESTRA_PORT="$PORTA" EGOS_REPO_DIR="$REPO_DIR" EGOS_CRONICA_FAKE=1 \
  nohup bun scripts/orquestra-viva.ts >/tmp/cronica-servidor.log 2>&1 &
SRV_PID=$!
for _ in $(seq 1 20); do curl -sf -o /dev/null "http://127.0.0.1:${PORTA}/estado" && break; sleep 0.5; done

# g7: GET /cronica antes de qualquer gerar
OUT7="$(curl -sf "http://127.0.0.1:${PORTA}/cronica")"
[ "$OUT7" = '{"historia":null,"aviso":"⚪ ainda não narrada"}' ] && ok "g7 GET /cronica sem geração prévia: null + aviso ⚪" || falha "g7 falhou: $OUT7"

# g8: tom > 200 chars = 400, sem efeito colateral
TOM_LONGO="$(python3 -c "print('x'*201)")"
CODE8="$(curl -s -o /tmp/cronica-g8.out -w '%{http_code}' -X POST "http://127.0.0.1:${PORTA}/cronica/gerar" -H 'content-type: application/json' -d "{\"tom\":\"$TOM_LONGO\"}")"
[ "$CODE8" = "400" ] && [ ! -f "$CRON7/historia.md" ] && ok "g8 tom>200 chars: 400 e nenhum arquivo criado" || falha "g8 falhou: http=$CODE8 body=$(cat /tmp/cronica-g8.out) historia-existe=$([ -f "$CRON7/historia.md" ] && echo sim || echo nao)"

# g9: POST válido com tom → 200 imediato + polling até narrar
RESP9="$(curl -s -X POST "http://127.0.0.1:${PORTA}/cronica/gerar" -H 'content-type: application/json' -d '{"tom":"tom de teste do painel"}')"
echo "$RESP9" | grep -q '"ok":true' && echo "$RESP9" | grep -q '"iniciado":true' && ok "g9a POST /cronica/gerar responde imediato {ok:true,iniciado:true}" || falha "g9a falhou: $RESP9"

OUT9=""
for _ in $(seq 1 30); do
  OUT9="$(curl -sf "http://127.0.0.1:${PORTA}/cronica" 2>/dev/null)"
  echo "$OUT9" | python3 -c "import json,sys; j=json.load(sys.stdin); sys.exit(0 if j.get('historia') else 1)" 2>/dev/null && break
  sleep 0.3
done
echo "$OUT9" | python3 -c "
import json,sys
j=json.load(sys.stdin)
assert j['historia'], 'historia vazia'
assert j['meta']['tom']=='tom de teste do painel', j['meta']
assert 'forja' in j['historia']
" && ok "g9b história narrada via endpoint reflete o tom pedido e cita o agente" || falha "g9b falhou: $OUT9"

# g10: POST sem tom reusa o tom persistido pelo g9 (fecha o loop de persistência via HTTP)
curl -s -X POST "http://127.0.0.1:${PORTA}/cronica/gerar" -H 'content-type: application/json' -d '{}' >/tmp/cronica-g10-post.out
sleep 1.5
OUT10="$(curl -sf "http://127.0.0.1:${PORTA}/cronica")"
echo "$OUT10" | python3 -c "
import json,sys
j=json.load(sys.stdin)
assert j['meta']['tom']=='tom de teste do painel', j['meta']
" && ok "g10 POST sem tom reusa o tom persistido (mesmo caminho, via HTTP)" || falha "g10 falhou: $OUT10"

kill "$SRV_PID" 2>/dev/null; wait "$SRV_PID" 2>/dev/null; SRV_PID=""

echo "---"; echo "cronica goldens: $PASS passou / $FAIL falhou"
[ "$FAIL" -eq 0 ] || exit 1
