#!/usr/bin/env bash
# vigia-ambiente.sh — motor de vigília local: dorme, compara, e SAI quando o ambiente muda.
#
# Nasceu do corte Enio 2026-08-29 ("deixo o ambiente aberto com as atualizações que vão
# chegando") — a sessão agêntica não tem ouvido próprio: só vê o que busca quando um turno
# roda. Este motor é o ouvido: roda em background, e a saída dele (task notification)
# ACORDA a sessão. Consumidores: (1) sessão coordenadora do kernel; (2) o formato validado
# por um parceiro externo (papel forja); (3) o serviço de instalação do harness.
# [kit do censo: nome de pessoa e ponteiro de doc interno removidos do comentário original —
# nenhuma mudança de comportamento, só o texto explicativo]
#
# O QUE VIGIA — tudo LOCAL, zero chamadas de rede (R-WPP-ACCESS-001: nunca Evolution daqui):
#   1. HASH do conteúdo dos arquivos listados (o hash é calculado e comparado, nunca
#      interpretado — o conteúdo não entra em contexto nenhum). Era mtime+tamanho na v1;
#      2º disparo real (2026-08-29 12:06) foi falso positivo: o canário do leaf re-escreve
#      o próprio estado a cada rodada com conteúdo idêntico — touch é heartbeat, não evento.
#   2. O VEREDITO do sentinela VPS (campos veredito+caidos), NUNCA o md5 do arquivo —
#      1º disparo real (2026-08-29 11:53) foi falso positivo: `medidoEm` muda a cada
#      rodada do cron e o hash do arquivo inteiro colidia com o ruído do heartbeat
#      (mesma família de "512 mora dentro de qualquer hash").
#   3. HEAD do repo (commit novo de qualquer janela). Commit da própria sessão também
#      acorda — aceito e declarado: quem commitou sabe por quê, e o rearme re-baselina.
#
# LISTA DE VIGIADOS (o motor é genérico; a lista é da máquina — P4, motor viaja/dado fica):
#   EGOS_VIGIA_FILES="a:b:c" (separado por dois-pontos)  OU  ~/.egos/vigia-arquivos.txt
#   (um caminho por linha, linhas com # ignoradas). Sem lista: vigia sentinela+HEAD.
#
# Saída: exit 0 com "MUDANCA DETECTADA" + diff ao detectar; exit 0 com aviso ao expirar
# o teto (o consumidor decide rearmar). Falha de leitura vira estado dito ("AUSENTE",
# "NAO-MEDIDO"), nunca silêncio — R13-c.
set -u

INTERVALO="${EGOS_VIGIA_INTERVALO:-300}"
CICLOS="${EGOS_VIGIA_CICLOS:-144}"
SENTINELA="${EGOS_VIGIA_SENTINELA:-$HOME/.egos/vps-sentinela.json}"
REPO="${EGOS_VIGIA_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
LISTA_PADRAO="${EGOS_VIGIA_LISTA:-$HOME/.egos/vigia-arquivos.txt}"

FILES=()
if [ -n "${EGOS_VIGIA_FILES:-}" ]; then
  IFS=':' read -r -a FILES <<< "$EGOS_VIGIA_FILES"
elif [ -f "$LISTA_PADRAO" ]; then
  while IFS= read -r linha; do
    case "$linha" in ''|'#'*) continue ;; esac
    FILES+=("$linha")
  done < "$LISTA_PADRAO"
fi

# Só os campos que carregam decisão. Assunção declarada: no formato atual do sentinela,
# veredito e caidos vivem em linhas próprias; um `caidos` multilinha só seria perdido
# aqui DEPOIS de o veredito já ter virado "caido" — a transição, que é o sinal, aparece.
veredito_sentinela() {
  if [ ! -f "$SENTINELA" ]; then echo "sentinela AUSENTE"; return; fi
  grep -E '"(veredito|caidos)"' "$SENTINELA" | tr -d ' \t' | tr '\n' '|'; echo
}

snap() {
  local f
  for f in "${FILES[@]:+"${FILES[@]}"}"; do
    md5sum "$f" 2>/dev/null || echo "$f AUSENTE"
  done
  veredito_sentinela
  git -C "$REPO" rev-parse HEAD 2>/dev/null || echo "HEAD NAO-MEDIDO"
}

BASE="$(snap)"
echo "vigia armado $(date -Is) — ${#FILES[@]} arquivo(s), intervalo ${INTERVALO}s, teto $((INTERVALO * CICLOS / 60))min"
i=1
while [ "$i" -le "$CICLOS" ]; do
  sleep "$INTERVALO"
  NOW="$(snap)"
  if [ "$NOW" != "$BASE" ]; then
    echo "=== MUDANCA DETECTADA $(date -Is) (ciclo $i) ==="
    diff <(printf '%s\n' "$BASE") <(printf '%s\n' "$NOW") | grep '^[<>]' || true
    exit 0
  fi
  i=$((i + 1))
done
echo "teto atingido sem mudanca — vigia expirou $(date -Is); rearmar se a vigília continua"
exit 0
