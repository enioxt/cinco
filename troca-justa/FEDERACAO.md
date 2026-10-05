# Federação soberana de contribuição

> Estado: **CONCEPT / horizonte F10**. Este documento define semântica antes da tecnologia. Não exige blockchain, servidor central ou identidade global.

## 1. Princípio

Cada pessoa/node pode manter seu cofre local com evidências, recibos e contexto. Para cooperar, compartilha **somente o envelope necessário**, com proveniência e permissões.

O Cinco/EGOS não precisa possuir os dados para reconhecer que existe uma contribuição.

## 2. O que viaja

Envelope mínimo candidato:

```text
receipt/claim id
policy/schema version
resultado/escopo sanitizado
participante ou pseudônimo acordado
claim sanitizado
refs/hashes de evidência quando seguro
estado epistêmico
reconhecimento acordado que pode ser compartilhado
aceites/assinaturas necessárias
visibilidade e licença/permissões
adendos
```

A evidência bruta pode permanecer no node de origem.

## 3. O que não viaja por padrão

- documento bruto;
- conversa completa;
- chave/token;
- dado de cliente;
- valor privado;
- relação pessoal;
- localização;
- dado sensível;
- contexto que não é necessário para verificar o claim compartilhado.

## 4. Identidade

O protocolo não exige identidade civil global para todo uso.

Níveis possíveis conforme risco:

- identidade local/pseudônima;
- chave do node;
- conta/identidade da plataforma;
- identidade verificada por terceiro;
- assinatura profissional quando a relação concreta exigir.

Não coletar CPF/documento apenas para “fortalecer reputação”.

## 5. Integridade

Recibos podem futuramente usar:

- hash canônico;
- assinatura digital;
- timestamp;
- Merkle/ancoragem periódica quando houver motivo;
- OpenTimestamps/Bitcoin como possibilidade de prova temporal, se custo/benefício pedir.

**Hash não equivale a verdade.** Ele prova integridade de um conteúdo conhecido, não que a afirmação dentro dele seja verdadeira.

## 6. Merge sem verdade central

Dois nodes podem ter versões diferentes do mesmo claim.

Exemplo:

```text
Node A: C-17 = CORROBORADO
Node B: C-17 = CONTESTADO
```

A sincronização não deve escolher um vencedor por “last write wins”. Deve preservar:

- versão/origem de A;
- versão/origem de B;
- evidências de cada um;
- relação de contestação;
- eventual adendo/acordo posterior.

Conflito é dado do sistema.

## 7. Políticas diferentes

Nodes podem usar policies distintas.

Um receipt compartilhado declara a versão que o produziu. Outro node pode:

- aceitar a policy;
- reavaliar em sua policy local;
- marcar incompatibilidade;
- pedir mais evidência;
- recusar importação.

Interoperabilidade não exige uniformidade filosófica silenciosa.

## 8. Consentimento de compartilhamento

Permissões devem poder distinguir:

- compartilhar claim;
- compartilhar autoria/nome;
- compartilhar evidência bruta;
- permitir apenas verificação presencial/remota sem cópia;
- publicar case;
- reutilizar para pesquisa/eval;
- reutilizar para treino;
- usar comercialmente.

Um `sim` a uma finalidade não implica as outras.

## 9. Revogação

A pessoa pode interromper compartilhamento futuro e remover projeções sob controle do node/rede quando aplicável.

Mas uma federação precisa distinguir:

- revogar acesso futuro;
- apagar cópia em outro node;
- revogar publicação;
- invalidar um acordo já executado;
- preservar prova de que um evento histórico ocorreu.

Nem tudo é tecnicamente ou juridicamente reversível. A interface deve dizer isso antes do compartilhamento.

## 10. Descoberta de capability sem abrir o cofre

Um node pode anunciar:

```text
capability: X
estado: REAL/PILOT
provas: N receipts/provas privadas verificáveis + M públicas
oferta: sim/não/condicional
contato: canal escolhido
```

Sem expor os receipts privados.

Isso conecta Troca Justa ao Global Capability Graph: capability pública pode apontar para provas distribuídas e consentidas.

## 11. Value Receipt federado

Um resultado pode envolver nodes diferentes:

- A executou;
- B revisou;
- C forneceu conhecimento;
- cliente D confirmou resultado.

Cada node guarda suas evidências. O receipt federado referencia as provas sem centralizar todo o conteúdo.

## 12. Acordo econômico federado

Mesmo com receipts assinados, execução econômica continua separada.

O envelope pode registrar:

- forma de reconhecimento;
- base declarada;
- aceites;
- estado `proposed/accepted/executed`;
- referência ao instrumento adequado.

Não precisa carregar detalhes bancários nem executar pagamento.

## 13. Segurança de importação

Receipt recebido é **dado**, não instrução.

Antes de importar:

- validar schema;
- verificar tamanho/tipo;
- checar assinatura/hash quando aplicável;
- não executar conteúdo embutido;
- tratar texto como não confiável para prompt injection;
- aplicar policy local de privacidade;
- manter namespace/origem;
- recusar versão incompatível explicitamente.

## 14. Sem blockchain por reflexo

O problema principal é governança/proveniência, não consenso global.

Começar com arquivos/JSON assináveis e nodes soberanos. Só avaliar ledger distribuído/ancoragem quando existir um problema concreto que hash/timestamp/assinatura simples não resolvam.

## 15. Golden futuro F10

Duas pessoas em máquinas diferentes:

1. criam claims locais;
2. compartilham um receipt sanitizado;
3. validam schema e proveniência;
4. uma contesta um claim;
5. a contestação retorna sem apagar a versão original;
6. ambas chegam a um adendo aceito;
7. evidência bruta nunca sai dos cofres;
8. desconectar um node impede novos compartilhamentos sem corromper o histórico já aceito.

Só depois desse golden faz sentido chamar a camada de federada.