# Piloto F1 — primeiro recibo real manual

> Objetivo: provar se o protocolo ajuda pessoas reais a reconhecer contribuição e chegar a um acordo melhor **antes** de construir engine, dashboard, ranking ou algoritmo de divisão.

## Pré-condições

O piloto só começa quando existir:

- 1 trabalho/resultado concreto e delimitável;
- 2 ou 3 pessoas que participaram ou serão afetadas;
- liberdade real para discordar e dizer “não sei”;
- lugar privado/local para nomes, valores, clientes e evidências sensíveis;
- entendimento de que o sistema organiza a conversa, não decide a divisão;
- possibilidade de revisar o acordo depois do resultado.

Evitar como primeiro caso:

- conflito jurídico já aberto entre participantes;
- relação em que uma pessoa não consegue recusar sem consequência desproporcional;
- disputa societária/empregatícia complexa;
- situação em que a própria existência do registro cria risco desnecessário;
- caso cujo valor dependa de segredo profissional ou dado que não possa ser minimizado.

## Passo 1 — definir a fronteira

Copiar [`RECIBO_TEMPLATE.md`](RECIBO_TEMPLATE.md) para um arquivo privado/local.

Responder primeiro:

> “Qual resultado específico estamos tentando reconhecer?”

Exemplos bons:

- entrega X concluída;
- serviço Y prestado entre datas A e B;
- projeto Z até o marco de entrega N.

Exemplos ruins:

- “tudo que fizemos juntos”;
- “nossa amizade”;
- “a empresa inteira” sem período/resultado;
- “quem mais ajudou na vida”.

## Passo 2 — primeira coleta independente

**Hipótese de desenho a testar:** antes da conversa em grupo, cada participante lista separadamente:

- o que fez;
- quem mais contribuiu;
- quais evidências lembra;
- o que considera invisível nos registros;
- o que não sabe medir.

Motivo: reduzir ancoragem na fala da pessoa mais rápida, mais técnica ou mais influente. Isso é hipótese do piloto, não regra constitucional.

O sistema consolida depois, preservando divergências.

## Passo 3 — importar apenas evidência mínima

No F1, fazer manualmente. Nada de construir adapter.

Fontes possíveis:

- commits/PRs;
- documento entregue;
- revisão/diff;
- tarefa/decisão;
- reunião ou mensagem consentida;
- prova de entrega;
- declaração humana;
- registro histórico relevante.

Não cole dados sensíveis no repositório público. Quando possível, use referência/hash no recibo e mantenha o conteúdo bruto no cofre local.

## Passo 4 — pergunta obrigatória de invisibilidade

Depois da primeira lista, perguntar a todos:

> “Quem ou o que ajudou este resultado a existir e não aparece nesses registros?”

Passar pelo checklist do template: especialista verbal, ensino anterior, revisão, origem, coordenação, cuidado/contexto, risco, infraestrutura, manutenção, contribuição histórica.

Registrar também “não sei”.

## Passo 5 — separar fato, atribuição, impacto e reconhecimento

Para cada claim:

- **fato:** o que ocorreu?;
- **atribuição:** quem participou?;
- **impacto:** o que conseguimos observar?;
- **reconhecimento:** o que as pessoas desejam fazer com isso?

Nunca preencher a quarta coluna automaticamente a partir das três primeiras.

## Passo 6 — contraditório

Cada participante vê os claims relevantes e pode:

- confirmar;
- corrigir;
- adicionar evidência;
- contestar;
- apontar ausente;
- responder “não sei”.

O sistema registra a divergência em vez de resolvê-la por autoridade algorítmica.

## Passo 7 — só então conversar sobre reconhecimento

A IA pode organizar 2–3 alternativas, por exemplo:

- autoria/crédito apenas;
- valor fixo;
- percentual com base econômica explícita;
- reconhecimento saindo da parcela própria;
- participação limitada àquela etapa;
- revisão futura após resultado;
- nenhuma transferência econômica agora.

Se houver percentual, escrever literalmente:

> “X% de ______.”

Sem preencher o espaço (receita recebida, margem, parcela própria, valor de um contrato etc.), a proposta é incompleta.

## Passo 8 — aceite exato

Gerar uma versão do recibo e, se possível, hash.

Cada pessoa afetada marca sua própria decisão sobre aquela versão:

- aceita;
- rejeita;
- aceita com ressalva;
- pendente.

Silêncio não é aceite.

## Passo 9 — executar sem automação econômica

No F1 o protocolo pode registrar o acordo, mas **não executa pagamento, cobrança, repasse ou redistribuição**. A execução segue os meios e instrumentos jurídicos/contábeis apropriados ao caso.

## Passo 10 — revisão pós-resultado

Quando houver resultado observável, perguntar individualmente:

- você manteria a decisão?;
- alguém ficou subestimado?;
- alguém ficou superestimado?;
- apareceu manutenção/risco que não vimos?;
- algum claim mudou de estado?;
- precisamos de adendo?

Adendo não apaga versão anterior.

## Passo 11 — learning receipt

Medir o mecanismo:

- quantas contribuições surgiram só após a pergunta de invisibilidade?;
- quantos claims foram contestados?;
- quais evidências resolveram dúvidas?;
- quanto tempo/fricção o processo adicionou?;
- que campo ninguém entendeu/usou?;
- a IA esqueceu alguém?;
- uma sugestão induziu ancoragem ou desconforto?;
- houve sinal de gaming?;
- os participantes repetiriam o processo?;
- qual seria a única mudança de policy mais útil?

## Critério de sucesso do F1

F1 não precisa produzir “divisão perfeita”. Passa se:

1. a fronteira do resultado ficou clara;
2. todos puderam contestar sem o sistema escolher lado;
3. contribuição invisível teve espaço real de entrada;
4. acordo final foi humano e versionado;
5. nenhuma pessoa virou score;
6. dados privados não foram expostos por conveniência;
7. a revisão posterior produziu pelo menos um aprendizado concreto;
8. conseguimos dizer com evidência se o recibo ajudou ou só criou burocracia.

## Saída do piloto

O output esperado não é software. É:

- 1 recibo real privado;
- 1 versão sanitizada opcional, se todos quiserem;
- 1 learning receipt;
- no máximo 1–3 policy-candidates bem justificadas;
- decisão explícita: continuar, adaptar ou abandonar a abordagem.

Só depois disso o F2/F3 recebe autorização prática.