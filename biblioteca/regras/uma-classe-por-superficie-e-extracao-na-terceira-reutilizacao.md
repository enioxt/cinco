# Uma classe por superfície e extração na terceira reutilização

## A regra em uma frase
Cada superfície do ecossistema declara uma única classe (canônica, local, candidata a compartilhar, em conflito ou arquivo), todo deploy rastreia um commit, e código só vira pacote compartilhado depois da terceira reutilização real.

## Por que existe
Num conjunto de repositórios e serviços, duas implementações competindo pelo mesmo papel são o caminho mais curto para a divergência. Sem declaração de qual é a canônica, a recém-chegada vence por proximidade e ninguém sabe qual é a verdade. Declarar a classe acaba com a deriva na raiz e baixa o custo de replicar para cada cliente novo.

## O que muda na prática
- Cada superfície grande recebe uma de cinco classes. Se duas implementações disputam um papel, uma fica canônica e a outra vira candidata, local ou arquivo.
- Um deploy só é válido se rastreia até um commit ou a um manifesto explícito do artefato. Serviços sem origem conhecida ganham um commit, um manifesto ou um plano de aposentadoria.
- Reutilizar por extração, não por cópia. Antes disso, transplanta-se o padrão para um aplicativo que o consome. Só se cria pacote na terceira reutilização real, não na primeira cópia promissora.
- Toda candidata à extração leva três notas: dependências, prova de que roda e relevância para clientes.
- Fonte arquivada pode inspirar, mas não ultrapassa silenciosamente uma canônica ativa.
- Ferramentas, hospedagem e banco são superfícies de governança, não só detalhe de infraestrutura.
- A documentação nunca passa na frente da lista de tarefas, dos registros ou da prova de execução.
- Quando existem várias raízes de conhecimento (notas, cofre, registro de aprendizados, memória, tabelas), escolhe-se uma hierarquia única e as demais viram arquivo ou experimento.
- Um repositório periférico pode inovar, mas não pode redefinir a verdade do núcleo em silêncio.

## Como adotar
1. Faça uma tabela com todo repositório e serviço e dê a cada um uma classe.
2. Para cada serviço em produção, escreva de qual commit ele veio. Onde não houver, crie um manifesto no deploy.
3. Tenha uma matriz de extração com origem, destino, dependências, prova de maturidade e próxima ação.
4. Defina o critério de sucesso: uma pessoa nova diz, numa passada, o que é canônico e o que não é.
5. Revise a tabela sempre que um repositório for criado, fundido ou arquivado.
