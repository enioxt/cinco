# Número que depende do tempo não se grava; grava-se a data

## A regra em uma frase
Qualquer métrica que significa "até agora" (dias parados, idade em horas, tempo desde o evento) não deve ser persistida como número; guarde a data e calcule na leitura, e carimbe todo artefato de pipeline com a hora em que nasceu para o consumidor poder publicar a idade do que lê.

## Por que existe
Exemplo: uma coluna de "dias parados" é gravada na coleta e lida como "parado hoje". Se a coleta foi feita oito dias atrás, o número está errado em oito dias em todas as linhas. E o erro tem direção: o valor gravado é sempre menor que o real, justamente o sentido que esconde processo parado, que é o que interessa ver. Ao recalcular a partir da data guardada, a métrica volta a coincidir com a data do último movimento.

A segunda lição: ordem de execução não é prova de frescor. Horário de agendamento e dependência entre serviços dizem quando rodar, não a idade do que o consumidor está lendo. Exemplo: um produtor estoura o tempo, o consumidor publica o arquivo do dia anterior e termina com sucesso.

## O que muda na prática
- Duração e configuração fixas (garantia em dias, validade) são propriedade da coisa e podem ser gravadas. Só apodrece o que se mede contra um "agora" implícito.
- Coluna que é retrato de um instante declara isso no nome, por exemplo com sufixo de coleta.
- Cada artefato carrega a hora de nascimento dentro dele, nunca a data de modificação do arquivo, que muda com cópia e restauração.
- O consumidor publica a idade junto com o dado. Ele não aborta por dado velho, porque tela sem atualização parece "nada mudou". O que não pode é publicar velho fingindo que é novo.
- Régua que só mede quem tem o campo não mede quem o perdeu: conferir o que caiu fora do denominador.
- Contagem de linhas não prova preenchimento da coluna criada.

## Como adotar
1. Procure colunas com nomes como dias, idade, horas desde.
2. Troque por data e calcule na consulta.
3. Estampe a hora de geração em cada arquivo intermediário.
4. Mostre "atualizado há N horas" ao lado de cada número na tela.
