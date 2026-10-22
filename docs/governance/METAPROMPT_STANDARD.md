# METAPROMPT_STANDARD — Requisitos Mínimos para Comandar Avaliadores

> **Referência** — Audiência: AI⟷AI.
> **Escopo:** todo comando que você manda uma inteligência artificial AVALIAR — revisar um código, criticar um plano, dar um parecer — deve cumprir os 6 requisitos abaixo. Avaliador que recebe comando incompleto não deveria executar: deveria pedir o que falta.
> **Como usar:** é uma régua de conferência, não um programa. Antes de mandar o comando, passe os 6 requisitos e veja se falta algum. No sistema de origem existe uma ferramenta que checa isso; aqui a checagem é sua, e funciona igual.

---

## §1. Os 6 Requisitos Mínimos (MP-R1..R6)

| # | Requisito | O que exige | Falha típica |
|---|---|---|---|
| MP-R1 | **CONTEXTO** | O que existe HOJE: paths reais, SHAs, estado verificado (REAL/CONCEPT/PHANTOM). Mínimo: 1 path ou SHA citável. | "avalie o sistema" sem dizer qual |
| MP-R2 | **OBJETIVO VERIFICÁVEL** | Pergunta/missão com critério de aceite mensurável. Como o avaliador sabe que respondeu? | "o que acha?" aberto |
| MP-R3 | **RESTRIÇÕES** | Red Zones aplicáveis, frozen zones, regras T0/T1 relevantes, o que NÃO fazer. | avaliador propõe force-push |
| MP-R4 | **EVIDÊNCIA EXIGIDA** | Que prova o avaliador deve citar/exigir nas afirmações dele (file:line, output, teste). Claim sem prova = inválida. | review "parece bom" |
| MP-R5 | **FORMATO DE SAÍDA** | Estrutura da resposta (seções, verdict, tabela). Output não-parseável = retrabalho. | prosa livre de 3 páginas |
| MP-R6 | **POINTER DE REGRAS** | Link para este arquivo + regras citadas, para o avaliador (e quem ler depois) saber onde as regras vivem. | conhecimento implícito perdido |

## §2. Protocolo de Recusa (fail-closed)

Avaliador que recebe comando sem MP-R1..R6:

```
⛔ METAPROMPT INCOMPLETO — não executado.
Faltam: [MP-R1 contexto | MP-R2 objetivo | ...]
Regras: docs/governance/METAPROMPT_STANDARD.md (EGOS kernel)
Reenvie cumprindo os 6 requisitos.
```

Override consciente (humano): `EGOS_MP_GATE_OVERRIDE=1` (logado, nunca default).

## §3. Template Canônico (copiar e preencher)

```markdown
## METAPROMPT — [título]
**MP-R1 CONTEXTO:** [o que existe: paths, SHAs, estado classificado]
**MP-R2 OBJETIVO:** [pergunta + critério de aceite verificável]
**MP-R3 RESTRIÇÕES:** [Red Zones, frozen, regras T0/T1 aplicáveis]
**MP-R4 EVIDÊNCIA:** [que prova exigir em cada claim do avaliador]
**MP-R5 SAÍDA:** [estrutura exata da resposta]
**MP-R6 REGRAS:** docs/governance/METAPROMPT_STANDARD.md + [regras citadas]
```

## §3.1. Perfil REVIEW (quando o objetivo é revisar código/arquitetura)

O template §3 é orientado a decisão. Para **review** (Banda, Codex, critico, code-review), MP-R5 (SAÍDA) DEVE exigir, além do formato:
- **Achados ranqueados por severidade** (crítico → alto → médio → baixo). Sem ranking = retrabalho de triagem.
- **Cenário de falha concreto por achado** (inputs/estado → saída errada/crash). Achado sem repro plausível não sobe de severidade.
- **Confiança classificada** (CONFIRMADO = verifiquei / PLAUSÍVEL = suspeito, não confirmei). Espelha REAL/CONCEPT/PHANTOM (P1).
- **Escopo explícito em MP-R1**: quais camadas/arquivos estão DENTRO e FORA do review (evita o avaliador varrer tudo e diluir).

Princípio de origem: quanto melhor o pedido, melhor a resposta.

## §3.2. Perfil AVALIADOR EXTERNO (IA fora da casa, sem acesso ao repo)

Vale quando o comando vai para ChatGPT, Gemini, Perplexity ou qualquer modelo que **não abre o
disco**: recebe anexos e mais nada. Três dos seis requisitos mudam de forma, e um deles **inverte**.

- **MP-R6 vai INLINE, nunca como link.** O padrão manda apontar onde as regras vivem; para fora,
  apontar é ponteiro morto (`R-PONTEIRO-001`) — o avaliador não abre `docs/governance/*.md`.
  Escreva as regras que governam a resposta dele **dentro do prompt**, inteiras.
- **MP-R1 troca path/SHA por ESTADO DECLARADO.** Caminho real não serve a quem não tem o repo, e
  em pacote de cliente ainda vaza estrutura. No lugar: versão, se é `DRAFT`, o que é mascaramento
  da cópia × lacuna do documento, e se os números citados foram **executados** ou somados.
- **MP-R1 tem um limite que o perfil interno não tem: NÚMERO QUE VOCÊ ESCREVE É NÚMERO QUE ELE
  REPETE.** Medido 2026-08-20: três modelos devolveram um número errado meu porque leram o meu
  rodapé em vez de contar os arquivos. Contagem aferível pelo próprio avaliador **não se declara** —
  peça que ele conte. É a inversão: aqui, informar a mais **piora** a medição.
- **MP-R2 fecha com condições, não com pergunta.** Sem repositório, o avaliador não tem como
  verificar sozinho se cobriu — a lista numerada de "sua resposta está completa quando…" é o único
  critério de aceite que sobrevive à distância. Resposta evasiva na pergunta central invalida o
  resto: diga isso, com essas palavras.
- **MP-R3 restringe o RIGOR, não a CONCLUSÃO.** Proibir uma resposta é ancorar, e ancoragem mata a
  independência que motivou a consulta externa. Proíba o que não é conclusão: depender de o outro
  lado não perceber · retroagir data · inventar precedente · afirmar sem dizer qual base sustenta.

Fato gerador: rodada de ontologia jurídica 2026-08-20 — o prompt cumpria **2 de 6** (MP-R4, MP-R5),
com MP-R2 e MP-R6 **ausentes**, e foi escrito sem que este arquivo fosse aberto (`R-DISCOVER-001`).

## §4. Relação com o que já existe

Esta régua não depende de nenhuma ferramenta. No sistema de origem ela tem apoios — uma
biblioteca de comandos prontos por capacidade, um verificador que recusa comando sem
contexto, e um protocolo para decisões críticas que consulta três inteligências diferentes.
Nada disso é necessário para usar os 6 requisitos: eles funcionam com a régua na mão.
- Quorum Protocol (`docs/governance/QUORUM_PROTOCOL.md`) — decisões críticas 3+ LLMs: cada LLM recebe metaprompt §3.

*Regra de origem: só aceitar comandos com requisitos mínimos; sem eles, apontar onde as regras vivem.*
