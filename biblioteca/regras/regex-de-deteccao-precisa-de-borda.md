# Expressão de detecção sem borda mente sobre o que achou

## A regra em uma frase
Expressão regular que detecta dado pessoal ou segredo, com todos os separadores opcionais, casa com qualquer sequência de dígitos, inclusive dentro de um número maior, e ainda dá o rótulo errado ao achado; por isso cada tipo precisa de duas expressões e de borda explícita.

## Por que existe
Os erros se repetem em padrões conhecidos. Uma expressão de documento de identidade casa com o número de uma lei. Um CNPJ sem pontuação é lido como CPF nos onze primeiros dígitos. Um identificador interno bloqueia commit legítimo. Uma máscara de CPF devora identificadores de documentos judiciais. Um exemplo dentro de comentário é lido como uso real. Quando o mesmo erro reaparece em código novo, não é herança: é reflexo, e por isso vira regra e não conserto pontual.

Barrar o legítimo incomoda. Pior é errar e ainda mentir sobre o que achou.

## O que muda na prática
- Duas expressões por tipo: a de formato com pontuação obrigatória, que bloqueia sempre, e a de formato sem pontuação, que exige borda não numérica dos dois lados.
- O identificador mais longo é consumido do texto antes de procurar os mais curtos, senão o mesmo número reaparece sob outro rótulo.
- Comentário e exemplo não contam como uso. Texto citado não é texto afirmado.
- Cada expressão nova é testada contra números de tamanho parecido, que não deveriam casar.

## Como adotar
1. Para cada padrão de dado sensível, escreva a variante pontuada e a variante crua com bordas.
2. Monte uma lista de falsos positivos conhecidos, como números de leis, identificadores de processo e códigos internos, e use-a como teste negativo.
3. Ordene a busca do identificador mais longo para o mais curto e remova o que já foi reconhecido.
4. Revise comentários e exemplos separadamente.
