# A decisão humana se registra com identidade, texto exato e motivo do contorno

## A regra em uma frase
Toda decisão humana de aprovar, editar ou rejeitar é gravada em um registro que só acrescenta, ligada à identidade verificável de quem decidiu e ao texto exato que foi aprovado, e todo contorno de uma validação exige motivo.

## Por que existe
Sem registro, a decisão humana some no momento em que acontece. Exemplo: numa equipe com três sistemas parecidos, um deles tinha um parâmetro que forçava a passagem por cima de um erro de validação sem deixar rastro. Outro tinha a categoria de auditoria do contorno no painel, mas nada no código a gerava. No terceiro, a decisão vivia apenas no navegador de quem usava, e a tabela de gravação nunca tinha sido criada.

Os três concordavam que a decisão humana importa, e nenhum a guardava de forma auditável e à prova de perda.

## O que muda na prática
- Cada decisão guarda quem decidiu e o papel dele naquele momento, o documento e a versão, a decisão e o texto editado, se houver.
- O texto exato aprovado entra com um resumo criptográfico. Depois é possível provar que o que saiu foi exatamente o que o humano aprovou.
- O registro só acrescenta. Corrigir uma decisão cria uma linha nova, e a vigente é a mais recente.
- O contorno carrega motivo obrigatório e uma cópia do resultado da validação, para saber quais avisos específicos foram ignorados.
- A granularidade pode ser o documento todo ou cada afirmação.
- Exportar um documento sensível gera uma marca única embutida no conteúdo e uma linha de auditoria com quem, quando e em que formato.

## Como adotar
1. Crie uma tabela de decisões sem permissão de alterar ou apagar, com acesso separado por organização.
2. Valide na aplicação que contorno sem motivo é rejeitado. Não dependa só do banco.
3. Nunca deixe a decisão só no navegador.
4. Procure em seus fluxos qualquer "forçar" ou "ignorar" sem log.
