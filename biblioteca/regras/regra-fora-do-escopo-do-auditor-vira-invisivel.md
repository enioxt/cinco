# Regra fora do escopo do auditor não é órfã, é invisível

## A regra em uma frase
Um auditor que compara regras com seus controles precisa descobrir as fontes de regra por conta própria, porque uma lista de fontes mantida à mão deixa de fora justamente a regra nova.

## Por que existe
Exemplo: numa revisão de regras dispersas, o limite de tamanho de código aparecia com valores diferentes em quatro lugares, e o menor, mais antigo, era o que de fato rodava. Limites de documentos tinham três fontes divergentes. Um mesmo valor padrão de concorrência estava repetido em vários arquivos, e outro teto tinha um validador que nenhum controle chamava.

O pior caso: um conjunto de regras ficou semanas em vigor sem entrada alguma no mapa de controles, enquanto o auditor seguia dizendo que não havia órfãs. O escopo da varredura morava num comentário, e o documento onde as regras estavam nunca entrou na lista. Uma regra com fonte fora do escopo não vira órfã. Vira invisível, e isso é pior, porque nem aparece como dívida.

## O que muda na prática
- Cada assunto tem um único valor. Onde existirem várias versões, a menor que roda vence sem que ninguém perceba, e por isso é preciso escolher uma.
- O auditor deve ler o disco para achar fontes de regra e comparar também no sentido inverso: do disco para o mapa, não só do mapa para o disco.
- Contagem de regras cobertas só é confiável na proporção em que o escopo da varredura esteja completo.
- Texto de regra sem controle é marcado como reflexo humano e declarado, não deixado como órfão sem nome.
- Teto que não tem responsável é uma decisão pendente: escolha primeiro onde ele mora.

## Como adotar
1. Liste todo arquivo que contém regras e compare com o escopo do auditor.
2. Substitua a lista por descoberta automática.
3. Procure o mesmo limite escrito em mais de um lugar.
4. Para cada valor divergente, registre qual vence e por quê.
