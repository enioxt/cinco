# Se o controle exige um arquivo derivado, ele nasce com quem o produz

## A regra em uma frase
Todo controle que exige a existência de um artefato derivado (a versão HTML de um texto, um índice gerado, um instantâneo de uma fonte) só está completo quando existe, no mesmo repositório, o motor determinístico que o produz.

## Por que existe
Imagine um controle que avisa quando um documento de leitura humana não tem a versão HTML correspondente. Se uma varredura por conversores de markdown e dependências do tipo não acha nenhum, cada par está sendo escrito à mão por um agente. O custo é dobrado: tokens caros e resultado irreprodutível, porque dois agentes produzem dois HTMLs diferentes do mesmo texto e nenhum é o certo.

Controle sem gerador não elimina o trabalho. Ele o transfere à pessoa ou ao modelo e cobra a conta toda vez.

## O que muda na prática
- Ao escrever um controle que exige derivado, a primeira pergunta é quem gera. Se a resposta é "o agente escreve", o controle está pela metade e isso é declarado.
- A conversão mecânica é motor, nunca habilidade de modelo: o erro se vê lendo a saída, então vale determinismo e teste. O modelo continua dono do texto, e a forma é do motor.
- O motor adota a forma já aprovada, extraindo o estilo do artefato que a pessoa aceitou, e não inventa outra.
- O gerador carrega uma checagem de frescor: derivado mais velho que a fonte é recusado. HTML velho abre igual a HTML novo, e a primeira varredura costuma achar pares podres que ninguém tinha visto.
- Um controle que não barra e outro que barra sem ajudar custam confiança por lados opostos.

## Como adotar
1. Liste os artefatos derivados que algum controle seu exige.
2. Para cada um, aponte o comando que o gera. Sem comando, abra uma tarefa de criação do gerador.
3. Extraia o estilo do melhor exemplo existente em vez de projetar um novo.
4. Inclua testes de segurança (texto com HTML hostil deve sair escapado) e de reprodutibilidade.
5. Adicione uma opção de verificação que compara datas e falha se o derivado estiver velho.
