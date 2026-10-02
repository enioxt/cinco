# Todo controle nasce rígido e calibra com evidência

## A regra em uma frase
Um controle novo começa no vocabulário mais estreito que pega o caso real que o gerou, registra cada falso positivo como dado, e só amplia o que aceita como prova válida por decisão humana registrada, nunca por cansaço de quem é barrado.

## Por que existe
Dois exemplos mostram os dois jeitos de errar. No primeiro, um controle novo é calibrado contra o formato que o autor imaginou para as decisões conjuntas, em vez do formato que o registro usa desde sempre. Ele reprova a primeira entrada escrita depois dele e teria reprovado as anteriores. No mesmo dia revela uma segunda premissa errada: o registro tem dois tipos de entrada, pergunta (que precisa de opções) e ata (decisão que o humano já tomou, registrada depois). Exigir opções de uma ata é pedir que se invente alternativa para uma escolha já feita.

No segundo, uma tabela de relações entre etapas de um pipeline valida só as relações declaradas. A dupla que quebra nunca foi declarada, e o controle fica verde. Ausência na tabela gera silêncio, não aviso.

## O que muda na prática
- Falso negativo é pior que falso positivo na largada. O controle começa barrando mais do que o necessário.
- Cada barreira a trabalho legítimo é registrada. A saída é liberação com motivo e uma tarefa para a fonte reconhecer aquele caso na próxima vez.
- Ampliar o vocabulário é ensinar o controle a reconhecer outra forma da mesma prova válida. Baixar o que ele exige é enfraquecimento e fica proibido sem decisão formal.
- Todo controle novo roda contra o acervo existente antes de valer. Se ele reprova material antigo correto, o erro é do controle.
- A direção é única: restritivo, depois calibrado, depois estável. Um controle com várias calibragens documentadas é maduro, não frouxo.
- Perguntar sempre se a relação que quebrou estava declarada em algum lugar que um controle lê.

## Como adotar
1. Escreva o caso real que motivou o controle e use-o como primeiro teste.
2. Rode-o sobre tudo o que já existe e leia cada reprovação.
3. Mantenha um registro de falsos positivos com data e motivo.
4. Decida calibragens em registro humano, com o caso que a motivou.
