# Sem dado é "não medido", nunca zero nem "saudável"

## A regra em uma frase
Uma métrica sem fonte, método e prova é no máximo uma hipótese, e a ausência de dado nunca é convertida em zero, em porcentagem cheia ou em "tudo certo"; o mesmo vale para o sucesso parcial, que se relata como parcial, com o universo declarado.

## Por que existe
Dashboards verdes escondem monitores cegos. Métrica registrada não é métrica confiável, e um tempo médio sem a amostra que o gerou convence mais do que deveria.

Exemplo: uma ferramenta de propagação responde "zero arquivos atualizados" quando o fato correto é que as novidades não viajaram, porque o bloco que ela propaga vem de outro lugar. Um verificador diz "vinte em dia" e esconde que outros seis estão sem medição. Uma página de status exibe "online" para três serviços, dos quais dois não respondem. Nenhuma mentiu dentro do próprio escopo. A mentira nasce na leitura, no salto silencioso de "nada a fazer no que eu cubro" para "nada a fazer".

## O que muda na prática
- Estados que nunca são equivalentes: zero e não medido; sem evento e evento que não ocorreu; resposta OK do coletor e dado fresco; tarefa executou e fluxo terminou; teste sintético passou e integração real passou; amostra passou e universo passou; resumo criptográfico confere e conteúdo é verdadeiro.
- Existe um estado "não medido" e ele nunca é verde. Zero por ausência de dado, lido como zero por limpeza, é a forma mais barata de mentir sem querer.
- Sucesso parcial se relata como parcial: "consertou a pendência antiga e não entregou a novidade" é o relato certo, "disseminado" é falso verde.
- Toda contagem publicada carrega três números: quantos foram publicados, quantos existiam no universo e quantos passaram no filtro, com uma frase sobre o que são os demais. O critério do filtro também se declara, porque critério tem falso positivo.
- Cada métrica declara quando foi medida e a regra que a torna fresca ou obsoleta. Não existe prazo universal.
- Amostra mostra numerador e denominador, como "6 de 21 fluxos observados", nunca só a porcentagem. A pessoa precisa poder contestar a representatividade.
- O coletor declara pontos cegos. Se o ponto cego impede responder a pergunta central, o estado é coleta incompleta, não "melhor estimativa" vestida de fato.
- Mediana e faixa valem mais que média, porque tempo de trabalho tem cauda longa.
- Teste sintético escrito pela própria implementação não sustenta evidência alta sozinho. Paridade com valor real sustenta.
- Se o observador falha, o sistema continua e marca a rodada como observação degradada.
- Esse formato de erro sobrevive a verificações automáticas: elas rodam, passam e reportam verde sobre o pedaço que enxergam.

## Como adotar
1. Defina para cada métrica fonte, método, prova, incerteza e quem a revisou.
2. Use um valor explícito "não medido" no seu esquema de dados.
3. Em todo relatório de ferramenta, acrescente uma linha "universo: N olhados de M existentes, K sem medição" e mostre o denominador ao lado de qualquer porcentagem.
4. Use quatro cores no painel: verde (medido sem ressalva), amarelo (medido com ressalva escrita), vermelho (medido e ruim), cinza (não medido). Cinza nunca vira verde.
5. Antes de escrever "tudo certo", pergunte em voz alta o que a ferramenta não consegue ver, e confira a lista: critério explícito, origem, frescor, cobertura, pontos cegos, revisão humana.
