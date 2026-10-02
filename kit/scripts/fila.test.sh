#!/usr/bin/env bash
# fila.test.sh — goldens da fila entre sessões. O golden que importa é o g3:
# N sessões disputando o MESMO job, disparadas REALMENTE em paralelo (& + wait) —
# exatamente uma vence (claim atômico) em TODAS as rodadas.
set -u
DIR="$(mktemp -d)"; trap 'rm -rf "$DIR"' EXIT
MOTOR="$(cd "$(dirname "$0")" && pwd)/fila.ts"
F() { EGOS_FILA_DIR="$DIR" bun "$MOTOR" "$@"; }
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  🟢 $1"; }
falha(){ FAIL=$((FAIL+1)); echo "  🔴 $1"; }

# g1 — postar + listar
F postar forja "fundir painel" --corpo "enxertar 4 secoes" --de coordenadora >/dev/null
F listar forja | grep -q "fundir painel" && ok "g1 postar→listar" || falha "g1 job não listado"

# g2 — pegar faz claim e devolve o corpo
OUT="$(F pegar forja --sessao s2)"
grep -q "enxertar 4 secoes" <<<"$OUT" && ok "g2 pegar devolve o job" || falha "g2 corpo não veio"

# g3 — DISPUTA CONCORRENTE (achado [2] de revisão adversarial, 2026-08-30): a versão
# antiga chamava `pegar` duas vezes SEQUENCIALMENTE — o rename do primeiro já tinha
# terminado antes do segundo nem começar, o que prova ordem de chamada, não exclusão
# mútua na seção crítica check-then-act (readdir → rename). Aqui os dois `pegar` são
# disparados como processos REALMENTE simultâneos (& + wait no mesmo instante),
# repetido em N rodadas independentes; vencedor contado pelos arquivos que aterrissam
# em em-andamento com o prefixo de sessão DAQUELA rodada (sessões prefixadas por `$i`
# pra não colidir entre rodadas, sem precisar limpar o diretório a cada volta).
G3_RODADAS=20
G3_FALHAS=0
for i in $(seq 1 "$G3_RODADAS"); do
  F postar forja "disputa-$i" --de coordenadora >/dev/null
  F pegar forja --sessao "gA$i" >/dev/null 2>&1 &
  PIDA=$!
  F pegar forja --sessao "gB$i" >/dev/null 2>&1 &
  PIDB=$!
  wait "$PIDA" "$PIDB"
  N="$(ls "$DIR/forja/em-andamento/" 2>/dev/null | grep -cE "^(gA$i|gB$i)__")"
  if [ "$N" -ne 1 ]; then
    G3_FALHAS=$((G3_FALHAS+1))
    echo "    rodada $i: $N vencedor(es) na em-andamento/ (esperado 1)"
  fi
done
[ "$G3_FALHAS" -eq 0 ] \
  && ok "g3 disputa concorrente: exatamente 1 vencedor em $G3_RODADAS/$G3_RODADAS rodadas" \
  || falha "g3 claim não é exclusivo sob concorrência real ($G3_FALHAS/$G3_RODADAS rodadas com vencedor≠1)"

# g4 — concluir move e carrega resultado
JOB="$(ls "$DIR/forja/em-andamento/" | head -1)"
F concluir "$DIR/forja/em-andamento/$JOB" --resultado "feito" >/dev/null
ls "$DIR/forja/concluidos/" | grep -q . && grep -q '"resultado": "feito"' "$DIR/forja/concluidos/"* && ok "g4 concluir move+resultado" || falha "g4 conclusão perdida"

# g5 — json corrompido é DITO, não escondido
echo "{quebrado" > "$DIR/forja/pendentes/zz-podre.json"
F listar forja | grep -q "NAO-LEGIVEL" && ok "g5 corrompido é dito" || falha "g5 corrompido silencioso"

# g6 — esperar acorda quando chega job (intervalo 1s)
rm -f "$DIR/forja/pendentes/"*
( sleep 1.5; F postar forja "acorda" --de teste >/dev/null ) &
OUT="$(F esperar forja --intervalo 1 --ciclos 5)"; wait
grep -q "JOB(S) NA FILA" <<<"$OUT" && ok "g6 esperar acorda com job novo" || falha "g6 esperar não acordou"

