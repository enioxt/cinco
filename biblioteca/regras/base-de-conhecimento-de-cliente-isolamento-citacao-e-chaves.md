# Base de conhecimento de cliente: isolamento, citação e chaves

## A regra em uma frase
Uma base de conhecimento com IA operada para cliente isola na medida do risco dos dados, responde só com base nos documentos e cita a fonte, trata documento ingerido como possível ataque, guarda registro imutável e dá prazo de validade às chaves.

## Por que existe
A ideia é que a empresa passe a conversar com a própria memória, com o cliente no controle de quem vê o quê. Exemplo de erros que uma revisão adversarial costuma encontrar numa primeira versão: supor que o papel de gerente da ferramenta enxerga só os espaços de trabalho atribuídos, quando na prática tem visibilidade ampla; e achar que o registro operacional basta como prova perante a lei, quando ele pode ser alterado.

## O que muda na prática
- O isolamento depende da sensibilidade, não do custo. Dado sob sigilo, pessoal ou regulado pede uma instância dedicada por cliente; uso de baixo risco (catálogo, perguntas frequentes) tolera instância compartilhada com espaços estritamente separados.
- Cada espaço de trabalho de cliente nasce em modo de consulta, que só responde quando há correspondência nos documentos, com uma resposta de recusa própria e um prompt que obriga a citar a fonte.
- Modo de consulta não elimina injeção de instruções por documento envenenado. Defesa em camadas: lista de fontes aceitas, classificação obrigatória no envio (público, interno, sensível), varredura de vírus e limpeza de metadados, regra no prompt para reportar documento que tente dar ordens, e um teste adversarial antes de entrar no ar.
- O registro operacional é espelhado para um armazenamento imutável, com retenção definida junto ao cliente, relógio sincronizado e identificador de requisição ponta a ponta. Mensagens de chat têm retenção padrão curta e declarada.
- Token sozinho não basta. Entra uma segunda camada de rede (certificado mútuo ou lista de origens permitidas) e as chaves têm validade, registro de último uso, revogação automática por inatividade e aviso antes da revogação.
- O cliente pode trocar de provedor de modelo sem perder nada, e a manutenção remota é gravada.

## Como adotar
1. Classifique o cliente por sensibilidade antes de escolher a arquitetura.
2. Configure o modo de consulta, a mensagem de recusa e o prompt com a regra da citação.
3. Escreva a lista de fontes aceitas e a classificação por documento.
4. Duplique os registros para um destino imutável e agende a revogação de chaves.
5. Rode um teste com documentos que contenham instruções maliciosas.
