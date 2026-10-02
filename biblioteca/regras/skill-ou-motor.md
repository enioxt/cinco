# Skill ou motor: escolha pela pergunta "o erro se vê?"

## A regra em uma frase
Antes de escolher o formato de uma automação com IA, pergunte se o erro aparece para quem lê a saída: se aparece, use instrução para o modelo (skill) com um humano de rede; se não aparece, use código determinístico com teste (motor).

## Por que existe
Exemplo: uma equipe com muitos comandos, skills, descrições de agente e scripts descobriu que alguns nomes existiam ao mesmo tempo como comando e como skill. Nome duplicado era sintoma de outra coisa: sem definição, a escolha do formato virava gosto, e a mesma capacidade nascia duas vezes em formatos que não se substituem.

O critério que resolveu é uma pergunta só. Redação, argumento e tom são coisas em que o erro se vê lendo, e o modelo faz bem. Prazo, soma, contagem e conferência de citação são coisas em que a saída errada é indistinguível da certa, e aí o modelo erra em silêncio.

Há um falso visível que a revisão adversarial apontou: resumo e triagem parecem texto, mas o erro típico deles é omissão, e omissão não se enxerga lendo o que sobrou.

## O que muda na prática
- Número, veredito e nota saem de um motor: função pura, versionada, com pelo menos três casos de teste, um deles embaralhando a ordem da entrada.
- Texto que um humano revisa sai de uma skill, com descrição que diz quando usar e quando não usar.
- Script executa e termina. Se a saída dele vira prova ou entra em decisão, ele já é um motor e precisa de teste.
- Uma verificação automática impede algo de acontecer. Só conta como tal se a entrada proibida sai com erro e a entrada limpa sai sem erro.
- Orquestração de vários agentes só entra com critério de parada que não seja o próprio modelo.
- A composição que costuma acertar: motor na entrada verificável, skill no miolo criativo, motor na saída verificável, humano no aceite.

## Como adotar
1. Liste o que você já tem de automação e coloque cada item em uma linha: o erro dele se vê lendo?
2. Onde a resposta for "não", mova a conta para código simples com teste e deixe a skill chamar esse código.
3. Para resumo e triagem, adicione um conferidor de cobertura que verifica a presença do que não pode faltar.
4. Escreva ao lado de cada skill o que ela nunca faz.
5. Se um nome existe em dois formatos, escreva nos dois a diferença ou renomeie um deles.
6. Na dúvida entre os dois, pergunte se você precisará provar o resultado a um terceiro depois. Se sim, é motor.
