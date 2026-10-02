# Uma tela, um trabalho, e portão antes de publicar

## A regra em uma frase
Cada tela principal tem um único trabalho dominante, dito em uma frase, e toda tela pública passa por perguntas de publicação e por um exercício de falha antes de ir ao ar.

## Por que existe
Exemplo: uma página de visualização de um sistema fica confusa por semanas porque tenta ser três coisas ao mesmo tempo: mapa de conexões, fluxo de eventos ao vivo e chat de vendas. Nem quem a construiu consegue explicar para que serve. O conserto é dividir.

Exemplo: a primeira versão de uma tela chama de "grafo" o que é um conjunto de cartões com contadores, e o fluxo fica invisível.

Exemplo: um texto-modelo distribuível quase é publicado depois de uma única passada interna. Basta rodá-lo em outra IA para voltarem melhorias evidentes. Uma passada só não basta para o primeiro artefato de qualquer tipo.

## O que muda na prática
- Teste de cinco segundos: um estranho olha e diz o que a tela faz. Se lista três coisas ou hesita, divida.
- Antes de implementar, preencha um contrato curto: tela, trabalho principal, usuário, ação, estado inicial, estado de sucesso e o que ela NÃO faz.
- Modos concorrentes (mapa, chat, fluxo, venda, onboarding, edição pesada) não dividem a área central. O secundário vai para painel lateral, aba ou página própria.
- Em tela que mostra sistema vivo, a ordem é: estrutura, conexões desenhadas como linha (não contador), estado de cada nó, pulso da atividade real.
- Portão de publicação, por escrito: trabalho principal, o que compete com ele, entendimento em cinco segundos, se prova valor ou confunde, captura de tela de desktop e celular, celular testado.
- Exercício de falha: como pode ser mal interpretada, o que parece promessa vazia, o que é bonito e inútil.
- Artefato público, sobretudo o primeiro do tipo, passa por revisão de mais de um olhar, incluindo ao menos uma IA externa, até ela não achar melhoria material.
- Texto público aprovado mas ainda não liberado não fica solto na pasta de trabalho compartilhada: um commit amplo feito por outra sessão publicaria sem o portão.

## Como adotar
1. Cole o contrato de tela no pedido de qualquer tela nova.
2. Faça o teste de cinco segundos com alguém de fora.
3. Transforme o portão em lista que o deploy exige confirmar.
4. Guarde rascunho de texto público em ramo separado até a liberação.
