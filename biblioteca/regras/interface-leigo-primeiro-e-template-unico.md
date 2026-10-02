# Interface para leigos: frase na frente, prova a um clique, padrão único

## A regra em uma frase
A primeira linha de qualquer tela é uma frase humana, a prova técnica fica a um clique, mudar estado exige confirmação humana nomeada e todo padrão visual repetido vive uma vez só, como molde.

## Por que existe
Exemplo: o painel de um agente despeja de uma vez dezenas de linhas de estado interno: títulos de tarefa, identificadores de versão, listas repetidas. Quem decide olha aquilo e não sabe dizer se está tudo bem. Trocar o despejo por uma manchete em frase ("quantos trabalhos foram entregues, o que está sendo feito agora") e por blocos fechados com contador resolve sem esconder nada: o detalhe só foi dobrado.

Exemplo: três painéis do mesmo aplicativo nascem como blocos de estilo copiados e que divergem aos poucos. O resultado são abas que se sobrepõem, três barras de rolagem diferentes e uma consulta que continua rodando com o painel fechado. Sem molde único, cada cópia envelhece de um jeito.

## O que muda na prática
- A linha inicial vem em português corrente, com o número dentro da frase. Sigla, caminho e nome de tabela não aparecem no primeiro nível.
- Simplificar é dobrar, não apagar: o detalhe continua ali, atrás de um clique. Tabela leva a prova por coluna.
- Ler nunca pede confirmação; agir sempre pede. O botão diz o que vai acontecer, e a janela de confirmação é da própria interface, não a do navegador.
- Bloco fechado mostra o contador antes da lista.
- Molde, não cópia: gaveta, cartão, lista e barra de rolagem existem uma vez. A segunda ocorrência adota o molde.
- Dado novo do servidor passa por um estudo breve de qual padrão o veste, e a tela se constrói com tudo que ele traz.
- O que ainda não foi provado aparece apagado, com dica, e vira tarefa visível.
- A janela só muda de tamanho por ato do usuário. Abrir gaveta, trocar de cartão ou chegar mensagem nunca redimensiona: tela que muda de forma sozinha faz a pessoa perder a referência.
- Publicação com prova de frescor e conferência depois de publicar; o que vai ao ar é escolhido por lista de permissão, nunca por exclusão.

## Como adotar
1. Escolha uma tela e reescreva a primeira linha como uma frase.
2. Extraia o padrão repetido para um molde único.
3. Liste cada ação que muda estado e dê a ela um botão com nome claro.
4. Migre as demais telas quando forem tocadas, não de uma vez.
