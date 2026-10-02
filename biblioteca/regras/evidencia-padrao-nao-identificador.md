# Na evidência entregue vai o padrão, nunca o identificador

## A regra em uma frase
Evidência que sai do rascunho e entra em artefato entregue registra o padrão observado, e o identificador (nome, valor, caminho de cliente) fica no rascunho, com prazo de descarte escrito.

## Por que existe
Um método de diagnóstico de empresas pode esbarrar numa colisão entre duas regras que estão certas isoladamente. O método exige uma linha de evidência por dimensão, o que a pessoa disse, senão a nota é chute. E a proteção de dados exige dado pessoal mascarado por padrão. Quando a fala do entrevistado traz nome de cliente, valor de contrato ou número de processo, a anotação da entrevista vira dado sensível de terceiro, e nenhuma linha diz o que fazer.

Há um segundo ponto. Quando a dimensão avaliada é a cultura da própria empresa, devolver a citação literal à liderança é o ponto de maior risco de ruptura de confiança do documento inteiro. Ali se usa paráfrase de comportamento observado, e a citação fica no rascunho.

## O que muda na prática
- "Valor de contrato visível a todo mundo da equipe" entra. "O contrato da fulana, tantos mil reais" não entra.
- "Planilha crítica sem responsável declarado" entra. O caminho do arquivo com o nome do cliente não entra.
- O identificador pode existir no rascunho de trabalho, com prazo de descarte. No que é entregue, assinado ou versionado, entra o padrão.
- Vale para diagnóstico, dossiê, relatório, ficha de capacidade e mensagem de commit.
- Um detector automático de dados pessoais é a rede de segurança, não a defesa: ele pega CPF e telefone, não pega "o contrato da fulana".

## Como adotar
1. Separe duas pastas ou duas seções: rascunho (com identificadores e data de descarte) e entregável (só padrões).
2. Ao copiar uma evidência do rascunho, reescreva-a em uma frase que descreva o comportamento, sem nomes, valores e caminhos.
3. Releia o entregável procurando qualquer coisa que permita identificar uma pessoa ou cliente.
4. Descarte o rascunho na data combinada.
