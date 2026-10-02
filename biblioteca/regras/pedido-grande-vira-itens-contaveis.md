# Pedido grande vira lista de itens contáveis, não uma linha de prosa

## A regra em uma frase
Quando um pedido traz muitas partes, cada parte vira um item numerado com estado, para que se possa dizer em um comando quantos existem, quantos fecharam e quantos nunca começaram.

## Por que existe
Se um pedido com dezenas de partes chega em várias mensagens e o registro de tarefas guarda tudo como uma única caixa de seleção, numa linha enorme, parte dos pedidos nunca começa, inclusive o que a pessoa pediu explicitamente para ser o primeiro. Nenhum alarme dispara. Prosa comprime, e item não comprime: é essa diferença que faz um pedido sobreviver ao resumo automático do contexto de uma conversa longa.

O placar também mente. Se for digitado à mão, a contagem sai errada. Se for reportado de memória depois de fechar um item, sai errada de novo. Placar que se digita repete o defeito que o registro existe para evitar.

Exemplo: numa equipe pequena, alguém dita trinta pedidos ao longo de uma tarde. O registro vira uma linha só. Na semana seguinte, ninguém sabe dizer quantos foram feitos, e metade nunca começou.

## O que muda na prática
- Cada parte do pedido tem uma linha: origem, pedido e estado (feito, parcial, nunca começou, adiado por decisão).
- A tarefa executável continua na lista de tarefas, com um ponteiro para o registro. Aqui mora o denominador.
- O placar é contado por ferramenta sobre as linhas da tabela.
- Toda resposta longa informa a posição: item atual, quantos nunca começaram, há quanto tempo o mais antigo espera.
- Entre dois eixos abertos, vence aquele em que a pessoa responsável é a régua. O eixo com retorno rápido sempre ganha de uma política gulosa, sem má-fé e sem aviso.
- O que ficou de fora é resultado, não rodapé.

## Como adotar
1. Ao receber um pedido com várias partes, numere-as na hora, com a frase original.
2. Guarde a tabela em um único arquivo.
3. Gere o placar por contagem automática.
4. Mostre o denominador toda vez que reportar progresso.
