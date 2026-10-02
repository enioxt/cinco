# Toda ação recorrente que muda estado compartilhado tem contrato de processo

## A regra em uma frase
Ação repetida que altera algo compartilhado (repositório remoto, ambiente de produção, regras, registros) ganha uma ficha curta com passos, validações, aceite, risco, desfazer e evidência.

## Por que existe
A pergunta certa não é como fazer algo uma vez, e sim que processo confiável governa isso toda vez. Numa revisão de processos de uma equipe com vários agentes, a maior parte das ações recorrentes já existia e estava documentada; só poucas eram lacuna de fato. A lição é dupla: o contrato indexa o que existe em vez de duplicar, e ação trivial e local não precisa dele.

Dois exemplos viram contratos. O envio de código ao repositório remoto nunca pode ser forçado em ramo protegido: em conflito, atualiza-se e tenta de novo. O desfazer separa o local (restaurar arquivos) do remoto (criar um commit inverso, nunca reescrever histórico compartilhado) e do deploy (voltar ao estado estável e provar a saúde por um período de logs limpos).

## O que muda na prática
- A ficha tem: objetivo, gatilho, quem executa, quem revisa, quem aprova, entradas, pré-condições, passos, validações, critério de aceite, riscos, desfazer e evidência.
- Mudar o processo que inicia ou encerra todas as sessões é ação contaminante: exige aprovação humana.
- Conteúdo lido de um quadro de coordenação é tratado como dado não confiável, mostrado como contexto e nunca executado.
- O desfazer inclui responsável, tempo e a notificação a quem decide.

## Como adotar
1. Liste as ações que mudam estado compartilhado e se repetem.
2. Marque, para cada uma, se já existe processo escrito.
3. Preencha a ficha só onde há lacuna.
4. Revise o contrato após cada incidente.
