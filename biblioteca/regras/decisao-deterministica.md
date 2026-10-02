# Quem emite veredito é código que se lê; o modelo só propõe a entrada

## A regra em uma frase
Toda capacidade que emite veredito, nota ou classificação usada para decidir calcula a saída com uma função pura e versionada, e o modelo de linguagem entra antes, para interpretar a fala livre, nunca no lugar de quem converte nota em veredito.

## Por que existe
Um produto que promete uma inteligência que "lê" a pessoa pode ser testado de fora com dois experimentos simples. Se duas sessões com respostas idênticas devolvem saída idêntica, byte a byte, nenhum modelo está no caminho da decisão. Se trocar a resposta de texto livre por palavras aleatórias não muda a leitura, aquela resposta nunca era lida.

A lição vale para qualquer sistema. A parte que decide deve ser determinística, e a diferença sustentável não é ter um modelo maior, é dizer isso, versionar e testar. Sem isso, o mesmo caso recebe vereditos diferentes em dias diferentes e ninguém consegue explicar por quê.

## O que muda na prática
- A decisão é função pura: sem rede, sem relógio, sem sorteio. A mesma entrada dá a mesma saída hoje e daqui a um ano, e existe um teste que prova isso.
- O modelo interpreta fala livre, propõe a nota e recorta a citação. Quem transforma nota em veredito é código que qualquer pessoa pode ler.
- A saída carrega a versão do motor. Sem isso, um veredito antigo é irreproduzível e não sustenta contrato nem defesa.
- A ordem da entrada não pode alterar o resultado. Um teste que embaralha a entrada acusa estado escondido.
- Toda pergunta feita ao usuário tem destino declarado: entra no cálculo, vira evidência citada, ou não se faz. Se a informação só será lida depois, diga isso na hora.

## Como adotar
1. Marque, no seu sistema, tudo que emite nota, score ou classificação.
2. Separe o trecho em que o modelo interpreta do trecho em que a nota vira veredito, e coloque o segundo em código.
3. Escreva um teste de pureza (duas execuções iguais) e um de ordem embaralhada.
4. Grave a versão do motor em cada saída.
5. Revise seus formulários: para cada pergunta, aponte onde a resposta é usada. Pergunta sem uso sai.
