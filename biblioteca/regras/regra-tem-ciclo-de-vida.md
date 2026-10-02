# Regra tem ciclo de vida: proposta, aceita, revogada ou substituída

## A regra em uma frase
Cada regra de governança tem estado, evidência, plano de volta atrás e decisão humana registrada, e uma regra aceita sem forma de verificação ou sem violação por muito tempo é sinalizada para revisão.

## Por que existe
Exemplo: um sistema que minera o histórico de uma equipe propõe dezenas de regras a partir de commits e incidentes. A parte útil é o formato: sem estrutura, proposta automática vira lista de desejos que ninguém decide e ninguém revoga. A parte fraca fica como aviso: parte das regras mineradas é genérica, repete o óbvio ou tem pouca confiança, e cada uma precisa carregar a estimativa do próprio falso positivo.

## O que muda na prática
- Estados claros: rascunho, proposta, aceita, rejeitada, revogada, substituída. Os três últimos são finais. Para reviver, cria-se uma nova proposta que aponta para a anterior.
- Só humano move de proposta para aceita ou rejeitada, e a razão fica escrita.
- Toda proposta traz evidência (commits e arquivos), repositórios afetados, confiança, estimativa de falso positivo, método de verificação e plano de reversão.
- Avisos automáticos: aceita sem forma de verificação (regra sem dente); confiança baixa; longo período sem nenhuma violação (candidata a revogação); regra que diz substituir outra que não existe (erro).
- O método de verificação tem cinco opções: verificação automática no commit, padrão textual, revisão humana com lista, teste comportamental ou nenhum. "Nenhum" gera aviso.
- Regras novas conferem conflito com as existentes: reforça, contradiz, substitui ou tem escopo diferente.

## Como adotar
1. Escolha onde as regras ficam, um arquivo por regra, com os campos acima.
2. Defina o fluxo de aprovação e quem decide.
3. Defina uma revisão periódica, num intervalo que caiba no seu ritmo, que lista regras sem verificação, sem violação recente ou com baixa confiança.
4. Revogue com razão escrita em vez de deixar apodrecer.
