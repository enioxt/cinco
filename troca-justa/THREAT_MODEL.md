# Threat Model — Troca Justa

> Estado: **CONCEPT**. O objetivo não é assumir má-fé. Sistemas de reconhecimento mudam incentivos mesmo entre pessoas honestas. Este documento procura formas de o mecanismo produzir injustiça, coerção, vazamento ou teatro de contribuição.

## 1. Ativos que protegemos

- autonomia das pessoas;
- autoria e proveniência;
- privacidade e soberania de dados;
- liberdade para discordar;
- integridade de acordos;
- contexto humano não redutível a métrica;
- histórico e memória de contribuição;
- capacidade de sair da rede;
- confiança entre participantes;
- capacidade do sistema de aprender sem ser envenenado.

## 2. Adversários possíveis

Não são apenas “hackers”. Incluem:

- participante bem-intencionado respondendo a incentivos ruins;
- participante tentando maximizar reconhecimento;
- pessoa com mais poder social/econômico;
- agente de IA com falsa certeza;
- modelo/prompt manipulado por evidência hostil;
- integração comprometida;
- operador que publica informação demais;
- coalizão de participantes que combina narrativa;
- terceiro externo tentando falsificar autoria;
- política de autoaperfeiçoamento treinada por dados enviesados.

## 3. Falhas sociais/econômicas

### T1 — Teatro de atividade

**Ataque:** aumentar commits, mensagens, horas, reuniões ou comentários só porque o mecanismo os observa.

**Sinal:** atividade cresce sem melhora equivalente de resultado/qualidade.

**Defesa:** Goodhart gate, contramétrica, impacto separado de atividade, revisão pós-resultado.

### T2 — Viés do que deixa log

**Ataque/falha:** quem usa Git/Slack aparece; especialista verbal, trabalhador físico, mentor ou coordenador desaparece.

**Defesa:** pergunta obrigatória de invisibilidade; classes E3/E5; acessibilidade por voz/texto; ingestão nunca fecha lista sozinha.

### T3 — Ancoragem do participante dominante

**Falha:** primeira narrativa dita o mapa de contribuição.

**Defesa:** no F1 testar coleta individual antes da consolidação; registrar divergências; permitir “não sei”.

### T4 — Eloquência como proxy de valor

**Falha:** quem descreve melhor sua contribuição parece mais importante.

**Defesa:** evidência e impacto separados da narrativa; sistema ajuda todos a formular claims; revisão dos ausentes.

### T5 — Dívida moral fabricada

**Falha:** amizade, parentesco, cuidado ou ajuda histórica vira obrigação implícita.

**Defesa:** histórico pode ser reconhecido, nunca pontuado automaticamente; origem da parcela explícita; padrão sem efeito futuro.

### T6 — Captura por poder

**Falha:** chefe, cliente, pessoa com capital ou maior reputação força aceite.

**Defesa:** aceite individual; possibilidade de decisão privada; registrar ressalva; não iniciar F1 quando a liberdade de discordar for baixa; HITL/especialista externo quando necessário.

### T7 — Popularidade

**Falha:** votos/likes viram mérito ou pagamento.

**Defesa:** sem leaderboard, sem score global; corroborador deve dizer o que confirma; expertise/contexto não substituídos por aplauso.

### T8 — Coalizão/colusão

**Ataque:** pessoas combinam confirmar claims umas das outras para capturar fundo comum.

**Defesa:** fonte de recurso explícita; corroboração independente quando material; auditoria do fundo; padrões anômalos geram revisão, nunca culpa automática.

### T9 — Sybil

**Ataque:** criar identidades para multiplicar “contribuintes” ou votos.

**Defesa:** nenhuma recompensa por identidade/contagem; identidade verificável proporcional ao risco apenas quando necessária; participação econômica ligada a acordo real.

### T10 — Double counting

**Falha:** mesma contribuição é reconhecida várias vezes em resultados sobrepostos sem transparência.

**Defesa:** claim_id estável; relação de derivação/reutilização; receipt precisa dizer se reconhecimento é por criação original, reutilização ou manutenção.

### T11 — Origem infinita

**Falha:** cadeia “A ensinou B que ensinou C…” vira reivindicação eterna sobre qualquer resultado futuro.

**Defesa:** contribuição histórica precisa de ligação contextual ao resultado; reconhecimento não cria direito futuro por padrão; causalidade não presumida.

### T12 — Risco invisível

**Falha:** quem assina, garante ou mantém recebe menos atenção que quem criou o artefato inicial.

**Defesa:** lentes específicas de risco/responsabilidade/manutenção; revisão pós-entrega.

## 4. Falhas epistêmicas

### T13 — Causalidade inflada

**Falha:** “aconteceu antes” vira “causou”.

**Defesa:** taxonomia correlação/dependência/habilitação/influência/causalidade/contrafactual; hipótese marcada.

