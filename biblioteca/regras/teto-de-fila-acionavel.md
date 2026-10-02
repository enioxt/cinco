# O teto da fila mede o que o sistema pode atacar, e a idade mede o que espera pelo humano

## A regra em uma frase
Teto de prioridade força redução e não só barra adição: acima do teto, consertar é livre e adicionar não, o teto vale sobre o estoque que um agente consegue atacar, e a pressão sobre o que está parado no humano é a idade, não a contagem.

## Por que existe
Exemplo: uma curadoria manual reduz a fila de máxima prioridade, e semanas depois o estoque voltou a ser várias vezes o teto, sem nenhum commit barrado. O controle só disparava quando um commit adicionava um item; estoque parado acima do teto era invisível, e a curadoria era um evento único sem mecanismo de repetir.

Ao investigar por que a fila não baixava, descobre-se que boa parte dos itens espera uma decisão de uma pessoa ou de terceiros. Uma fila em que a maioria está travada no humano não está inflada: é um gargalo retratado com precisão. Cortar essas linhas não destrava nada, apenas apaga o retrato, e pune quem documenta a parede com honestidade.

## O que muda na prática
- Acima do teto, o controle avisa e nomeia os itens que um agente fecha sozinho, porque apontar o caminho de volta vale mais que negar.
- Acima do teto por muito tempo sem nenhuma redução, o controle passa a barrar commit que adiciona tarefa nova. Fechar, rebaixar, corrigir e migrar continuam passando.
- Bloquear tudo enquanto existir dívida a transforma em refém, e o controle é desligado na primeira fricção.
- O teto mede o acionável. Tarefas dependentes de humano ficam em balde próprio, ordenado por idade. Contagem puniria quem tem muitas coisas legítimas; idade pune o esquecimento.
- Compare tarefas por identificador, não por linhas do diff: editar uma linha aparece como remoção e adição, e consertar seria barrado.

## Como adotar
1. Separe sua fila em acionável e esperando humano.
2. Aplique o teto ao acionável, escolhendo um valor que caiba no seu ritmo.
3. Mostre para cada item esperando humano há quantos dias ele está parado.
4. Meça a janela de tempo contra o histórico do próprio arquivo, não contra estado paralelo.
