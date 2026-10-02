# Cada assunto tem um dono, e os demais documentos apontam para ele

## A regra em uma frase
Cada assunto tem um único arquivo dono; índices, mapas, outros repositórios e documentos derivados guardam só o que é local e um ponteiro para a fonte, nunca o valor.

## Por que existe
Copiar um valor mutável para vários lugares transforma atualização em sincronização manual sem fim, e cada cópia envelhece por conta própria. Sem um dono declarado, a mesma pergunta recebe respostas de idades diferentes: o README descreve o projeto de antes de uma mudança de direção, o registro descreve o de dois meses atrás, e a documentação central descreve o de ontem.

Exemplo: numa equipe de cinco pessoas, o índice mestre começou como uma lista curta e foi ganhando contagens, datas e estados de cada projeto. Cada projeto passou a ter dono próprio, mas o índice continuou copiando os valores. Em pouco tempo ninguém sabia qual dos três arquivos dizer "ativo" estava certo.

Quem entra por qualquer arquivo também lê só parte da cadeia de leitura. Sem uma ordem fixa, o resto é esquecido.

## O que muda na prática
- **Um assunto, um dono.** O dono declara isso nas primeiras linhas. Se dois arquivos declaram o mesmo estado, o listado no índice vence e o outro vira ponteiro, derivado ou histórico.
- **O índice roteia, não responde.** Ele diz "onde está a verdade deste assunto", nunca "qual é a resposta". Só muda quando uma fonte nasce, morre, se move, se funde ou troca de autoridade, nunca quando só um valor dentro de uma fonte muda.
- **O "agora" tem um endereço só.** O estado vigente (foco, o que está ativo ou pausado) é escrito em um documento; os demais apontam. Um retrato histórico é permitido, com banner dizendo que o documento fonte vence.
- **Contagens que apodrecem** (número de regras, de testes, de pendências) não ficam escritas à mão em texto de referência. Vêm da saída datada de um script.
- **Citações resolvem.** Toda referência "arquivo, seção" em documento fundamental aponta para um alvo que existe; uma verificação automática pode barrar a mudança quando não resolve.
- **Documentos têm tipo declarado:** fonte, roteador, derivado (diz de onde veio), retrato datado, histórico ou local. Documento sem tipo que compete com uma fonte é tratado como não autoritativo até ser reconciliado.
- **Estado de projeto mora num só lugar.** Estar numa pasta de produção ou ter commit recente não prova que o produto está ativo. Onde o estado é observável por execução, o que roda vence a afirmação escrita, exceto quando depende de decisão humana registrada.
- **Mapas derivados do disco falham de forma visível.** Se a descoberta devolver "zero repositórios", isso não apaga um registro existente.
- **Verdade compartilhada vs. local.** É compartilhado o que se declara canônico, define padrão ou contrato usado por mais de um projeto, ou é citado por dois ou mais como autoridade. Fica local: README e roadmap do projeto, decisões de implementação, configuração do próprio ambiente. Local pode especializar o central, mas não o substitui em silêncio.
- **Um bloco copiado literalmente para onde os caminhos não existem cria links mortos.** Dissemina-se a regra, não os caminhos.

### Duas aplicações frequentes
- **Uma origem, vários destinos.** Se vários clientes servem a mesma estrutura a partir de um modelo único, a mudança no modelo é publicada para todos na mesma operação. Diferem só dados, configuração e imagens; nunca layout, componentes ou versão de construção. Antes de declarar pronto, confira que todos os ativos foram atualizados, e a lista de ativos vive num só lugar.
- **Um lugar para cada tipo de template.** Cada tipo (produto, especificação, contrato, material de venda, roteiro de onboarding, scaffold de código) tem um endereço e uma convenção de nome numa tabela. Proibido: uma pasta única "templates", cópia duplicada, template substituído sem arquivamento. Template obsoleto leva no cabeçalho a marca de substituído, a data e o novo caminho. Ao criar um modelo novo, procure duplicata antes de escolher o endereço.

## Como adotar
1. Liste os assuntos do projeto e escreva qual arquivo é a fonte de cada um, num roteador único.
2. Corte do índice qualquer contagem, data ou estado e substitua por um ponteiro.
3. Em cada projeto satélite, guarde só o delta local, a versão sincronizada e o ponteiro para a fonte; remova cópias de valores vivos.
4. Declare o tipo de cada documento no cabeçalho e rode uma checagem de referências resolvíveis no fluxo de mudança.
5. Antes de criar um novo documento de regra ou template, pergunte ao roteador se já há dono.
6. Se puder, agende uma varredura periódica que abre tarefas com o que achou: o frescor fica a cargo de código, não de força de vontade.
