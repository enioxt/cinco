# Protocolo mínimo de evidência e participação

> Estado: **CONCEPT**. Descreve um protocolo de registro e decisão; não define percentuais nem substitui contrato, contabilidade, obrigação legal ou acordo entre pessoas.

## 1. Unidade atômica: o claim de contribuição

O sistema não começa com “quanto cada pessoa merece?”. Começa com uma afirmação menor e verificável:

> **Pessoa/entidade X contribuiu de forma Y para resultado Z, segundo evidência/contexto E.**

Cada claim é independente. Uma mesma pessoa pode ter vários claims e um mesmo resultado pode depender de muitas pessoas.

O claim contém quatro camadas que nunca devem ser fundidas:

1. **evento/fato** — o que aconteceu;
2. **atribuição** — quem participou e em qual papel;
3. **impacto** — o que observamos ter mudado;
4. **reconhecimento** — o que os humanos decidiram fazer com isso.

Um sistema pode ter prova forte das camadas 1 e 2 e ainda não saber as camadas 3 e 4.

## 2. Tipos de contribuição

Taxonomia inicial, extensível. Um claim pode ter mais de um tipo.

| tipo | exemplos | risco de invisibilidade |
| --- | --- | --- |
| `criacao` | texto, código, desenho, método, peça, material | baixo quando há artefato |
| `execucao` | entrega, operação, implantação, atendimento | médio |
| `especialidade` | decisão técnica, jurídica, comercial, artesanal | alto quando verbal |
| `revisao` | crítica, verificação, correção, evitar erro | alto quando o erro evitado nunca acontece |
| `origem` | trouxe problema, cliente, oportunidade, ideia ou pergunta geradora | alto |
| `infraestrutura` | máquina, software, capital, espaço, ferramenta, acesso | médio |
| `ensino_mentoria` | ensinou capacidade usada no resultado | muito alto |
| `coordenacao` | organizou pessoas, sequência, dependências | alto |
| `cuidado_contexto` | confiança, mediação, memória, apoio humano que habilitou o trabalho | muito alto; nunca pontuar automaticamente |
| `risco_responsabilidade` | assinatura profissional, garantia, exposição, obrigação pós-entrega | médio/alto |
| `manutencao` | suporte, atualização, disponibilidade depois da entrega | médio |
| `historica` | contribuição antiga cujo impacto só ficou observável depois | muito alto |
| `outra` | contribuição ainda não coberta pela taxonomia | sinal para aprendizado |

A presença frequente de `outra` é um indicador de que a taxonomia está pobre.

## 3. Classes de evidência

Não usar uma única escala numérica de “confiança”. Registrar a natureza da prova.

### E0 — artefato direto

Ex.: commit, documento, arquivo, entrega, assinatura, registro de chamada, pagamento, teste, foto consentida, log operacional.

Prova que um evento ocorreu; não prova automaticamente seu valor ou causalidade.

### E1 — ação atribuível

Ex.: revisão com diff, decisão registrada, introdução documentada, pedido atendido, checklist assinado, comentário que mudou a entrega.

### E2 — corroboração independente

Outra pessoa, cliente ou fonte confirma a contribuição ou o efeito. A corroboração deve dizer **o que** confirma; “concordo” genérico vale pouco.

### E3 — declaração humana

Relato da própria pessoa ou de outra pessoa sobre contribuição que não deixou artefato. É evidência válida, mas deve permanecer identificada como declaração.

### E4 — evidência de resultado/impacto

Ex.: redução de erro/tempo/custo medida, receita, entrega aprovada, problema resolvido, reutilização posterior, cliente retornando, risco evitado com contraprova.

### E5 — evidência histórica/contextual

Relatos, materiais antigos e encadeamentos que sustentam uma contribuição prévia. É adequada para reconhecimento retroativo, mas não autoriza o sistema a calcular dívida.

## 4. Estado epistêmico do claim

- `PROVADO` — o núcleo factual do claim tem evidência direta suficiente.
- `CORROBORADO` — há confirmação independente relevante.
- `DECLARADO` — há relato identificável, ainda sem prova externa suficiente.
- `INFERIDO` — o sistema conectou evidências, mas a ligação é inferência explícita.
- `CONTESTADO` — alguém afetado apresentou objeção material.
- `NAO_MEDIDO` — não há base para afirmar o ponto.
- `SUPERADO` — claim foi substituído por adendo posterior, preservando o histórico.

Nenhum desses estados significa “merece X%”.

## 5. Proveniência mínima

Toda evidência deve carregar, quando aplicável:

- identificador estável;
- origem;
- autor/declarante;
- timestamp do evento e timestamp do registro;
- escopo/projeto/resultado relacionado;
- hash ou referência verificável do artefato;
- visibilidade (`privado`, `participantes`, `publico_sanitizado`);
- classe de dado e restrições de uso;
- versão da política que classificou o claim;
- transformação feita por IA, se houver;
- revisão humana e data;
- cadeia de adendos/contestações.

A projeção pública pode esconder a evidência bruta e mostrar apenas que a evidência existe, quando privacidade ou sigilo exigirem.

## 6. Relação entre contribuição e impacto

O sistema deve distinguir:

- **correlação temporal** — aconteceu antes/depois;
- **dependência explícita** — um artefato ou decisão usa outro;
- **habilitação** — tornou a execução possível;
- **influência** — mudou direção ou qualidade;
- **causalidade sustentada** — há evidência forte de que a contribuição produziu determinado efeito;
- **hipótese contrafactual** — “sem isto talvez o resultado fosse diferente”.