# g7 — presença: esperar em pé = escuta VIVA no estado; morto = dito, não escondido
rm -f "$DIR/forja/pendentes/"*   # o job do g6 fica em pendentes (esperar detecta, não consome) — sem limpar, a escuta do g7 sai no 1º tick
( EGOS_FILA_DIR="$DIR" bun "$MOTOR" esperar forja --intervalo 2 --ciclos 3 --sessao gT >/dev/null & echo $! > "$DIR.pid" )
sleep 0.7
F estado | grep -q "escuta VIVA" && ok "g7a escuta viva aparece no estado" || falha "g7a escuta viva invisível"
kill -9 "$(cat "$DIR.pid")" 2>/dev/null; sleep 0.3
F estado | grep -qE "ÓRFÃ|SEM ESCUTA" && ok "g7b morte suja é dita (órfã/sem escuta)" || falha "g7b morte suja escondida"

# ── L1+L2 (2026-08-30) — quem pegou e QUANDO ficam DENTRO do JSON ───────────────────
# g8a: o lado que grava. g8b: o lado que NÃO pode quebrar (job velho, sem os campos) —
# é o par que prova retrocompatibilidade, e sem ele o gate só testaria metade.
rm -f "$DIR/forja/pendentes/"* "$DIR/forja/em-andamento/"*
F postar forja "job com marcacao" --de teste >/dev/null
F pegar forja --sessao sessaoX >/dev/null
J8="$(ls "$DIR/forja/em-andamento/" | head -1)"
if grep -q '"executadoPor": "sessaoX"' "$DIR/forja/em-andamento/$J8" \
   && grep -qE '"pegoEm": "[0-9]{4}-[0-9]{2}-[0-9]{2}T' "$DIR/forja/em-andamento/$J8"; then
  ok "g8a pegar grava executadoPor + pegoEm no JSON"
else
  falha "g8a executadoPor/pegoEm ausentes ou errados no job pego"
fi

# g8b — job ANTIGO (formato pré-L1L2) continua legível nos DOIS leitores: estado e o
# /estado do orquestra-viva. Retrocompatibilidade que não é testada é retrocompat. torcida.
rm -f "$DIR/forja/pendentes/"* "$DIR/forja/em-andamento/"*
printf '{"id":"velho-1","agente":"forja","titulo":"job do formato antigo","corpo":"x","de":"coordenadora","criadoEm":"2026-08-01T00:00:00.000Z"}\n' > "$DIR/forja/pendentes/velho-1.json"
EST8="$(F estado 2>&1)"
if grep -q "forja: 1 pendente" <<<"$EST8" && ! grep -q "NAO-LEGIVEL" <<<"$EST8"; then
  ok "g8b estado lê job antigo sem os campos novos"
else
  falha "g8b job antigo quebrou o estado: $EST8"
fi
# g8c — o SEGUNDO leitor (o /estado do orquestra-viva) sobre o mesmo job antigo. Porta
# própria via EGOS_ORQUESTRA_PORT para não colidir com o servidor real na 4599.
OV="$(dirname "$MOTOR")/orquestra-viva.ts"
if [ -f "$OV" ]; then
  EGOS_FILA_DIR="$DIR" EGOS_ORQUESTRA_PORT=4791 bun "$OV" >/dev/null 2>&1 &
  OVPID=$!
  sleep 1.2
  OV8="$(curl -s --max-time 3 http://127.0.0.1:4791/estado 2>/dev/null || true)"
  kill "$OVPID" 2>/dev/null; wait "$OVPID" 2>/dev/null
  if grep -q "job do formato antigo" <<<"$OV8"; then
    ok "g8c /estado do orquestra-viva lê job antigo sem os campos novos"
  elif [ -z "$OV8" ]; then
    echo "⚪ g8c NAO-MEDIDO — o servidor não respondeu na 4791 (não é prova de que passa)"
  else
    falha "g8c orquestra-viva não expôs o job antigo (saída: $(head -c 120 <<<"$OV8"))"
  fi
else
  echo "⚪ g8c NAO-MEDIDO — scripts/orquestra-viva.ts ausente nesta árvore"
