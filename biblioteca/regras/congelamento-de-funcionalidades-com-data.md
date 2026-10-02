# Congelamento de funcionalidades com data

## A regra em uma frase
Quando uma parte do sistema passa por refatoração estrutural, novas funcionalidades nela ficam bloqueadas até uma data declarada, e o congelamento cobre só aquela parte, nunca o repositório inteiro.

## Por que existe
A pergunta de partida é concreta: adotar congelamento como regra geral ou como ferramenta pontual de cada ciclo? Grandes projetos de código aberto usam congelamento, mas sempre atrelado a uma data de lançamento. Sem data, ele vira indefinido e serve de desculpa para procrastinar. Quem estuda refatoração costuma preferir alternativas como crescer o módulo novo ao lado do antigo, interpor uma camada de abstração ou esconder funcionalidade atrás de chaves liga-desliga, porque o congelamento tem dois riscos clássicos: vira culto, e as funcionalidades represadas viram dívida em outro lugar.

O contexto que pesa: uma pessoa e vários agentes trabalhando em paralelo, sem calendário de lançamento, com poucas tarefas abertas e algumas áreas que não podem ser mexidas. Um agente em sessão longa pode esquecer uma regra escrita, então para parte do problema só uma checagem mecânica resolve.

## O que muda na prática
- O congelamento é marcado como uma etiqueta datada na seção afetada da lista de tarefas. Permitido: correção de produção, a refatoração combinada, testes e documentação.
- Congelamento sem data, sem dizer o que a refatoração vai produzir ou aplicado ao repositório inteiro é antipadrão.
- Furar o congelamento exige registrar o motivo no commit. Etiqueta vencida e esquecida significa congelamento morto.
- Ciclo curto, trabalho em ramo isolado e protótipo descartável dispensam congelamento.
- Refatoração longa ou transversal pede a abordagem de crescer ao lado, em vez de parar.
- Se as violações se repetirem, se um colaborador externo começar a contribuir ou se o congelamento se estender além do previsto, vale investir numa checagem automática.

## Como adotar
1. Adote a etiqueta "congelado até AAAA-MM-DD" em cima da seção afetada.
2. Escreva uma linha que diga o que é permitido durante o congelamento.
3. Faça o início da sessão do agente ler a lista de tarefas e citar qualquer congelamento ativo.
4. Escolha uma data de revisão e, no dia, descongele ou renove com justificativa.
