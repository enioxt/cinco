# Definição de pronto: o que uma tarefa precisa provar para ser fechada

## A regra em uma frase
Uma tarefa só fecha quando os critérios do seu tipo de mudança estão cumpridos com evidência; escrever "feito" sem prova não vale.

## Por que existe
Quando fechar é barato demais, a lista de tarefas e a realidade se afastam: aparecem tarefas pendentes que já estavam prontas e outras marcadas como prontas sem código no diff. Basta citar o identificador no texto do commit para fechar. Sem critério por tipo, cada pessoa (e cada agente) fecha no limiar que lhe convém.

## O que muda na prática
- Funcionalidade nova: código real (nada de casca vazia), teste automatizado, catálogo de capacidades atualizado, impacto descrito no commit e prova de uso real quando há tela ou API (uma chamada, um teste rápido, uma captura de tela).
- Correção de bug: causa raiz identificada e escrita, teste de regressão que reproduz o defeito antes da correção, evidência do antes e do depois, comentário no código se a armadilha não for óbvia.
- Documentação: links válidos, sem proliferação de documentos para o mesmo assunto, português claro quando o público for cliente.
- Manutenção: sem impacto funcional (se houver, o tipo muda para funcionalidade ou correção) e sem segredo novo no commit.
- Refatoração: testes passando antes e depois, comportamento idêntico conferido por teste rápido, cobertura que não regride.

Antipadrões a vigiar: fechar com identificador sem código no diff, citar a tarefa no assunto sem fechá-la formalmente, reabrir uma tarefa já arquivada e criar tarefa nova que só aponta para outra ("ver tarefa X").

## Como adotar
1. Copie a lista de critérios acima para o guia de contribuição.
2. Faça o gabarito do commit pedir o tipo e a evidência.
3. Rode periodicamente uma auditoria que compare tarefas pendentes com os commits recentes: propõe fechamento onde há evidência, avisa onde há evidência parcial e propõe cancelamento onde houve reversão.
4. Trate qualquer fechamento sem diff como suspeito até prova em contrário.
