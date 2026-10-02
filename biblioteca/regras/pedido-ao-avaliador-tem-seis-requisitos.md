# Todo pedido a um avaliador cumpre seis requisitos mínimos

## A regra em uma frase
Antes de pedir que um modelo, um revisor ou um painel avalie algo, o pedido traz contexto, objetivo verificável, restrições, evidência exigida, formato de saída e a indicação de onde as regras vivem, e o avaliador recusa o que vier incompleto.

## Por que existe
Quanto melhor o pedido, melhor a resposta. Um pedido como "avalie o sistema" sem dizer qual, ou "o que acha?" sem critério, devolve resposta que parece boa e não pode ser testada.

## O que muda na prática
1. **Contexto:** o que existe hoje, com caminhos e versões reais, e o estado classificado como real, conceito ou fantasma.
2. **Objetivo verificável:** a pergunta com um critério de aceite mensurável.
3. **Restrições:** zonas protegidas e o que não fazer.
4. **Evidência exigida:** que prova o avaliador deve citar em cada afirmação.
5. **Formato de saída:** estrutura exata da resposta.
6. **Ponteiro das regras:** onde elas vivem.

- Em revisão de código, a saída ranqueia achados por severidade, traz um cenário de falha concreto por achado, classifica confiança (confirmada ou plausível) e delimita escopo dentro e fora.
- **Avaliador externo sem acesso ao repositório:** as regras vão dentro do pedido, e não por link. O contexto troca caminho por estado declarado. Contagem que o avaliador consegue aferir não se declara: pede-se que ele conte, porque o número que você escreve é o número que ele repete. Avaliadores tendem a repetir o número do rodapé em vez de contar. O critério de aceite vira uma lista de condições de completude. As restrições limitam o rigor, não a conclusão, pois proibir uma resposta ancora e mata a independência.

## Como adotar
1. Use um modelo com os seis campos.
2. Faça o avaliador recusar o que vier sem eles, dizendo o que falta.
3. Permita contorno só humano e registrado.
