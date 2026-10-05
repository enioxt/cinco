# Roadmap — troca justa

> Roadmap por **gates de prova**, não por calendário. Avançar porque o ciclo anterior produziu evidência; não porque “chegou a data”. Estado geral em 05/10/2026: **CONCEPT**.

## Norte

Construir uma infraestrutura em que pessoas consigam colaborar, preservar autoria/proveniência, reconhecer contribuições visíveis e invisíveis, negociar participação com autonomia e melhorar o próprio mecanismo a partir do uso — sem converter relações humanas em score, sem captura automática de valor e sem IA decisora econômica.

## F0 — Doutrina e fronteiras

**Estado nesta branch:** DOCUMENTADO / aguardando revisão.

Entregáveis:

- visão humana `TROCA_JUSTA.md`;
- protocolo de claim/evidência;
- invariantes;
- schema legível por máquina;
- fixture sintética;
- evals e Goodhart gate;
- roadmap.

Gate F0 → F1:

- participantes conseguem explicar a diferença entre evidência, impacto e reconhecimento;
- fica claro que pertencimento ao grupo não cria participação automática;
- fica claro que contribuição histórica pode ser reconhecida sem gerar dívida algorítmica;
- nenhuma regra exige score de pessoa.

## F1 — Primeiro recibo manual real

**Objetivo:** provar utilidade antes de software.

Escopo:

- 1 trabalho real;
- 2 ou 3 participantes;
- 1 resultado concreto;
- formulário/arquivo simples;
- coleta manual de claims e evidências;
- contraditório;
- acordo humano;
- revisão pós-resultado.

Não construir dashboard, token, blockchain, marketplace nem algoritmo de divisão.

Medir:

- tempo gasto no recibo;
- pessoas/contribuições esquecidas na primeira rodada;
- campos inúteis/confusos;
- claims contestados;
- se o recibo melhorou a conversa ou a burocratizou;
- se depois do resultado alguém mudaria a decisão.

Gate F1 → F2:

- pelo menos 1 recibo completo fechado por pessoas reais;
- ao menos 1 aprendizado concreto registrado;
- participantes dizem que repetiriam o processo com ajustes conhecidos;
- privacidade e autoria não foram violadas.

## F2 — Três contextos diferentes

**Objetivo:** evitar desenhar o protocolo em torno de um único tipo de trabalho.

Rodar manualmente em três famílias quando surgirem naturalmente, por exemplo:

1. serviço intelectual/digital;
2. trabalho de especialista técnico/operacional;
3. colaboração com contribuição histórica, indicação, mentoria ou manutenção relevante.

Não precisa ser simultâneo nem remunerado da mesma forma.

Gate:

- taxonomia cobre a maior parte sem forçar tudo em `outra`;
- diferenças entre domínios aparecem como extensão, não como regra universal inventada;
- protocolo continua compreensível para quem não é técnico.

## F3 — Ingestão assistida de evidências

**Objetivo:** reduzir trabalho manual sem confundir o que é observável com o que importa.

Adapters possíveis, somente quando houver caso real:

- Git/GitHub;
- arquivos e documentos;
- tarefas/decisões;
- agenda/reuniões com consentimento;
- e-mail/mensagens apenas sob escopo e permissão;
- recibos/pagamentos;
- entregas e revisões;
- eventos do EGOS/Proof Chain.

Saída: **candidatos a claims**, nunca claims econômicos finais.

Obrigatório: depois da ingestão automática, pergunta de invisibilidade off-platform/histórica.

Gate:

- ingestão reduz esforço de registro;
- não aumenta vazamento ou falsa certeza;
- pelo menos um caso prova que o sistema encontrou algo útil **e** um caso prova que sabe dizer “não sei”.

## F4 — Contribution Graph sem reputação global

**Objetivo:** enxergar dependências ao longo do tempo.

Grafo mínimo:

```text
pessoa/entidade
  ↕ contribuiu / declarou / revisou
claim
  ↕ sustentado por
evidência
  ↕ relacionado a
resultado
  ↕ produziu / não medido
impacto
  ↕ reconhecido por
acordo/recibo
```

O grafo pode mostrar que uma contribuição antiga suporta várias entregas futuras. Ele **não calcula Cred**, ranking de pessoa ou “valor total humano”.

Gate:

- navegar de resultado → claim → evidência e de contribuição histórica → resultados derivados;
- privacidade por nó/aresta;
- revogação de exposição sem corromper a cadeia histórica.

## F5 — Assistente de atribuição

**Objetivo:** IA ajuda a enxergar, não a mandar.

Capacidades:

- detectar claims duplicados;
- sugerir categoria;
- perguntar por ausentes;
- mostrar evidência pró/contra;
- separar fato de interpretação;
- formular hipóteses contrafactuais como hipótese;
- gerar 2–3 alternativas de reconhecimento com diferenças explicadas;
- detectar base econômica indefinida;
- acusar quando uma proposta mexe na parcela de terceiro sem aceite.

Gate:

- goldens G1–G10;
- sugestões têm proveniência;
- taxa de erro e rejeição medida;
- nenhum teste permite fechamento automático de divisão.

## F6 — Motor de aprendizagem / policy lab

**Objetivo:** fechar o loop de autoaperfeiçoamento governado.

Componentes:

- policy registry versionado;
- telemetria mínima do processo;
- gerador de policy-candidate;
- replay histórico;
- fixtures sanitizadas;
- holdout quando houver volume;
- avaliador independente;
- Goodhart/adversarial eval;
- changelog e rollback.

Estados de policy:

`EXPERIMENTAL → CANDIDATE → PILOT → ADOPTED → DEPRECATED`

