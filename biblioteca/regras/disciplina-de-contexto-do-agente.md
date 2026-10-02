# Disciplina de contexto: o agente piora porque o contexto cresce, não porque o modelo mudou

## A regra em uma frase
Carregue só o que o agente precisa agora (ferramentas, habilidades e memória sob demanda), dê uma tarefa por vez a cada agente e meça o contexto como se mede custo.

## Por que existe
Agentes degradam em silêncio à medida que o contexto incha. O registro de habilidades, a memória injetada, o histórico e os esquemas de ferramentas ocupam a janela antes de qualquer trabalho começar. Sem disciplina, o espaço que sobra para a tarefa encolhe, e a qualidade cai sem aviso. Carregar sob demanda, com teto de memória e histórico controlado, devolve a maior parte da janela ao trabalho. A ideia que sustenta o desenho é a de que agentes estreitos, chamados por um roteador, tendem a ser mais rápidos e mais confiáveis que um agente que carrega tudo.

## O que muda na prática
1. Cada agente declara os servidores de ferramentas de que precisa; nenhum carrega todos.
2. O registro de habilidades entra no prompt só como identificador e uma linha de descrição; o corpo carrega quando necessário.
3. A memória tem teto fixo de tamanho inline, e o resto vira ponteiro consultável por chave.
4. Um orquestrador não envia a um agente um pedido com duas tarefas. Se o texto contém "depois", "também faça" ou "em seguida", divide em subagentes estreitos.
5. Um observador mede o uso de contexto por turno e avisa quando se aproxima do limite, forçando um subagente novo antes de estourar.
6. Uma auditoria periódica acusa qualquer componente que cresça acima do seu valor de referência.

## Como adotar
- Meça a sobrecarga atual por componente antes de mexer em qualquer coisa.
- Comece pelos dois maiores vilões, que costumam ser o registro de habilidades e a memória injetada.
- Defina limites de aviso que caibam no seu ritmo e no tamanho da janela do seu modelo.
- Prefira compactar a reiniciar, e releia a tarefa depois de muitos turnos.
- Registre três níveis: permanente (regras), do ciclo de trabalho (tarefas) e descartável (saídas de subagentes).