fi

# ── L3 (2026-08-30, JOB 5) — job em-andamento envelhecido GRITA no `estado` ─────────
# idade = agora - pegoEm; teto default 30min (override EGOS_FILA_TETO_MIN). Sem
# pegoEm (formato velho) nunca vira verde fingido — sai "idade desconhecida", dito.
rm -f "$DIR/forja/pendentes/"* "$DIR/forja/em-andamento/"*
F postar forja "job envelhecido" --de teste >/dev/null
F pegar forja --sessao sessaoVelha >/dev/null
# EGOS_FILA_TETO_MIN=-1 força QUALQUER idade (mesmo poucos ms) a estourar o teto —
# sem depender de esperar 30min de verdade pra provar o caminho vermelho.
EST9A="$(EGOS_FILA_DIR="$DIR" EGOS_FILA_TETO_MIN=-1 bun "$MOTOR" estado)"
grep -q "ÓRFÃO-SUSPEITO" <<<"$EST9A" && ok "g9a idade > teto grita ÓRFÃO-SUSPEITO na linha do agente" || falha "g9a órfão-suspeito não apareceu: $EST9A"

# g9b — o MESMO job, teto default (30min): idade real é ~0min, não grita (limpo passa).
EST9B="$(F estado)"
! grep -q "ÓRFÃO-SUSPEITO" <<<"$EST9B" && ok "g9b idade dentro do teto default não grita (sem falso positivo)" || falha "g9b falso positivo com teto default: $EST9B"

# g9c — job em-andamento SEM pegoEm (formato velho): idade desconhecida, nunca verde fingido.
rm -f "$DIR/forja/em-andamento/"*
printf '{"id":"velho-and-1","agente":"forja","titulo":"sem pegoEm","corpo":"x","de":"teste","criadoEm":"2026-08-01T00:00:00.000Z","executadoPor":"algumaSessao"}\n' > "$DIR/forja/em-andamento/sessaoVelha__velho-and-1.json"
EST9C="$(F estado)"
grep -q "idade desconhecida" <<<"$EST9C" && ok "g9c job em-andamento sem pegoEm mostra idade desconhecida" || falha "g9c idade desconhecida não apareceu: $EST9C"

# ── item [1] (2026-08-30) — limpar() no exit do `esperar` só remove a presença SE
# ainda for dela (pid bate); escuta VELHA saindo não pode apagar rearme NOVO ─────────
# Cronometragem importa aqui: `tick()` roda a 1ª checagem SÍNCRONA antes de qualquer
# setTimeout — com --ciclos 1 o processo sai quase instantaneamente (não espera
# "intervalo" nenhum), o que não dá janela pra sOld ficar VIVO enquanto sNew rearma.
# --ciclos 2 força um setTimeout de fato: sOld fica vivo ~1×intervalo antes de sair.
rm -f "$DIR/forja/pendentes/"* "$DIR/forja/em-andamento/"* "$DIR/forja/.escutando"
EGOS_FILA_DIR="$DIR" bun "$MOTOR" esperar forja --intervalo 1 --ciclos 2 --sessao sOld >/dev/null 2>&1 &
PID_OLD=$!
sleep 0.3   # sOld já escreveu a presença própria e segue vivo (só sai perto de t≈1s)
EGOS_FILA_DIR="$DIR" bun "$MOTOR" esperar forja --intervalo 5 --ciclos 20 --sessao sNew >/dev/null 2>&1 &
PID_NEW=$!
sleep 0.3   # t≈0.6s: sNew já rearmou (sobrescreveu) a mesma presença; sOld ainda não saiu
wait "$PID_OLD" 2>/dev/null   # sOld atinge o teto perto de t≈1s e sai — dispara limpar()
sleep 0.3
PRES="$DIR/forja/.escutando"
if [ -f "$PRES" ] && grep -q '"sessao":"sNew"' "$PRES"; then
  ok "g10a escuta velha ao sair NÃO apaga presença de escuta nova que já rearmou"
else
  falha "g10a presença nova foi apagada pela escuta velha ($( [ -f "$PRES" ] && cat "$PRES" || echo 'ARQUIVO SUMIU'))"
