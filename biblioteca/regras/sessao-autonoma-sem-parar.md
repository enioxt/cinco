# Sessão autônoma: trocar de tarefa ao bater no humano, nunca parar

## A regra em uma frase
Quando o humano autoriza trabalho sem interrupção, o agente levanta antes quais tarefas fecham sozinhas, agenda o próprio retorno, troca de tarefa ao bater em bloqueio humano e nunca assume o que só uma pessoa pode fazer.

## Por que existe
Exemplo: à noite, uma pessoa disse "avance em tudo que não exija minha decisão" e foi dormir. O agente trabalhou algumas horas, escreveu um resumo e parou. Na manhã seguinte veio a pergunta: você tinha formas de se manter ativo e não usou, o que faltou?

Faltaram duas coisas, ambas do agente. Mecânica: o turno termina quando a última mensagem não chama ferramenta, e não existe estado "continuar"; enquanto havia trabalho em segundo plano a sessão se sustentou, e quando a fila esvaziou ela morreu. Estrutural: para escolher a próxima tarefa sozinho é preciso saber antes quais fecham sem o humano, e quase nenhuma das tarefas de maior prioridade estava marcada como dependente de humano, embora a maioria dependesse.

## O que muda na prática
1. Antes de começar, levantar a fila classificada em autônoma, dependente de humano e externa. Na dúvida, a classificação é "dependente": errar pedindo permissão custa uma pergunta, errar para o outro lado custa um ato irreversível.
2. Agendar o próprio retorno a cada ciclo, com a mesma instrução, até o humano mandar parar. Cadência longa quando há trabalho em segundo plano que já reinvoca; curta só quando se espera estado externo.
3. Ao bater em bloqueio humano, registrar o bloqueio na tarefa e trocar de tarefa, de preferência da mesma área.
4. Respeitar o escopo declarado: "foco neste projeto" exclui tarefa fácil de outro projeto.
5. Publicar, enviar, assinar, gastar, pôr em produção e mudar regras fundamentais continuam exigindo a pessoa, mesmo em sessão autorizada.

O marcador de bloqueio tem vocabulário aberto: qualquer motivo escrito bloqueia, e o motivo só diz quem destrava. Existe também a tarefa mista, "autônoma até tal ponto, que para na parede tal", que fica na fila.

## Como adotar
1. Marque cada tarefa com seu bloqueio no momento em que a escreve.
2. Peça ao agente a lista de tarefas autônomas antes de uma sessão longa.
3. Escreva a lista do que nunca é autônomo.
