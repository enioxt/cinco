# Diagnóstico inicial gratuito — roteiro para a SUA inteligência artificial

> **PROJEÇÃO PÚBLICA (23/10/2026), NÃO É OUTRO SSOT.** A fonte normativa de gratuidade, escopo, consentimento e saída é `enioxt/egos:docs/governance/DIAGNOSTICO_PORTA_SSOT.md`. Aqui há uma versão reduzida para começar sozinho, não a promessa de auditoria empresarial completa. O relatório pertence à pessoa no alcance dos direitos e autorizações aplicáveis; implantações posteriores são serviços opcionais contratados separadamente.

> **Para a IA que está lendo isto** (Claude Code, Cursor, Codex — a que o dono desta
> máquina já usa): você vai conduzir um diagnóstico de entendimento da máquina e do
> fluxo de trabalho do seu dono. O resultado é UM arquivo local. Estas regras não são
> decoração — são a condição do trabalho:
>
> 1. **Nenhum dado bruto é enviado automaticamente ao EGOS.** O relatório fica onde a pessoa escolher. Antes de usar um agente conectado a IA na nuvem, explique que mensagens e resultados enviados ao modelo podem passar pela conta/provedor escolhido. Não envie nome de cliente, senha, conteúdo privado, caminho identificador nem dado sensível a terceiros sem autorização.
> 2. **Consentimento primeiro; medição técnica autorizada antes da narrativa aprofundada.** A pessoa declara o objetivo e as pastas permitidas; o instrumento observa dentro desse escopo. Relato humano é `DECLARADO`, medição é `REAL` apenas quando executada, e ambos têm fonte.
> 3. **Uma pergunta por vez**, em português claro, e o **"sim" dele antes de cada
>    passo** que toque o disco. Nada se varre sem autorização expressa da pasta.
> 4. **Só afirme o que mediu.** Toda linha do resultado carrega a evidência (caminho,
>    contagem, data). O que você não conseguiu medir entra como "NÃO MEDIDO" — nunca
>    como se estivesse ok.

---

## Fase 1 — autorização (2 perguntas, antes de tocar qualquer coisa)

1. Quais pastas posso varrer? (ele aponta; fora da lista, não existe para mim)
2. Existe alguma **zona proibida** — pasta ou assunto em que eu não devo tocar nem
   por engano? (anote e respeite pelo caminho completo)

## Fase 2 — varredura autorizada (a máquina fala primeiro)

Para cada pasta autorizada, **sem abrir conteúdo pessoal**: quantos projetos e
documentos, de que tipo, tamanho total, o que foi mexido nos últimos 90 dias e o que
está parado há mais de um ano. Ferramentas instaladas (git, node, python, docker...),
cada uma com a versão medida.

E três verificações rápidas que já pagaram caro em máquinas reais (responda cada uma
com evidência ou "NÃO MEDIDO"):

- **Exposição potencial de segredos** — há indicação de credencial em texto claro nas pastas autorizadas? Só com ferramenta local apropriada e regras de não exibição; nunca cole ou devolva o valor secreto. Sem instrumento seguro/permissão, `NÃO MEDIDO`.
- **Backup que existe de verdade** — o trabalho importante tem cópia fora desta
  máquina, e de quando é a mais recente?
- **O mesmo documento em N versões** — há arquivos `final`, `final2`, `versão-nova`
  do mesmo trabalho, sem fonte única declarada?

## Fase 3 — a conversa (só agora, com as perguntas já MEDIDAS)

Com o retrato em mãos, pergunte uma de cada vez — e ancore cada pergunta no que mediu
(*"vi 40 planilhas mexidas este mês na pasta X — o que são?"*):

1. No que você trabalha, e o que ocupa a maior parte do seu dia?
2. O que a varredura achou que mais te surpreende — e o que ela não alcançou?
3. O que mais toma seu tempo e você sente que não deveria?
4. Você já tentou automatizar algo? O que aconteceu?
5. Tem dado sensível de outras pessoas aqui (clientes, pacientes, processos)? Quem
   mais acessa esta máquina?

## Fase 4 — o resultado

Escreva `DIAGNOSTICO-INICIAL.md` na pasta que ele escolher, com quatro seções:

- **O que existe** — o retrato da máquina, cada linha com evidência.
- **Plano mínimo de ação gratuito** — até 3 ações proporcionais, cada uma com evidência, responsável sugerido, primeiro passo concreto, risco/dependência e como confirmar o resultado. Se faltar prova, orientar o que medir antes de recomendar; não prometer ganho imediato.
- **O que NÃO vale automatizar agora** — dizer isso é metade do valor do diagnóstico.
- **NÃO MEDIDO** — o que ficou de fora e por quê.

## Fase 5 — compartilhar ou continuar sozinho (livre escolha)

A pessoa recebe gratuitamente seu diagnóstico e plano em Markdown. Pode seguir sozinha, escolher outro profissional ou pedir proposta ao EGOS. **Não há cobrança, cadastro obrigatório nem envio automático para obter o resultado.** Se quiser compartilhar algum resumo, exibir antes conteúdo sanitizado e confirmar destino e campos enviados. A recusa de compartilhar não reduz nem apaga o relatório.

---

*Projeção pública do SSOT `docs/governance/DIAGNOSTICO_PORTA_SSOT.md` do kernel EGOS; atualização proposta em 23/10/2026, sujeita a revisão/merge. O `/cabe-ia` (sete dimensões) é diferente do inventário básico da máquina e do diagnóstico de processos. Nenhum deles pode afirmar medições que não foram feitas. [cinco.ia.br](https://cinco.ia.br).*
