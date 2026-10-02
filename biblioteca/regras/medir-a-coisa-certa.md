# Uma régua correta pode estar medindo a coisa errada

## A regra em uma frase
Antes de confiar em qualquer medição, aferir a régua contra um caso de resultado conhecido, medir o fenômeno e não a proxy fácil, e dar âncora textual a todos os níveis que a régua pode atribuir.

## Por que existe
Exemplo: uma régua montada às pressas compara uma métrica contra uma única fonte, enquanto o sistema medido usa de propósito o melhor de duas. A régua penaliza o sistema justamente quando ele está mais certo do que ela, e reporta um número baixo que a própria tabela da etapa anterior contradiz. Em outra rodada, a mesma régua reporta "três de dez sem registro na fonte" porque consultou só uma das duas bases existentes, o que viraria um achado falso de cobertura.

Exemplo: alguém conta quantos documentos contêm uma certa expressão técnica e conclui que há esse mesmo número de vínculos a extrair. O extrator roda sobre uma amostra e devolve zero, corretamente: a expressão aparece em fórmulas de uso massivo e não indica o vínculo procurado. Mediu-se a frequência de uma frase do jargão, não a existência da prova.

Exemplo: uma rubrica de várias dimensões define os três níveis de resposta de uma só vez. Para a resposta morna ("depende do caso"), não há critério, e um ponto de diferença muda o veredito de uma faixa para outra.

## O que muda na prática
- A régua nova roda contra um caso de resultado conhecido antes de qualquer amostra.
- Contradição entre dois medidores da mesma cadeia indica defeito no aferidor e se investiga antes de publicar.
- O resultado que confirma a expectativa é o que merece a checagem obrigatória.
- Antes de citar N como tamanho de oportunidade, rode o extrator sobre os N e informe o rendimento. Zero pode ser a resposta certa. Rendimento não medido escreve-se "não medido", nunca se estima.
- Toda rubrica carrega âncora para cada nível que pode atribuir, não só para o pior. Teste de completude: imagine a resposta mais morna e pergunte que nota ela recebe. Se você hesita, falta âncora.

## Como adotar
Aplique esses três testes à próxima métrica que você criar, antes de olhar o primeiro número.