### T14 — Precisão falsa

**Falha:** algoritmo retorna 17,43% e cria aparência de justiça científica.

**Defesa:** resultados matemáticos são lentes/simulações; premissas visíveis; intervalos/alternativas; humano decide.

### T15 — Evidência circular

**Falha:** IA produz texto que depois é usado como prova de sua própria afirmação.

**Defesa:** origem primária separada; transformation receipt; modelo/prompt versionados.

### T16 — Corroboração vazia

**Falha:** “concordo” conta como evidência independente.

**Defesa:** corroboração precisa declarar qual fato/impacto confirma e a base para saber disso.

### T17 — Ausência como negativa

**Falha:** nenhum log encontrado → “não contribuiu”.

**Defesa:** ausência digital = NÃO-MEDIDO, não negativa; pergunta off-platform obrigatória.

## 5. Falhas de autoaperfeiçoamento

### T18 — Data poisoning social

**Ataque:** participantes produzem exemplos para ensinar ao sistema uma policy que os favoreça.

**Defesa:** policy não aprende de um único receipt; replay, holdout quando houver volume, crítica independente, proveniência do conjunto de treino/eval.

### T19 — Feedback loop

**Falha:** policy recomenda X → pessoas passam a fazer X → dados “provam” que X é importante.

**Defesa:** comparar períodos/policies, contrafactuais quando possíveis, procurar contribuições invisíveis, manter exploração controlada.

### T20 — Drift silencioso

**Falha:** prompt/modelo muda e resultados econômicos passam a ter outra lógica.

**Defesa:** policy/model/prompt versionados em cada transformação; changelog; replay antes de promoção.

### T21 — Otimização unilateral

**Falha:** sistema aprende a reduzir tempo de acordo, mas aumenta injustiça ou coerção.

**Defesa:** métricas multidimensionais; fricção nunca é único objetivo; contestação/estabilidade/privacidade como contramétricas.

### T22 — Autoativação

**Falha:** policy-candidate entra em produção sem corte humano.

**Defesa:** estados EXPERIMENTAL/CANDIDATE/PILOT/ADOPTED; promotion gate; dinheiro/autoria/consentimento sempre HITL.

## 6. Falhas de privacidade e segurança

### T23 — Evidência excessiva

**Falha:** para “provar” contribuição, o sistema captura conversas inteiras, clientes, documentos ou localização desnecessários.

**Defesa:** minimização; hash/reference; extração local; consentimento por fonte/finalidade.

### T24 — Publicação acidental

**Falha:** receipt privado vira perfil público.

**Defesa:** visibilidade por campo; projeção pública separada; publicação = ato explícito; egress gate.

### T25 — Prompt injection em evidência

**Ataque:** documento/mensagem contém instrução tentando manipular o agente avaliador.

**Defesa:** conteúdo é dado, não ordem; sandbox; policy fixa fora da evidência; logs de ferramentas; revisão.

### T26 — Falsificação/tampering

**Ataque:** artefato ou receipt é alterado depois do aceite.

**Defesa:** hashes, timestamps, assinatura quando necessário, versão e adendo; Proof Chain.

### T27 — Linkability

**Falha:** mesmo hash/identificador público permite correlacionar atividades privadas entre projetos.

**Defesa:** avaliar salting/commitments/context-specific IDs quando a correlação for risco; não publicar hash por reflexo.

## 7. Falhas jurídicas/organizacionais

### T28 — Classificação errada da relação

**Risco:** chamar algo de “troca justa” não muda natureza trabalhista, societária, tributária, autoral ou contratual.

**Defesa:** protocolo não substitui instrumento jurídico; quando dinheiro/obrigações materiais entram, revisão profissional adequada ao caso.

### T29 — Licença confundida com remuneração

**Falha:** MIT/cessão/licença é tratada como renúncia de reconhecimento econômico ou vice-versa.

**Defesa:** autoria, licença, propriedade e remuneração em campos/decisões diferentes.

### T30 — Fundo comum capturado

**Falha:** poucos decidem uso de recurso pertencente ao coletivo.

**Defesa:** governança explícita do fundo, ledger separado, pessoas afetadas definidas, prestação de contas.

## 8. Red Team de cada policy

Toda policy-candidate deve responder:

1. Como eu ganharia mais reconhecimento sem criar mais valor?
2. Quem este mecanismo deixa invisível?
3. Quem tem poder de definir a narrativa?
4. Que dado privado ele incentiva coletar?
5. Que comportamento aparece se todos otimizarem para esta regra?
6. Como uma coalizão exploraria a regra?
7. O que um participante tímido/offline perderia?
8. O que ocorre após seis meses de uso repetido?
9. Qual métrica ficaria bonita enquanto a missão piora?
10. Como desfazemos a policy sem apagar história?

Se essas perguntas não forem respondidas, a policy não está pronta para afetar reconhecimento econômico.