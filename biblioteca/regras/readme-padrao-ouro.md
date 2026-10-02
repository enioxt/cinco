# README com padrão único para todos os repositórios

## A regra em uma frase
Todo repositório tem um README no mesmo formato, em português, com versão e status no topo, um início rápido que funciona de verdade e uma regra de atualizar na mesma sessão em que a funcionalidade mudou.

## Por que existe
O README é a primeira coisa que lê quem chega: colega novo, parceiro, e agentes de IA que precisam entender o projeto antes de agir. Numa auditoria de vários repositórios, tende a acontecer o mesmo: os de nota alta seguem um roteiro comum, e os de nota baixa estão em outro idioma, sem variáveis de ambiente descritas, sem deploy ou sem arquitetura. Às vezes o nome nem corresponde ao conteúdo. README desatualizado vira desvio entre o que se diz e o que roda.

## O que muda na prática
- Idioma único. Termos técnicos consagrados ficam como estão; frases e seções vão em português.
- Cabeçalho com versão, data de atualização e status (produção, beta, alfa, pausado).
- Seções fixas: para que serve, funcionalidades, tecnologias, início rápido, variáveis de ambiente em tabela, arquitetura, deploy, dependências externas, estrutura de pastas, como contribuir, licença.
- Início rápido executável: clonar, instalar, configurar, rodar, e testado de verdade.
- Sem autopromoção sem prova. "Melhor" e "único" pedem evidência.
- Mudou a funcionalidade, o README muda na mesma sessão.
- Nota de 1 a 5 por README (1 vazio, 3 com início rápido mas sem arquitetura e deploy, 5 completo e verificado), com uma meta mínima definida por você.
- Projeto pausado também ganha README honesto que registra o status, em vez de ser esquecido.

## Como adotar
1. Escreva o molde com as seções acima e guarde em um lugar único.
2. Audite todos os repositórios com a nota de 1 a 5 e liste as lacunas.
3. Comece pelos de nota mais baixa que ainda estão ativos.
4. Ao encerrar cada sessão de trabalho, pergunte se o README mudou junto com o código.
