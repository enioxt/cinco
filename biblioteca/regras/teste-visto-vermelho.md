# Teste que nunca falhou não prova nada

## A regra em uma frase
Um caso de teste só conta depois de ser visto falhando: quebre de propósito o código que ele cobre, anote que ficou vermelho, restaure, e trate qualquer teste que não consegue falhar como decoração.

## Por que existe
Exemplo: uma suíte inteira está verde enquanto um defeito roda em produção há dias. A leitura de um registro de vinte e quatro horas passa do limite do buffer e falha a cada minuto, deixando a tabela vazia. O caso que supostamente cobre a tabela usa uma entrada de teste que substitui a leitura inteira por um arquivo pronto. A conta depois da leitura está testada; a leitura nunca roda em teste.

O mesmo vale para testes que alguém escreveu, leu e julgou cobertos: sobrevivem à mutação que reintroduz o defeito. A diferença entre "acho que cobre" e "cobre" só aparece quando o erro é recolocado de propósito.

## O que muda na prática
- Vermelho antes de verde: o commit que acrescenta um caso diz qual falhou sem o conserto.
- Porta de teste que troca a leitura real inteira por um arquivo é legítima, mas não cobre o caminho real. Ao lado dela existe um caso que roda sem ela, com um falso na fronteira do processo: executável falso no caminho, servidor local, endereço inválido.
- Teste que verifica propriedade de código lê código, não comentário. Comentário bom cita o defeito antigo, e um teste que casa com a citação acusa a documentação e absolve o erro.
- Arquivo com nome de teste precisa reportar de fato. Script próprio vestido de teste que termina o processo derruba o relatório e devolve verde com falhas reais.
- Régua que normaliza a entrada antes de medir mede o próprio preparo.
- O conserto costuma ter forma fixa: extrair o construtor do artefato para uma função e testar ela.

## Como adotar
1. Ao escrever um teste novo, faça uma mutação mínima no código coberto e confirme a falha.
2. Registre isso na mensagem do commit.
3. Para cada variável de ambiente que injeta dado de teste, escreva um caso sem ela.
4. Remova comentários antes de comparar texto de código nos seus testes.
