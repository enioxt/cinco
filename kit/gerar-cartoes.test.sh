#!/usr/bin/env bash
# gerar-cartoes.test.sh — goldens do gerador de cartões do kit.
set -u
AQUI="$(cd "$(dirname "$0")" && pwd)"; T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
P=0; X=0; ok(){ echo "  🟢 $1"; P=$((P+1)); }; falha(){ echo "  🔴 $1"; X=$((X+1)); }
bun "$AQUI/gerar-cartoes.ts" --saida "$T" >/dev/null 2>&1 && ok "g1 gera os dois arquivos" || falha "g1 gerador falhou"
bun "$AQUI/gerar-cartoes.ts" --check >/dev/null 2>&1 && ok "g2 index.html e LEIA-ME.md do repo são iguais ao gerado" || falha "g2 gerado à mão ou desatualizado"
[ "$(grep -c 'class="cartao"' "$T/index.html")" = "5" ] && ok "g3 5 cartões" || falha "g3 número de cartões"
[ "$(grep -c 'class="caso"' "$T/index.html")" -ge 15 ] && ok "g4 pelo menos 3 casos por ferramenta" || falha "g4 casos"
[ "$(grep -o 'issues/new?title=' "$T/index.html" | wc -l)" -ge 90 ] && ok "g5 botão sugerir melhoria em todo campo" || falha "g5 sugerir"
! grep -Eq '<script[^>]+src=|<link[^>]+rel="(stylesheet|preload)"[^>]+href="https?:' "$T/index.html" && ok "g6 nenhuma fonte/script de outro domínio" || falha "g6 recurso externo"
echo '{"ferramentas":[{"id":"x","nome":"x","o_que_faz":[],"casos":[]}],"abertura":[],"por_que_estas_5":{"titulo":"","texto":[]},"medicao":{},"secoes":[]}' > "$T/ruim.json"
bun "$AQUI/gerar-cartoes.ts" --fonte "$T/ruim.json" --saida "$T/r" >/dev/null 2>&1; [ $? -ne 0 ] && ok "g7 fonte incompleta é recusada" || falha "g7 aceitou fonte incompleta"
echo "gerar-cartoes goldens: $P passou / $X falhou"; [ "$X" = 0 ]
