# Código que ninguém chama está por provar, não está certo

## A regra em uma frase
Capacidade sem chamador é inerte, não correta: antes de contá-la como existente, prove que ela executou, com efeito observável fora do processo.

## Por que existe
O modo de falha é que o defeito e o acerto produzem o mesmo silêncio. Esse tipo de problema não é pego por teste, monitor ou revisão, e só aparece quando alguém tenta usar. Exemplos de como ele se apresenta:

- uma defesa procura um texto que não existe em nenhuma instalação, então a condição nunca é verdadeira e a proteção nunca age;
- uma telemetria de detecção de dados pessoais tem defeitos empilhados e a tabela quase nunca recebe linhas;
- um registro de acesso a fonte sensível, documentado como conformidade, não tem nenhum chamador;
- uma gravação engole o erro e corrompe o arquivo, parada sem ninguém notar;
- um valor padrão de variável de ambiente que não pode ser verdadeiro, com erro de autorização repetido todo dia.

Há também o cálculo órfão: o campo é calculado certo, gravado, e nenhuma tela o lê. Nada está quebrado, só desligado.

## O que muda na prática
- "Pronto" exige responder quem chama isso. Se ninguém, está escrito, não pronto.
- A prova é executar e observar o efeito: linha no banco, arquivo no disco, mensagem entregue. Ausência de exceção não vale.
- Toda capacidade nova declara seu consumidor junto com o cálculo, e o teste confere o campo no ponto de entrega, não só na função.
- Uma proteção nova só vale com um teste que falha contra a versão sem ela e reproduz o ataque que ela diz impedir. Metade dos casos cobre o que a proteção não deve acusar.
- Ao consertar um defeito, pergunte em quantos outros lugares ele existe.

## Como adotar
1. Para cada capacidade que você declara, escreva o nome do chamador e o efeito externo esperado.
2. Crie um teste de classe: uma lista dos campos que o motor produz e uma asserção de que todos chegam ao resultado entregue.
3. Rode a proteção nova contra a versão antiga e guarde a falha como evidência.
4. Procure o mesmo padrão com busca por sintoma, não pelo nome do arquivo consertado.
