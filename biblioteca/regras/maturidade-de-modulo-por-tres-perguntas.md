# Maturidade de um módulo: três perguntas, e valor não é tamanho de código

## A regra em uma frase
Classifique cada módulo como real, parcial ou conceito pela resposta a três perguntas, e lembre que linhas de código medem esforço de construção, não valor comercial.

## Por que existe
Exemplo: ao medir uma base de código grande, o módulo com mais linhas é infraestrutura interna que não faz sentido isolada, enquanto um módulo pequeno e testado resolve uma dor concreta, como digitar um cardápio à mão. Misturar tamanho com valor leva a vender o que impressiona nos números e a prometer o que só existe em documento. A medição também costuma revelar módulos "parciais" sem teste algum.

## O que muda na prática
- Três perguntas: consigo rodar isto agora? Existe saída verificável (arquivo, resposta HTTP, texto na tela)? Alguém além de mim usou e funcionou? Sem as duas primeiras, no máximo parcial; com a terceira, real.
- Real: roda em produção, ou tem testes de comportamento passando, ou há prova viva documentada. Parcial: há código sem teste, sem implantação ou sem prova. Conceito: só documentação ou especificação.
- Tipos: independente (funciona sozinho), composável (precisa de configuração mínima), núcleo (infraestrutura que não se vende isolada) e protocolo (expõe capacidades por MCP).
- Valor comercial depende da dor resolvida, do tempo economizado e da qualidade do comprador. Não depende de linhas.
- Quanto mais incerta a maturidade, maior o esforço de entrega: código limpo com testes é o caso mais leve; sem testes ou documentação, mais pesado; parcial, mais ainda; só especificação, o mais pesado. Declare o critério antes de estimar.
- Um módulo novo só nasce quando já existe capacidade real que funciona isolada, com README (o que faz, como instalar, exemplo, status), pelo menos um teste de ouro, interface clara e sem duplicar o que existe. Não se cria módulo para embrulhar uma biblioteca sem valor agregado, nem para código que só funciona no repositório de origem, nem para especificação sem implementação.

## Como adotar
1. Rode uma contagem por módulo: arquivos, linhas, testes, README, implantação.
2. Aplique as três perguntas e registre o status.
3. Só ofereça a clientes o que for real, e diga as ressalvas do parcial.
4. Atualize o quadro a cada ciclo.
