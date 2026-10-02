# A versão nova prova que não esqueceu o que a velha resolvia

## A regra em uma frase
Documento de consequência que ganha versão nova declara os invariantes que nenhuma versão pode perder, e só avança depois que uma checagem automática prova que eles continuam presentes.

## Por que existe
Exemplo: um contrato genérico passa por três versões em pouco tempo. A primeira contém uma cláusula essencial, repetida em mais de um ponto. A segunda, ao simplificar, a remove, e ninguém percebe, nem quem comprimiu o texto, nem a métrica de sucesso, que media forma. Um revisor externo redescobre o problema como se fosse novo. Na terceira versão, o conserto remove a cláusula em vez de realocá-la e ainda promete algo que não deveria: o conserto cria dois defeitos novos.

Nenhum controle pega isso, porque todos julgam um artefato contra uma régua. Nenhum compara a versão N com a anterior. Regressão é invisível na leitura: o texto novo está perfeito e o que sumiu não aparece.

## O que muda na prática
1. Os invariantes ficam em um manifesto ao lado do artefato. A versão só avança se a checagem confirmar que todos estão presentes. Invariante que sumiu e voltou fica registrado como regressão curada.
2. O detector se escreve lendo a versão mais antiga. Calibrado só na mais nova, ele fica cego ao vocabulário da primeira (um termo trocado por sinônimo) e devolve verde com a regressão presente. A contagem se confere com uma busca de texto independente.
3. O conserto passa pela mesma régua que o original. Diferença de conserto é a edição mais provável de regredir, porque o autor olha para o eixo reclamado.
4. Verde é relativo e se declara assim: nenhum invariante que se soube escrever regrediu, o que não equivale a nada ter regredido. Versão ilegível é "não lida", nunca limpa.
5. A checagem sai com código diferente para limpo, regressão e universo parcial, e "não consegui medir" nunca sai como sucesso.

O limite é declarado: o motor encontra só o que alguém lembrou de declarar. A revisão adversarial procura o que ninguém declarou, e as duas operam juntas.

## Como adotar
Escreva, para cada documento de consequência, as frases ou conceitos que devem constar sempre, com variações de vocabulário. Rode a busca em todas as versões, da mais antiga à mais nova, e publique a contagem por versão.
