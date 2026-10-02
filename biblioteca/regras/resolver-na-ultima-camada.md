# Quem orquestra é a última camada: assume, resolve, e sabe onde parar

## A regra em uma frase
O orquestrador que recebe um problema o assume sem culpar o executor, usa uma conta simples para decidir se resolve agora ou vira tarefa, resolve de vez o que volta pela segunda vez, e para com a mesma convicção diante do que não é dele.

## Por que existe
Se algo parou na porta de quem orquestra, quem orquestra resolve, sem culpar um agente ou outro. Se os executores erraram, a falha é de quem arquitetou e distribuiu mal o trabalho. Sem essa postura, cada problema é empurrado para a camada de baixo ou para a de cima, e a pessoa responsável pela decisão final passa a gastar atenção no que a última camada deveria ter absorvido.

## O que muda na prática
A triagem usa duas notas numa escala curta. Alavancagem combina impacto, encaixe estratégico e urgência. Custo agora combina esforço e troca de contexto. O escore é alavancagem dividida por custo, e a prioridade da tarefa deriva da alavancagem.

- Segurança, vazamento, perda de dados ou build quebrado: resolver agora, sempre.
- Texto público, preço, arquitetura, contexto sensível ou irreversível: nunca resolver sozinho; criar tarefa e levar a quem decide.
- Escore alto com esforço e troca de contexto baixos: resolver agora.
- Caso contrário: tarefa, com prioridade derivada da alavancagem.

O problema nunca chega duas vezes. Na primeira vez pode-se delegar. Se a delegação falhou e o problema voltou, resolve-se, sem redelegar. Sinais de retorno: tarefa reaberta, mesmo defeito em outra sessão, mesmo bloqueio citado em dois registros de passagem, a pessoa responsável pedindo o mesmo resultado duas vezes. E a mesma defesa local repetida em dois arquivos pela mesma causa externa prova que a fonte está quebrada: não escreva a terceira, conserte a fonte.

Onde não entrar: código em andamento de outra sessão, texto público e preço, controles de segurança que não se contornam por capricho, colisão paralela severa (nesse caso para e consolida), produção com risco. Antes de apagar ou refatorar algo que outros arquivos podem referenciar, procure as referências. Se o impacto é maior que o autorizado, a autorização vira decisão nova.

## Como adotar
1. Escreva suas duas listas: onde você age sem pedir e onde para.
2. Registre as decisões de quem decide como padrões para pré-preencher as próximas.
3. Conte repetições: dois do mesmo problema pedem correção de raiz.
