# Avaliação comportamental de IA: teste que prova que o sistema faz o que diz

**O que é:** um guia de como testar um assistente de IA pelo comportamento que ele tem de ponta a ponta, e não só pelas funções que o compõem.

## Por que existe

Exemplo: numa equipe pequena, todos os testes automáticos de um chatbot estavam verdes. Ainda assim, uma função de proteção de dado pessoal nunca era chamada no caminho da conversa. Os testes verificavam a função isolada, e ela funcionava. Nenhum verificava se o chat a usava. A distância entre o que se afirma e o que acontece era invisível para todos os controles existentes. Para a versão detalhada de um caso desse tipo, ver a regra de casos de ouro comportamentais.

## O princípio

> Um teste numa função pura prova que a função funciona.
> Uma avaliação comportamental prova que o sistema se comporta como foi dito.

Toda capacidade que um sistema afirma (no manifesto, no README, na página de descrição) precisa de pelo menos uma avaliação comportamental. Sem ela, a afirmação não tem prova.

## Vocabulário

| Termo | Definição |
|---|---|
| Caso de ouro | par (entrada, comportamento esperado) rodado contra um ponto de entrada real. Não é comparação textual exata: as asserções são semânticas |
| Conjunto de ouro | coleção curada de casos que cresce conforme os defeitos aparecem |
| Avaliação comportamental | exercita o caminho real entrada-saída (uma chamada de verdade, com autenticação real) |
| Juiz-LLM | modelo que pontua saídas contra uma rubrica (fidelidade ao contexto, recusa correta, ferramenta correta) |
| Avaliação de trajetória | confere a sequência de ferramentas que o agente chamou, não só a resposta final |
| Red team | sondas adversariais (injeção de prompt, vazamento de dado pessoal, fuga de regras), rodadas em rotina agendada |
| Ciclo semanal | ritual de pegar as piores respostas reais, transformar em caso de ouro e impedir a regressão |

## Camadas de ferramentas

Qualquer combinação que cubra estas funções serve; prefira o que já existe na sua equipe a construir do zero.

| Camada | Função |
|---|---|
| Executor e casos de ouro | verificações de "deve conter", "não deve conter", expressão regular, nota customizada e trajetória esperada, com gravidade "bloqueia" ou "avisa" |
| Juiz-LLM | modelo com rubricas ("a resposta usa só o contexto recuperado") |
| Camada declarativa | casos descritos em arquivo de texto, integrados à integração contínua |
| Red team | sondas adversariais geradas e rodadas em rotina |
| Métricas de RAG | fidelidade, precisão e revocação do contexto, relevância da resposta |
| Observabilidade | captura de respostas reais para alimentar o ciclo semanal |
| Interface | automação que guia a interface real |

## As regras

### 1. Afirmou, avalie
Adicionar ou modificar uma capacidade afirmada exige alguns casos de ouro que a exercitem em execução. Cada caso deve ser desenhado para que uma implementação de fachada falhe. Se o caso passa com um código que não faz nada, ele não testa a afirmação.

### 2. Nada de fachada silenciosa em código de conformidade
Em caminho de segurança (dado pessoal, validação ética, isolamento entre clientes, limite de uso, auditoria), são proibidos:

- uma função que "varre" e sempre devolve lista vazia;
- uma função de sanitização que devolve o texto sem mudar nada;
- um validador que sempre aprova;
- um bloco que engole o erro de uma etapa de conformidade com um comentário "não fatal".

Durante uma refatoração, o aceitável é falhar alto (lançar um erro "ainda não implementado"). Em produção, o aceitável é registrar o erro e contar a falha numa métrica, nunca engolir.

### 3. Avaliação periódica em produção
Todo chatbot em produção roda o seu conjunto de ouro contra o ambiente real em rotina agendada, e não só a cada mudança. Queda de taxa entre execuções é regressão silenciosa e deve gerar alerta e tarefa com os casos que falharam.

### 4. O conjunto cresce com falhas reais
Quando alguém reporta uma resposta ruim ou a observabilidade mostra violação ética, vazamento ou lentidão:

1. copiar a entrada num novo caso;
2. afirmar o que deveria ter acontecido;
3. o caso falha em produção (é o defeito);
4. consertar;
5. o caso passa e fica como teste de regressão.

Reserve um momento curto e regular para rever as piores respostas.

### 5. Honestidade do teste
Todo caso tem gravidade: "bloqueia" (falha a integração) ou "avisa" (apenas registra, para casos que aguardam instrumentação). Se a maioria dos casos é "avisa", o conjunto não força nada. Defina antes da rodada uma proporção máxima de avisos que a equipe aceita.

## Lista de adoção por chatbot

- levar o executor para dentro do projeto;
- criar um conjunto inicial cobrindo segurança e dado pessoal, recusa, escolha de ferramenta, recuperação de contexto, conversa de vários turnos, formatação, comandos e tamanho da resposta, com mais de um caso por capacidade afirmada;
- criar um ponto de entrada de execução com autenticação própria para o avaliador;
- ligar a avaliação à integração contínua, com um limiar de aprovação definido antes da rodada (Exemplo: 80% dos casos bloqueantes) e uma rotina periódica;
- fazer a primeira execução contra o ambiente real e tratar os achados como tarefas;
- adicionar rubricas de juiz-LLM onde "deve conter" é frágil demais;
- documentar, por projeto, qual capacidade corresponde a quais casos.

## O que não fazer

1. **Não reconstruir o executor.** Estenda o que existe.
2. **Não descartar testes unitários.** São baratos. Mas não substituem a avaliação comportamental, e os que só conferem formato de interface são frágeis e não cobrem nada.
3. **Não especificar demais.** "A resposta contém 'privacidade'" falha quando o modelo recusa com "dados sensíveis". Use rubrica de juiz ou aceite uma lista de sinônimos.
4. **Não testar o modelo em si.** Teste o comportamento do seu sistema ao redor do modelo: prompts, escolha de ferramentas, recuperação, pós-processamento.
5. **Não perseguir 100%.** Com modelos de linguagem há variância natural entre execuções. Perfeccionismo gasta orçamento de juiz sem reduzir risco real.

## Melhorias possíveis

Quatro ideias para amadurecer a avaliação. São sugestões a avaliar no seu contexto, sem estado de implementação declarado aqui. Lembrete do próprio guia: marcador de "feito" não prova nada; só a execução prova.

| Melhoria | Ideia |
|---|---|
| Avaliação contrastiva | comparar duas versões na mesma tarefa, com o juiz julgando nas duas ordens para reduzir o viés de posição |
| Mitigação de viés do juiz | tratar viés de posição, de verbosidade, de autopreferência (juiz diferente do sistema avaliado) e de autoridade como requisito de desenho |
| Calibração do juiz | medir a concordância do juiz com avaliadores humanos e a estabilidade entre execuções |
| Trajetória de vários agentes | conferir ramificações, tentativas e escalonamentos, além da sequência linear |