Promoção nunca automática em regra que afete dinheiro, autoria, privacidade ou consentimento.

Gate:

- uma policy-candidate melhora problema real medido;
- replay demonstra ganho ou tradeoff compreendido;
- responsável humano aprova;
- rollback provado.

## F7 — Reconhecimento retroativo assistido

**Objetivo:** dar memória à rede sem fabricar dívida.

Fluxo:

- resultado atual dispara revisão histórica;
- sistema encontra dependências anteriores e pergunta por contribuições humanas não registradas;
- pessoa escolhe se deseja propor reconhecimento;
- qualquer impacto econômico declara origem da parcela/fundo;
- reconhecimento não cria direito futuro por padrão;
- adendo preserva versões.

Gate:

- primeiro caso real em que reconhecimento retroativo é considerado útil pelos envolvidos;
- ninguém afetado economicamente sem aceite;
- narrativa histórica distinguida de causalidade provada.

## F8 — Dashboard / EGOS App

**Objetivo:** visual quando visual ajuda.

Visões candidatas:

- resultados em andamento;
- recibos aguardando alguém;
- claims sem evidência suficiente;
- contribuições invisíveis sugeridas para revisão;
- grafo de proveniência;
- acordos e adendos;
- políticas/evals;
- saúde do mecanismo;
- projeção pública sanitizada.

Não criar feed competitivo, leaderboard de pessoas ou “top contributor”.

Gate:

- interface reduz fricção medida do F1–F7;
- não cria comportamento performático para aparecer no painel.

## F9 — Execução econômica opcional

**Objetivo:** somente depois de o protocolo de decisão provar valor.

Possibilidades, a estudar juridicamente/contabilmente conforme o contexto:

- emissão de cobrança/fatura via sistemas adequados;
- ledger de pagamentos;
- divisão assistida após aceite;
- fundo comum transparente;
- remuneração por reutilização mediante acordo específico;
- prestação de contas pública sanitizada.

A inspiração de transparência financeira pode vir de ferramentas como Open Collective, mas o Cinco não precisa virar fiscal host nem copiar sua arquitetura.

Gate:

- enquadramento jurídico/contábil apropriado;
- partes entendem base de cálculo;
- fluxo de pagamento possui autorização forte e auditoria;
- reversibilidade/estorno tratados quando aplicável.

## F10 — Federação soberana

**Objetivo:** cada pessoa mantém seus dados e pode compartilhar apenas receipts/claims necessários.

- assinatura/identidade por node;
- recibos portáveis;
- provas por hash;
- compartilhamento granular;
- merge de grafos consentido;
- desconexão possível;
- políticas locais podem diferir, com versão declarada.

Gate:

- duas máquinas/pessoas trocam um recibo e validam a mesma versão sem entregar seus cofres locais;
- divergência de policy fica explícita, não silenciosa.

## F11 — Protocolo aberto / interoperabilidade

**Objetivo:** só se múltiplos contextos reais pedirem.

Possíveis artefatos:

- schema público estável;
- exemplos de adapters;
- assinatura de receipts;
- vocabulário de proveniência;
- suíte de conformidade;
- import/export para outros sistemas.

Não criar standard antes de existir diversidade de implementações reais.

## F12 — Pesquisa econômica avançada

Somente quando houver dados suficientes e consentidos:

- comparação entre formas fixas, percentuais e combinações;
- uso de Shapley **como lente comparativa**, não juiz;
- análise de coalizões: “que subconjuntos conseguiriam produzir o resultado?”;
- reconhecimento de infraestrutura e trabalho de manutenção;
- mecanismos de fundo comum;
- impacto retroativo;
- simulações de incentivos e ataques.

Qualquer resultado matemático deve ser mostrado ao lado das premissas; não usar precisão numérica para esconder incerteza humana.

---

# Braços transversais

## A. Segurança e privacidade

Local-first, minimização, mascaramento, segregação público/privado, hash/proveniência, consentimento e egress gates.

## B. Jurídico e contábil

Distinguir reconhecimento moral/autoral de obrigação econômica/contratual. Instrumento jurídico depende da relação concreta e da jurisdição.

## C. UX humana

Perguntas simples; um passo por vez; permitir `não sei`; explicar por que o sistema pergunta; reduzir burocracia a cada versão.

## D. Pesquisa e benchmark

Buscar antes de construir. Manter ADOPT/ADAPT/REJECT por referência externa; nunca copiar mecanismo econômico só porque é sofisticado.

## E. Anti-gaming

Goodhart gate, contramétricas, auditoria independente, análise de incentivos e detecção de atividade performática.

## F. Acessibilidade

Permitir contribuição por voz, texto, foto/documento, reunião e registro assistido — não privilegiar quem sabe Git ou escrever longo.

## G. Explicabilidade

Toda recomendação mostra evidências, lacunas, policy usada e quais pessoas precisam decidir.

## H. Memória temporal

Contribuições podem ganhar relevância depois; histórico nunca é achatado no último estado.

## I. Economia da rede

A divisão do serviço e eventual contribuição ao ecossistema são ledgers diferentes. Misturar ambos é erro de arquitetura.

## J. Governança de melhoria

O sistema pode criar candidatos de policy; promoção material exige humano e prova.

---

# O próximo movimento concreto

Não é F3 nem F8. É **F1**.

1. escolher o primeiro trabalho real adequado;
2. copiar o schema para um recibo privado/local;
3. registrar claims manualmente;
4. perguntar quem ficou invisível;
5. chegar a acordo sem algoritmo de percentual;
6. revisar depois do resultado;
7. transformar o que doeu em 1 policy-candidate;
8. só então decidir o próximo pedaço de software.

Esse é o endless-building gate desta frente.