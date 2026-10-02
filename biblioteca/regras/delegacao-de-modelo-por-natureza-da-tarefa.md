# Delegação de modelo: escolha pela natureza da tarefa, não pela importância

## A regra em uma frase
O modelo mais caro decide e sintetiza, o médio executa o volume do trabalho, o barato faz o mecânico, e nenhuma tarefa sobe de modelo por parecer importante.

## Por que existe
Sem uma regra de escolha, o modelo mais forte vira o padrão de tudo. O custo se concentra nele, sobretudo na releitura de contexto em sessões longas, e boa parte do trabalho que ele faz é execução por especificação, não arquitetura. Pagar o preço de decidir para fazer o que já está decidido é desperdício.

O modelo forte compensa em lugares específicos. Na verificação factual contra código, onde o erro se vê lendo a resposta, um modelo médio costuma empatar com o forte. No julgamento de uma proposta plausível e errada, os dois podem acertar a decisão, mas só o forte tende a explicar o mecanismo do erro, e é essa precisão que muda o plano. Isso vale como hipótese a testar no seu material, não como resultado para copiar.

## O que muda na prática
1. Sessão de execução começa no modelo médio. Sobe só diante de gatilho real: decisão irreversível, diagnóstico com teorias concorrentes, falha repetida do médio.
2. Veredito binário (aprova, é defeito?) cabe ao médio. Diagnóstico que outra pessoa usará para decidir o que fazer cabe ao forte.
3. Subagente e fluxo automatizado declaram o modelo por escrito. Omitir faz herdar o modelo da sessão principal, e assim muitos subagentes rodam no modelo caro por esquecimento.
4. Um laço de trabalho coleta com modelo barato e decide uma vez, no fim, com modelo forte, porque erro de decisão se acumula a cada volta.
5. Descer de modelo exige teste comparativo mostrando que a qualidade não cai naquele tipo de tarefa. Economia sozinha não basta.

## Como adotar
- Escreva uma tabela de papéis (desenha, executa o complexo, executa o padrão, mecânico) e mantenha os nomes de modelo só nela.
- Coloque uma verificação automática na ferramenta que despacha subagentes: recusar chamada sem modelo declarado e registrar cada recusa.
- Peça ao agente forte que escreva uma vez o critério de escalada e o transforme em código, para que o modelo barato execute a régua e não a invente.
- Acompanhe periodicamente quanto do custo vem de cada modelo e quanto vem de sessões longas.
