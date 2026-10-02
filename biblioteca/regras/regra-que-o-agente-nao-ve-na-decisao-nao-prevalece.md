# Regra que o agente não enxerga na hora da decisão não prevalece

## A regra em uma frase
Antes de montar mais uma verificação automática para uma regra de julgamento, confira se a regra está onde o agente a lê na hora de decidir. O primeiro conserto é consolidar a regra num lugar visível, e o filtro automático vem depois.

## Por que existe
Exemplo: uma regra de comportamento ("mostrar o fluxo, sem escolher fornecedor, preço ou prazo pelo cliente") foi violada repetidas vezes. A investigação achou três falhas encadeadas. A causa raiz: a regra vivia só numa lista de tarefas que o agente não lê ao decidir, e o documento carregado a cada sessão não a mencionava. Por isso surgiu uma nova versão da mesma regra a cada vez que alguém não achava a anterior. Em segundo lugar, uma verificação no commit dispara depois que o raciocínio já foi gasto. Em terceiro, nenhum filtro por padrão de texto distingue um fornecedor escrito de um marcador de lugar.

## O que muda na prática
1. Camada um, a mais forte: uma única regra consolidada no arquivo lido em toda sessão, com muitos gatilhos concretos (nome de fornecedor, valor, prazo, "vamos usar tal tecnologia").
2. A saída prescrita é o marcador de lugar com o trade-off dos dois caminhos, deixando o cliente escolher no diagnóstico.
3. Camada três, a cura profunda: levar o conhecimento do fluxo ao momento da decisão, por exemplo servindo o roteiro de diagnóstico a quem decide.
4. Camada dois, a rede: um modelo barato e rápido avalia o texto antes do commit, com tempo limite curto. Começa avisando e só passa a bloquear depois de um período de uso limpo.
5. Nova versão de uma regra existente é sintoma, não solução: consolida-se na que já existe.

## Como adotar
- Procure a regra que "não pega" em cada arquivo que o agente lê no início. Se ela não está lá, comece por aí.
- Faça um teste simples: peça ao agente algo que a viole e veja se ele a cita.
- Ordene o trabalho por alavancagem: visibilidade, conhecimento no momento certo, filtro por último.
- Registre no mesmo documento todo controle novo, para ninguém criar mais uma versão da regra.