A pergunta contrafactual é útil, mas a resposta normalmente é uma hipótese. Registrar como tal evita transformar narrativa em fato.

## 7. Lentes para a conversa econômica

As lentes não geram percentual. Elas ajudam os participantes a enxergar o trabalho por mais de um ângulo.

1. **criação/execução** — o que foi produzido;
2. **expertise/julgamento** — decisões que exigiram conhecimento;
3. **alavancagem** — contribuição pequena em esforço que mudou muito o resultado;
4. **origem/habilitação** — oportunidade, acesso, ferramenta, ensino ou infraestrutura;
5. **raridade/substituibilidade** — quão difícil era substituir aquela capacidade naquele contexto;
6. **risco/responsabilidade** — quem assumiu consequência real;
7. **persistência/reutilização** — o quanto a contribuição continua gerando valor;
8. **manutenção** — obrigação após a entrega;
9. **contribuição histórica** — impacto de algo feito anteriormente que só agora ficou visível;
10. **trabalho invisível** — coordenação, cuidado, mediação e contexto não capturados por logs.

`raridade` e `trabalho invisível` exigem especial cautela para não virarem justificativa subjetiva conveniente.

## 8. Fluxo do recibo

### A. Abrir o resultado

Definir o resultado concreto que está sendo reconhecido. Um recibo não pode abranger “toda nossa amizade” ou “tudo que fizemos juntos”. Precisa de fronteira.

### B. Coletar claims

O sistema importa o que conseguir e pergunta o que está faltando. Fontes possíveis: Git, documentos, tarefas, reuniões, mensagens consentidas, agenda, pagamentos, entregas, revisões e declaração humana.

### C. Procurar ausentes

Antes de propor divisão, perguntar explicitamente:

- alguém ajudou e não aparece nos logs?
- houve ensino/mentoria anterior usado aqui?
- alguém evitou um erro ou assumiu responsabilidade?
- houve introdução/oportunidade essencial?
- existe trabalho pós-entrega ainda não contado?
- existe contribuição histórica que algum participante deseja reconhecer?

### D. Contraditório

Cada participante pode:

- aceitar o próprio claim;
- corrigir descrição;
- adicionar evidência;
- contestar claim próprio ou alheio;
- apontar pessoa ausente;
- dizer “não sei”.

O sistema não decide disputa. Ele organiza os pontos em conflito.

### E. Propostas

A IA pode apresentar **mais de uma** hipótese de reconhecimento, sempre explicando o raciocínio e as lacunas. Formas possíveis:

- crédito/autoria;
- agradecimento/atribuição pública consentida;
- valor fixo;
- percentual daquele resultado;
- royalty/reutilização por acordo próprio;
- participação apenas em uma fase;
- contribuição ao fundo comum;
- reconhecimento futuro condicionado;
- nenhuma transferência financeira, por escolha explícita.

Quando dinheiro estiver envolvido, o acordo deve dizer sobre qual base incide (receita, margem, valor recebido, parcela própria etc.). Sem base definida, percentual é inválido.

### F. Aceite

Aceite deve ser individual e ligado à versão exata do recibo. Silêncio não é aceite. Um agente nunca marca em nome da pessoa.

### G. Fechamento e revisão

Depois da entrega, abrir revisão curta: “sabendo o resultado agora, você manteria este reconhecimento?”. Mudança gera **adendo**, não edição silenciosa.

## 9. Reconhecimento retroativo

Um reconhecimento retroativo precisa declarar:

- qual resultado atual motivou a revisão;
- qual contribuição passada está sendo lembrada;
- qual evidência existe e qual parte é memória/interpretação;
- quem propôs o reconhecimento;
- de qual parcela ou fundo ele sai;
- se cria ou não qualquer efeito futuro (padrão: **não cria**);
- quem foi afetado e aceitou.

Uma pessoa pode oferecer parte da própria parcela livremente. Usar parcela alheia ou recurso comum exige aceite de quem perde disponibilidade econômica.

## 10. Privacidade e revogação

O sistema guarda o mínimo necessário. Uma evidência pode ser substituída na projeção por hash/referência e ficar no cofre do dono.

Revogar compartilhamento futuro não apaga automaticamente a existência histórica de um acordo já executado; essa tensão precisa seguir regras jurídicas e contratuais adequadas. O sistema deve distinguir **revogar exposição** de **apagar fato histórico**.

## 11. O que o protocolo mede sobre si mesmo

Nunca medir “quem é mais valioso”. Medir se o mecanismo funciona:

- cobertura de evidências relevantes;
- quantidade de contribuições adicionadas só depois da pergunta “quem ficou invisível?”;
- claims contestados e motivo;
- tempo/fricção para chegar a acordo;
- porcentagem de recibos alterados na revisão pós-resultado;
- campos ignorados ou confusos;
- sugestões da IA aceitas, editadas ou rejeitadas;
- categorias `outra` recorrentes;
- casos em que a métrica induziu comportamento artificial;
- satisfação opcional dos participantes com **o processo**, nunca uma nota da pessoa.

Esses sinais alimentam [`EVALS.md`](EVALS.md), não uma carteira de reputação.

## 12. Invariantes

Mesmo que o sistema aprenda muito, estes pontos não podem mudar sem decisão constitucional explícita:

- pessoa não vira score;
- consentimento não é inferido;
- acordo econômico não é reescrito automaticamente;
- evidência e julgamento permanecem separados;
- contribuição invisível pode ser declarada e examinada;
- dados privados não precisam sair da máquina para que a contribuição seja reconhecida;
- toda recomendação econômica é explicável e contestável;
- política nova preserva versão anterior e permite rollback.