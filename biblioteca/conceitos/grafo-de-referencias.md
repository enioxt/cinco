# Grafo de referências: um mapa derivado, separado do que acontece no sistema

**O que é:** um desenho de como representar o que existe num ecossistema de software (repositórios, serviços, agentes, pessoas, documentos) e como se ligam, com a prova de cada ligação. É um mapa de topologia mais evidência, não um registro de eventos.

## Derivado, regenerável e com leitor

O grafo de referências é **derivado**: nasce do texto e das fontes reais (documentos, configuração, registros) e pode ser apagado e gerado de novo. Não é uma fonte de verdade paralela. E só se mantém se tiver um **leitor definido**: alguém ou algum processo que de fato consulta o resultado. Um grafo unificado, persistente e autônomo, sem leitor, tende a apodrecer e deixar de ser consultado. Por isso não se propõe um "grafo canônico" persistente: a fonte canônica continua sendo o texto e os registros que o alimentam.

## Separação de responsabilidades

- o barramento de eventos diz o que aconteceu;
- o grafo diz o que existe e como se conecta, derivado das fontes;
- os documentos explicam o grafo para humanos;
- o painel é uma projeção do grafo mais a telemetria.

Misturar eventos com metadados de arquitetura numa camada só faz as duas coisas perderem sentido.

## Tipos de entidade e de relação

- **Entidades:** repositório, pessoa, documento, agente, serviço, endpoint, fila, tarefa, métrica, prova.
- **Estruturais:** pertence a, depende de, contém, expõe, emite, lê de, referencia, cita.
- **Governança:** documenta, governa, valida, deriva de, sinaliza.
- **Evidência:** observado no código, em execução, em registro ou em plano.

## Semântica de estado

| Estado | Significado |
|---|---|
| ativo | observado no código e confirmado em execução ou em registros recentes |
| degradado | existe, mas a evidência é parcial ou a conectividade é incompleta |
| fora do ar | superfície esperada que não responde agora |
| planejado | existe só em documento, tarefa ou roteiro |

## Regras de evidência

Todo nó e toda aresta carregam evidência. Uma relação só é operacional se foi observada em execução ou em registros, ou observada no código e validada por um verificador. Caso contrário, é intenção e não fato vivo.

## Antipadrões

- usar o fluxo de eventos como se fosse o grafo;
- inventar tipos de nó sem evidência de origem;
- misturar arestas planejadas com arestas de execução sem marcador de estado;
- gerar o grafo sem que ninguém o leia;
- editar o grafo à mão em vez de regenerá-lo.

## Roteiro incremental

1. **Esquema mínimo:** definir nó e aresta e gerar o primeiro grafo de um conjunto pequeno de fontes, com um leitor nomeado.
2. **Gerador:** derivar o grafo das fontes reais, de forma reprodutível: as mesmas fontes produzem o mesmo grafo.
3. **Projeção:** desenhar nós e arestas, com a diferença visível entre planejado e vivo.
4. **Verificação:** comparar o grafo gerado com as fontes e acusar deriva.

## Decisão

Tratar o grafo como mapa derivado e regenerável, com leitor definido, evidência em cada ligação e estado explícito. Nem metáfora vaga, nem despejo de eventos, nem registro paralelo.

> O barramento mostra o que se moveu. O grafo mostra o que está conectado, enquanto alguém o ler.
