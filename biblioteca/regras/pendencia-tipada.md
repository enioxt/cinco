# Pendência e próxima ação são objetos tipados, não texto livre

## A regra em uma frase
Quando um sistema devolve "o que falta" e "o que fazer agora", cada item é um objeto com tipo, gravidade, responsável e prazo, para que painéis, filas de aprovação e métricas consigam agrupar, decidir e contar.

## Por que existe
Listas de necessidades e próximas ações sem taxonomia nem versão viram texto solto, difícil de automatizar. Sem tipo, o painel não agrupa nem prioriza; sem tipo, a aprovação humana não decide; sem tipo, nenhuma métrica, como quantos dados faltantes por dia, é possível.

## O que muda na prática
- Cada necessidade tem um código no formato entidade, conceito e condição, um tipo de uma lista fechada, gravidade, responsável e prazo, além do valor atual e do esperado quando couber.
- Tipos da lista: dado ausente, dado inválido, regra de negócio violada, permissão exigida, dependência bloqueada, ação externa, revisão manual, consentimento pendente, limite excedido, erro de sistema.
- Gravidade em três níveis. Bloqueante impede a operação e devolve falha; recomendada executa com aviso; opcional é sugestão ignorável.
- Responsável: o próprio sistema (silencioso), administrador, gerente, atendente, cliente final ou terceiro, cada um com um canal padrão de aviso.
- Prazo em faixas (imediato, curto, diário, semanal, sem prazo), cada uma com sua escalada.
- A próxima ação também é tipada: um link, uma chamada a outra ferramenta, uma ação manual, uma espera por evento externo ou uma escalada para revisão humana, sempre ligada à necessidade que resolve.
- O esquema é versionado. Adicionar um tipo é mudança compatível; mudar o significado de uma gravidade é mudança incompatível com plano de migração.

Exemplo: ativar um produto sem foto devolve falha, com duas necessidades bloqueantes (foto e garantia), cada uma com seu responsável e uma ação ligada. Cancelar um pedido já pago funciona, mas devolve uma recomendação de estorno com prazo curto.

## Como adotar
Troque as listas de textos por objetos com esses campos, crie um catálogo de códigos e conte as ocorrências por código.
