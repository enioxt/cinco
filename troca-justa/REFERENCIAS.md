# Referências e decisões de adoção

> Pesquisa de 05/10/2026. Referências externas são **insumo**, não autoridade. O Cinco adota padrões quando eles resolvem um problema observado sem violar soberania, proveniência e decisão humana.

Classificação: `ADOPT` · `ADAPT` · `DEFER` · `REJECT`.

## 1. International Cooperative Alliance — participação econômica

Fonte: https://ica.coop/en/cooperatives/cooperative-identity

O princípio de participação econômica diz, em síntese, que membros contribuem equitativamente, controlam democraticamente o capital e podem alocar excedentes para desenvolver a cooperativa, beneficiar membros em proporção às transações e apoiar atividades aprovadas pelos membros.

**ADAPT**

Útil para:

- separar igualdade humana de igualdade aritmética;
- lembrar que excedente pode ter destinos diferentes;
- decisão dos afetados sobre recurso comum;
- autonomia e independência.

Não adotado:

- estrutura jurídica de cooperativa;
- qualquer suposição de que membro do Cinco ganha automaticamente participação econômica;
- fórmula proporcional fixa.

## 2. Shapley Value — contribuição marginal em coalizões

Fontes:

- https://plato.stanford.edu/archives/spr2019/entries/economic-justice/
- https://theory.stanford.edu/~ataly/Talks/ExplainingMLModels.pdf

O valor de Shapley distribui o ganho de uma coalizão a partir da contribuição marginal média de cada participante nas diferentes ordens/coalizões possíveis.

**ADAPT como lente; REJECT como juiz automático**

Pode ajudar a perguntar:

- o que muda quando determinada contribuição entra ou sai?;
- quais capacidades eram substituíveis?;
- um participante habilitou coalizões que sem ele não funcionariam?;
- a divisão intuitiva é muito diferente de uma leitura marginal?

Limites para o Cinco:

- exige uma função de valor para cada coalizão, frequentemente não observável;
- relações humanas e conhecimento tácito não são utilidade perfeitamente transferível;
- modelagem pode fabricar precisão;
- resultado matemático não resolve autoria, risco, consentimento, amizade nem justiça distributiva por si.

Uso futuro: simulação comparativa, sempre mostrando premissas e nunca fechando pagamento.

## 3. Optimism Retro Funding — reconhecimento retroativo

Fontes:

- https://gov.optimism.io/t/retropgf-impact-profit-framework/7034
- https://gov.optimism.io/t/lessons-learned-from-two-years-of-retroactive-public-goods-funding/9239
- https://www.optimism.io/blog/retropgf-3-learnings-reflections
- https://gov.optimism.io/t/retro-funding-s7-dev-tooling-eval-algos/9709

**ADAPT**

Aprendizados relevantes:

- reconhecer impacto passado pode ser mais defensável do que prometer valor futuro;
- rodadas amplas podem virar concurso de popularidade;
- ciclos anuais são lentos para aprender;
- métricas cobrem bem o contável, mas perdem nuance;
- especialistas enxergam qualidade/contexto que métricas não capturam;
- julgamento humano sem estrutura também escala mal;
- desenho mais promissor combina métricas com humanos no loop e ciclos menores;
- o próprio mecanismo de funding precisa ser avaliado, não apenas os projetos.

Aplicação no Cinco:

- revisão pós-resultado;
- reconhecimento retroativo sem direito futuro automático;
- eval do próprio protocolo;
- domínios pequenos antes de expandir;
- especialista + evidência, não voto de popularidade.

## 4. Open Collective — transparência financeira

Fontes:

- https://documentation.opencollective.com/collectives/managing-money
- https://documentation.opencollective.com/collectives/managing-money/budgets

**ADOPT como padrão de transparência; DEFER como infraestrutura financeira**

Útil:

- separar entrada, saída, despesa e contribuição;
- ledger compreensível;
- orçamento/transações visíveis com dados privados protegidos;
- fundos/projetos separados;
- comunidade define política de gasto.

Não significa que o Cinco deva virar fiscal host ou usar Open Collective agora. Primeiro provar o recibo e o acordo; execução econômica vem depois.

## 5. SourceCred — contribution graph e seus alertas

Fontes:

- https://sourcecred.io/docs/beta/cred/
- https://sourcecred.io/docs/beta/faq/
- https://discourse.sourcecred.io/t/envisioning-the-creditor/894
- https://discourse.sourcecred.io/t/observing-the-credsperiment/1402
- https://sourcecred.io/docs/contributing/deep-then-wide/

O SourceCred construiu grafos de contribuições e pontuação dinâmica/retroativa. Também reconheceu um problema central: importar GitHub/Discord/Discourse deixa de fora contribuições off-platform e produz volume difícil de revisar humanamente.

A retrospectiva do CredSperiment relata que software de cálculo de contribuição pode alterar senso de propósito, tarefas escolhidas e relações entre participantes.

**ADAPT o grafo e a retroatividade; REJECT o score humano global**

Adotar:

- contribution graph;
- dependências entre contribuições;
- retroatividade;
- transparência de como o sistema chegou a uma conclusão;
- busca por trabalho invisível/off-platform;
- profundidade em poucas comunidades antes de escala.

Não adotar:

- `Cred` como reputação/placar de pessoas;
- PageRank social como base de remuneração;
- assumir que atividade capturada pela plataforma representa contribuição total.

O grafo do Cinco é **grafo de evidência e proveniência**, não grafo de mérito humano.

## 6. Goodhart e incentivos perversos

Fontes:

- https://ora.ox.ac.uk/objects/uuid%3Ae5fe165e-18aa-4d38-b4b3-a24287be19e1
- https://www.bsg.ox.ac.uk/blog/performance-not-theatre-three-principles-better-government-performance-measurement
- https://golab.bsg.ox.ac.uk/toolkit/technical-guidance/setting-measuring-outcomes/

**ADOPT como gate**

Quando uma medida passa a decidir recompensa, pessoas e organizações respondem ao incentivo. Isso não exige má-fé: é adaptação racional.

Regra do Cinco:

- toda métrica econômica declara possível forma de gaming;
- toda métrica importante tem contramétrica/checagem qualitativa;
- dado quantitativo e julgamento contextual convivem;
- quem é avaliado não deve ser a única fonte de prova quando houver alternativa;
- policy que “melhora o número” e piora a missão não é melhoria.

## 7. Síntese arquitetural

O benchmark converge para um desenho híbrido:

```text
grafo de proveniência (SourceCred sem score)
        +
impacto retroativo e ciclos curtos (Optimism)
        +
especialistas + métricas (Optimism / performance measurement)
        +
transparência de ledger (Open Collective)
        +
lentes marginais/coalizões (Shapley, quando útil)
        +
decisão autônoma dos afetados (princípios cooperativos)
        +
Goodhart gate
```

Nada disso produz sozinho “a divisão justa”. O produto do sistema é uma **conversa economicamente informada, auditável e revisável**, com capacidade crescente de enxergar o que antes ficava invisível.