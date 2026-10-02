# Capacidade listada que ninguém usa nem implementou sai do registro

## A regra em uma frase
Uma habilidade que aparece no catálogo sem implementação cria expectativa falsa, e o catálogo deve refletir só o que existe e tem uso, com decisão explícita para cada item parado.

## Por que existe
Exemplo: a telemetria de uso de um catálogo mostra várias habilidades sem nenhuma invocação num período de duas semanas. Duas são esboços sem código, mas aparecem no registro como se funcionassem. Uma tem nome genérico demais para ser descoberta por quem procura. Outra tem um predecessor superado coexistindo com a versão ativa, e manter as duas confunde quem tenta achar a certa. A auditoria separa os itens em manter, arquivar, refatorar e apagar, e a recomendação segue um princípio simples: o catálogo diz só o que é verdade.

## O que muda na prática
- Esboço sem implementação sai do registro até existir código; criar tarefa para implementar quando houver necessidade real.
- Habilidade com muitos subcomandos e nenhum cliente real colapsa em um arquivo único até aparecer o terceiro cliente.
- Nome genérico que ninguém descobre vira nome específico com gatilho contextual.
- A que protege contra criar projeto sem reconhecimento prévio recebe o primeiro gatilho automático, em modo de aviso.
- Predecessor superado é arquivado preservando o histórico, e o catálogo passa a apontar para a substituta.
- O arquivamento é mudança de local, não apagamento, para reverter sem custo.

## Como adotar
1. Meça o uso de cada habilidade (invocações em uma janela de tempo que faça sentido para você).
2. Classifique em manter, arquivar, refatorar ou apagar, com uma justificativa por item.
3. Remova do catálogo o que não tem implementação e registre uma tarefa com gatilho.
4. Revise periodicamente e deixe a decisão final com a pessoa responsável pelo catálogo.
