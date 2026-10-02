# Texto gerado por IA só sai depois de cruzar cada dado com a fonte

## A regra em uma frase
Um documento produzido por modelo é validado duas vezes, antes de gerar (os dados) e depois (o texto), e todo identificador factual citado precisa ser rastreável a um dado de origem.

## Por que existe
O modelo inventa números que soam plausíveis: um telefone, um código, um número de protocolo, uma citação de lei. Num fluxo de geração de relatórios, a defesa mais eficaz é simples: extrair do texto gerado todo identificador e conferir se ele também aparece nos dados estruturados de origem. Se o modelo citou um valor que não está lá, o texto é bloqueado.

A checagem que roda antes do modelo custa quase nada e economiza tokens. Um fluxo que tem as regras apenas no prompt, sem nenhuma verificação estrutural depois da geração, depende de o modelo obedecer, e é o mais frágil dos desenhos.

## O que muda na prática
- **Pré-geração:** um checklist determinístico, sem modelo, com semáforo. Regras críticas ficam vermelhas se falham e bloqueiam. Regras de aviso ficam amarelas. O pior nível vence.
- **Pós-geração:** para cada identificador no texto, procure-o nos dados de origem. Ausente é erro.
- Entidade central com cadastro incompleto bloqueia. Entidade secundária só avisa.
- Evento sem referência à fonte é aviso, porque reduz rastreabilidade.
- Citações legais ou normativas só valem se estiverem em um vocabulário fechado de referências conhecidas.
- Dado ausente nunca é inventado. Entra um marcador explícito de preenchimento pendente.
- Desequilíbrio entre hipóteses e fatos confirmados sobre o tema central gera aviso.

## Como adotar
1. Liste os tipos de identificador do seu domínio e escreva um extrator por tipo.
2. Mantenha os dados de origem em forma estruturada para servir de base de busca.
3. Rode a validação nos dados antes do modelo e no texto depois.
4. Devolva o bloqueio com a lista dos achados. Se alguém puder forçar, registre quem e por quê.
5. Trate o modelo como não confiável até a prova.
