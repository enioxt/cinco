# Ferramenta de escrita não vai a produção sem passar por uma verificação de liberação

## A regra em uma frase
Nenhuma ferramenta que escreve em sistema de cliente é implantada sem objetivo de serviço, reversão automática, chave de liberação por cliente, plano de migração, idempotência e trilha de auditoria imutável.

## Por que existe
Uma revisão externa costuma apontar como principal risco as migrações em produção e as ferramentas de escrita em cliente pagante sem chave de liberação granular e sem plano de reversão por ferramenta. A lição é de postura: cliente que paga merece operação de nível de produção, e implantar no escuro ensina o cliente a desconfiar. A verificação de liberação separa o que bloqueia (itens sem os quais um erro não se desfaz) do que apenas avisa na primeira versão.

## O que muda na prática
1. Bloqueiam o deploy: objetivo de serviço definido, reversão automática testada, chave de liberação por cliente e por ferramenta, plano de migração, idempotência, trilha de auditoria.
2. Objetivo de serviço concreto: latência em percentil alto, taxa de sucesso, orçamento de erro mensal e alerta quando violado.
3. Reversão: cópia antes do deploy, teste de fumaça com ferramentas amostradas, retorno automático em poucos minutos se falhar.
4. Chave por cliente começa desligada para ferramenta nova e sobe em etapas crescentes de exposição, e existe uma chave global que para todas as escritas.
5. Idempotência: o mesmo identificador de requisição devolve o resultado original em vez de repetir a escrita.
6. Trilha só de acréscimo, com estado antes e depois, ator, canal e resultado. Se o registro falha, a escrita falha.
7. Ferramenta destrutiva exige confirmação em dois passos.
8. Limite de taxa por cliente, logs estruturados e mascaramento de dado sensível na saída são recomendados e não bloqueiam a primeira versão.

## Como adotar
- Transforme a lista em checklist por ferramenta e marque na própria tarefa o que está pronto.
- Aplique primeiro às ferramentas de escrita mais simples, e deixe as destrutivas por último.
- Rode a migração em ambiente de ensaio com ramo de banco antes do apply, com o SQL de volta preparado.
- Escreva um roteiro de resposta para violação de objetivo de serviço (reiniciar, ler logs, reverter) antes de precisar dele.