fi
kill "$PID_NEW" 2>/dev/null; wait "$PID_NEW" 2>/dev/null

# g10b — limpo: escuta SOZINHA (sem rearme por outra) remove a própria presença ao
# sair normalmente — o conserto não pode quebrar o caso comum (sem regressão).
rm -f "$DIR/forja/.escutando"
EGOS_FILA_DIR="$DIR" bun "$MOTOR" esperar forja --intervalo 1 --ciclos 1 --sessao sSozinha >/dev/null 2>&1
[ ! -f "$DIR/forja/.escutando" ] && ok "g10b escuta sozinha remove a própria presença ao sair (sem regressão)" || falha "g10b presença própria não foi removida"

# ── item [4] (2026-08-30) — nome de agente fora de /^[a-z0-9._-]+$/ nunca escapa a
# base (medido antes do conserto: `postar '../fuga'` escrevia fora de $BASE) ────────
FORA="$(dirname "$DIR")/fuga"
rm -rf "$FORA"
OUT11A="$(EGOS_FILA_DIR="$DIR" bun "$MOTOR" postar '../fuga' teste 2>&1)"; RC11A=$?
if [ "$RC11A" -ne 0 ] && [ ! -e "$FORA" ]; then
  ok "g11a postar '../fuga' é recusado (exit $RC11A) e nada escreve fora da base"
else
  falha "g11a nome malicioso não foi barrado (exit $RC11A, escapou=$( [ -e "$FORA" ] && echo sim || echo nao )): $OUT11A"
fi
rm -rf "$FORA"

OUT11B="$(F postar forja "nome valido pos-fix" --de teste 2>&1)"; RC11B=$?
[ "$RC11B" -eq 0 ] && grep -q "postado:" <<<"$OUT11B" && ok "g11b nome de agente válido continua postando (sem regressão)" || falha "g11b regressão: nome válido barrado (exit $RC11B): $OUT11B"

OUT11C="$(EGOS_FILA_DIR="$DIR" bun "$MOTOR" listar 'nome invalido!' 2>&1)"; RC11C=$?
[ "$RC11C" -ne 0 ] && ok "g11c listar também recusa nome de agente inválido (exit $RC11C)" || falha "g11c listar aceitou nome inválido (exit $RC11C)"

FORA2="$(dirname "$DIR")/fuga2"
rm -rf "$FORA2"
mkdir -p "$DIR/forja/em-andamento"
printf '{"id":"malicioso","agente":"../fuga2","titulo":"x","corpo":"x","de":"teste","criadoEm":"2026-08-01T00:00:00.000Z"}\n' > "$DIR/forja/em-andamento/malicioso.json"
OUT11D="$(EGOS_FILA_DIR="$DIR" bun "$MOTOR" concluir "$DIR/forja/em-andamento/malicioso.json" --resultado "x" 2>&1)"; RC11D=$?
if [ "$RC11D" -ne 0 ] && [ ! -e "$FORA2" ]; then
  ok "g11d concluir recusa job com agente malicioso dentro do JSON"
else
  falha "g11d concluir vazou pelo campo agente do JSON (exit $RC11D, escapou=$( [ -e "$FORA2" ] && echo sim || echo nao )): $OUT11D"
fi
rm -f "$DIR/forja/em-andamento/malicioso.json"
rm -rf "$FORA2"

# ── item [5] (2026-08-30) — statSync sem try derrubava o `estado` INTEIRO se uma
# entrada sumisse entre o readdir e o stat; symlink quebrado reproduz determinístico
# (sem depender de vencer uma corrida de verdade contra o filesystem) ───────────────
ln -s "$DIR/nao-existe-mais" "$DIR/link-quebrado"
EST12="$(F estado 2>&1)"; RC12=$?
[ "$RC12" -eq 0 ] && grep -q "^forja:" <<<"$EST12" && ok "g12 entrada que sumiu no meio do laço não derruba o estado" || falha "g12 estado quebrou com entrada ilegível (exit $RC12): $EST12"
rm -f "$DIR/link-quebrado"

echo "---"; echo "fila goldens: $PASS passou / $FAIL falhou"
[ "$FAIL" -eq 0 ] || exit 1
