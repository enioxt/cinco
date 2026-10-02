# Interconexão e telemetria: só sobrevive o que tem leitor imediato

## A regra em uma frase
Toda ligação entre sistemas, ledger ou painel só entra se for barata, tiver um consumidor imediato e não exigir um serviço novo sempre ligado.

## Por que existe
Exemplo: numa equipe, várias encarnações da mesma ideia de interconexão (grafos, quadros de coordenação, barramentos, planos de "cérebro unificado") em poucos meses mostraram um padrão. O que respondeu a uma pergunta na hora sobreviveu: o roteador de contexto entre repositórios, a ponte de reuso, o retrato periódico do estado. Todo grafo unificado persistente e autônomo morreu sem leitor. Um grafo de referências sobrevive só quando é derivado do texto, regenerável, e tem um leitor definido. Três causas de morte: ninguém consumia, a ideia amplificava infraestrutura sem tocar o caixa, e reencarnava em vez de terminar. Consultar na hora venceu manter um grafo.

O mesmo defeito apareceu na telemetria. Exemplo: um levantamento achou registros sem leitor, vários arquivos falando direto com um canal de alerta e contornando o roteador único, e dois inventários de alertas que nunca se citaram. Achou também que "sem agendamento nesta máquina" não significa morto: a maioria das rotinas marcadas como mortas tinha quem as apontasse.

## O que muda na prática
- Antes de propor algo de interconexão, leia o histórico das tentativas anteriores.
- A parte que decide se algo está vivo é determinística. O modelo de linguagem só enriquece. Se ele cair, a detecção e a ressurreição continuam.
- Modelo de linguagem em monitoramento é chamado por lote (agrupando eventos por tempo ou quantidade), nunca por evento.
- Um fio declarado não é um fio conectado, que não é um fio disparado, que não é um fio observado. Fio desligado de propósito não é dívida.
- Cada coleta nomeia quem a lê e que decisão ela alimenta. Antes de arquivar uma rotina, levante quem aponta para ela: regras, planos, páginas públicas, outros servidores.
- Fonte única por função de medição, sem duplicar painéis ou inventários.

## Como adotar
1. Monte uma tabela: o que medimos, quem lê, que decisão alimenta.
2. Marque o que não tem leitor e decida: ligar ou desligar.
3. Registre em uma lista adiada, com gatilho, as ideias que não têm consumidor ainda.
4. Meça de novo a cada trimestre.
