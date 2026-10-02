# Conversa primeiro: o motor recupera, o modelo redige, o humano decide

## A regra em uma frase
A porta de entrada de um sistema é a conversa sobre ele mesmo, com escopo declarado e fontes à mostra; painéis aparecem como resposta que a conversa convoca, não como labirinto a percorrer.

## Por que existe
Um painel obriga a pessoa a saber onde está a informação; a conversa deixa perguntar o que se quer saber. Quando produtos diferentes chegam à mesma arquitetura por caminhos independentes, é sinal de que a ideia amadureceu.

Os testes de funil trazem outra lição: o usuário real não escreve bem. Responde "doc", "sei lá", em mensagens picadas e às vezes contraditórias, justamente porque ainda não formulou o problema.

## O que muda na prática
- Fluxo: pergunta em linguagem natural, recuperação determinística no domínio, contexto só com o recuperado, redação por modelo barato com temperatura baixa, resposta com fontes, ação governada, registro.
- Sem fonte, recusa. Contexto vazio nunca produz texto plausível.
- Identificadores (telefone, número de documento, código de peça) casam por igualdade, nunca por similaridade vetorial, que produz atribuição falsa.
- Quatro níveis de autonomia: consultar, sugerir, agir com aprovação, automatizar o que é repetitivo e reversível. A autonomia cresce com previsibilidade e verificabilidade, não com a esperteza do modelo.
- Escopo por projeto, por caso e por permissão da pessoa, escrito na tela. Escopo ausente é vazamento entre clientes à espera de acontecer.
- Modelo local onde o dado é sensível, remoto onde é permitido; trocar é configuração. Todo custo passa por limite e cada resposta registra qual modelo redigiu.
- Antes de investigar o problema, confirme o significado com a pessoa: um espelho que mostra "o que entendi até aqui" com botão para corrigir.
- Teste o funil com os casos ruins: "oi", respostas de uma palavra, contradição, áudio mal transcrito, pedido de humano.

## Como adotar
1. Escolha um sistema com muitos painéis e comece pela pergunta mais frequente.
2. Separe quem recupera e quem escreve; o escritor só lê o que veio.
3. Declare o escopo na primeira linha da tela.
4. Monte casos de teste com usuários desatentos antes de usuários eloquentes.
