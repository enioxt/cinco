# Agente com faixa, escopo e escalada definidos

## A regra em uma frase
Cada agente opera numa faixa declarada de caminhos e ações, quem produz não é quem aprova, e o que sai da faixa interrompe a autonomia em vez de ser resolvido sozinho.

## Por que existe
Exemplo: numa tarde de trabalho, três agentes de modelos diferentes mexem no mesmo diretório. Um deles tem papel só de aconselhar, e ainda assim alguém pode confundi-lo com autor de uma alteração. Ao mesmo tempo, uma tabela de papéis acumula identificadores de modelo que não existem no roteador, e só é corrigida depois que alguém confere a lista real. A primeira lição: escopo informal não sobrevive a vários agentes. A segunda: a trava deve acompanhar o desenvolvimento, avisando e registrando, e bloqueando apenas onde o dano não se desfaz.

## O que muda na prática
1. Cada papel tem lista do que pode e do que não pode: quem aconselha não grava, quem executa rotina não toca em área protegida, quem automatiza notificações não escreve código.
2. Fora da faixa, o agente registra um bloqueio, notifica uma pessoa por canal ativo com opções de aprovar e rejeitar, e aguarda. Sem resposta, aborta.
3. Gatilhos de escalada: ação fora do escopo, mexer em esquema de banco ou política de segurança, gasto acima de um limite por tarefa, confiança baixa na própria resposta e mudança de política estrutural.
4. Um registro único das ações de todos os agentes, com contagem de violações num período e um indicador simples de cores. O indicador torna a situação visível; quem decide o que fazer é uma pessoa.
5. Antes de abrir tarefa, procurar se ela já existe, inclusive entre as concluídas, para não duplicar trabalho.
6. Avaliar a sessão pelo processo (soube parar? evitou retrabalho? deixou a passagem de trabalho limpa?) e não só por "compilou".
7. A passagem de trabalho entre agentes leva objetivo, evidência, arquivos envolvidos e critério de aceite.

## Como adotar
- Escreva um cartão por papel com escopo, gatilho, formato de saída, limites e zonas de risco.
- Faça o registro da faixa por caminho e comece em modo de aviso, calibrando com evidência antes de bloquear. Defina os limites (gasto, confiança) conforme o seu ritmo e revise-os com os dados.
- Defina o canal de aprovação humana e teste-o com uma escalada de mentira.
