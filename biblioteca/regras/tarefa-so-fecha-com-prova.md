# Tarefa só fecha com critério de aceite e prova

## A regra em uma frase
Toda tarefa nasce com um critério verificável do que muda no mundo, e só é marcada como feita depois que a prova existe.

## Por que existe
Encontrar problema é barato. Fechar é o produto. Um fluxo que só descobre buracos acumula lista, e uma lista de tarefas que vira diário de memória cresce até ser ignorada. Sem critério de aceite, "feito" passa a significar "mexi nisso", e ninguém consegue distinguir intenção de entrega.

O modelo adotado trata a lista como fila de trabalho: só tarefas pendentes ou em andamento, mais ponteiros de coordenação. O histórico vai para um arquivo à parte, que só recebe acréscimos. O fluxo funciona em ciclo: ouvir o estado real, decidir, executar em paralelo isolado, provar no sistema vivo, registrar o aprendizado como regra e propagar. A prova no sistema rodando, por exemplo derrubar um serviço e vê-lo voltar, é o que separa uma capacidade real de uma intenção.

## O que muda na prática
- Cada tarefa tem identificador único, prioridade, responsável, critério de aceite e a prova (comando de teste, captura de tela ou referência de commit).
- A prioridade vem de uma conta simples de alavancagem: impacto, frequência e urgência multiplicados.
- Investigar algo novo só começa quando a fila de correções cai abaixo de um limite combinado.
- Cada pessoa ou agente tem um limite de tarefas de prioridade alta ao mesmo tempo.
- Tarefa de baixa prioridade parada por muito tempo sai da fila e vai para o plano de longo prazo.
- Um único escritor por repositório de cada vez.
- O arquivo de histórico nunca é editado.

## Como adotar
1. Use um modelo de tarefa com origem, alavancagem, critério e prova.
2. Automatize o arquivamento das tarefas feitas na hora do commit.
3. Marque como feita só depois de rodar a prova.
4. Faça um agente de verificação, diferente de quem implementou, rodar a prova antes do fechamento.
