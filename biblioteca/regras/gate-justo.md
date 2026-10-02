# O controle automático pune quem causou o problema e nunca bloqueia a correção

## A regra em uma frase
Um controle automático só pode barrar quem causou o problema e nunca a ação que o corrige, e se ele faz uma dessas duas coisas deixa de proteger e passa a treinar o contorno.

## Por que existe
Os controles mais contornados de um sistema costumam ter defeito no controle, não no operador. Três formas típicas:

- Um controle conta os arquivos sujos do diretório inteiro, incluindo os de outra pessoa trabalhando em paralelo. Como gravar o trabalho reduz o excesso, bloquear a gravação impede a própria correção, e o controle é contornado repetidamente.
- Outro cobra aprovação dupla sobre o arquivo por onde toda regra nova obrigatoriamente passa, que já tem uma checagem mais forte.
- Um terceiro pede um identificador que só existe depois de o trabalho ser gravado, enquanto o caminho certo existe e não aparece na mensagem de erro.

Quando uma regra é violada muitas vezes, quase nunca é indisciplina: ela não cabe na realidade e ninguém media o atrito.

## O que muda na prática
Três perguntas antes de ligar qualquer controle novo:

1. Quem ele barra é quem causou? Se o sinal vem de estado compartilhado, ele pune o vizinho, que não tem como consertar.
2. A ação bloqueada é a que resolve? Barrar commit por excesso de arquivos ou entrega por dívida empurra contra o próprio objetivo.
3. Ele pede algo que existe no momento em que pede? Exigir prova que só nasce depois fabrica contorno.

Uma quarta, para quem já tem controles: existe dado mais preciso disponível que o controle ignora em favor de um substituto mais frouxo? Muitas vezes o dado certo está a uma consulta de distância.

Controle que lê o arquivo inteiro em vez das linhas alteradas congela o defeito, porque bloqueia também o commit que o conserta. O legado fica de fora de propósito, e é isso que dá ao controle uma saída.

## Como adotar
1. Registre os contornos de cada controle. Se passarem de um número que você considere alto, abra uma tarefa de correção de raiz.
2. Faça o controle ler apenas as linhas adicionadas no diff.
3. Em cada mensagem de bloqueio, aponte a ação que resolve, não só o que está errado.
4. Teste que um commit que só conserta passa.
