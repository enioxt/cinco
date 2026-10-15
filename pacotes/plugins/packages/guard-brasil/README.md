# @egosbr/guard-brasil

**Camada de segurança para IA em contexto brasileiro** — mascaramento de dados pessoais (PII), validação ética e cadeia de evidências auditável antes de qualquer texto chegar ao usuário.

> **Status:** em uso ativo · **Licença:** MIT · parte do framework [EGOS](https://github.com/enioxt/egos)

---

## Para que serve

Sistemas de IA implantados no Brasil costumam falhar em dois pontos:

1. **Exposição acidental de dados pessoais** — CPF, CNPJ, RG, placa, número de processo e telefone vazam nas respostas do modelo, contrariando a Lei 13.709/2018 (LGPD).
2. **Afirmações sem evidência** — modelos fazem promessas absolutas, inventam fontes ou citam dados que não existem, especialmente em contextos sensíveis (saúde, jurídico, financeiro).

`@egosbr/guard-brasil` intercepta os dois problemas **na camada de saída**, antes que o texto chegue a quem lê.

**Honestidade importante:** mascarar dados pessoais **não** torna uma operação inteira conforme à LGPD. Conformidade plena envolve base legal, encarregado (DPO), avaliação de impacto e outras obrigações fora do escopo desta biblioteca. Consulte assessoria jurídica para ambientes de produção com dados sensíveis.

---

## O que faz

| Camada | O que verifica | Ação |
|---|---|---|
| **PII Scanner BR** | Dados pessoais brasileiros (tabela abaixo) | Mascarar ou bloquear |
| **Validação ética** | Afirmações absolutas, dados fabricados, promessas falsas, entidades bloqueadas | Pontuar (0–100) + sinalizar |
| **Public Guard** | Classificação de sensibilidade + aviso de divulgação LGPD | Redigir + nota de rodapé |
| **Cadeia de evidências** | Rastreabilidade de afirmações + hash de auditoria | Construir bloco de evidências |

---

## Dados pessoais detectados

| Categoria | Exemplo | Substituição |
|---|---|---|
| CPF | `123.456.789-09` | `[CPF REMOVIDO]` |
| CNPJ | `00.000.000/0001-00` | `[CNPJ REMOVIDO]` |
| RG | `RG: 12.345.678-9` | `[RG REMOVIDO]` |
| Processo | `0001234-56.2024.1.02.0001` | `[PROCESSO REMOVIDO]` |
| Placa | `ABC-1D23` | `[PLACA REMOVIDA]` |
| Telefone | `(31) 99999-0000` | `[TELEFONE REMOVIDO]` |
| E-mail | `contato@empresa.com.br` | `[EMAIL REMOVIDO]` |
| Nome (contextual) | `Maria Souza` | `[NOME REMOVIDO]` |
| Nome em texto livre (PT-BR) | `sou a Maria Aparecida Silva` | `sou a [NOME REMOVIDO]` |
| Registro de conselho profissional | `CRM 12345`, `OAB/MG 123.456` | `[REGISTRO PROFISSIONAL REMOVIDO]` |
| Data de nasc. | `nascimento: 15/03/1985` | `[DATA REMOVIDA]` |
| Dado de saúde (LGPD art.11) | `portador de diabetes` | `[DADO DE SAÚDE REMOVIDO]` |

A detecção inclui validação de dígitos verificadores onde aplicável (CPF, CNPJ), reduzindo falsos positivos em relação a regex simples.

**Nomes em documentos policiais/jurídicos** (`src/lib/ner-rules.ts`) usam 10 regras heurísticas A–J (rótulo explícito, honorífico, maiúsculas, papel processual, assinatura, parentesco, parêntese após cargo, lista numerada, cargo policial, campo de parte) — todas as 10 têm golden case em `guard.test.ts` (medido 2026-09-01).

---

## Stack

- **Runtime:** Bun / Node.js (ESM)
- **Linguagem:** TypeScript (strict)
- **Empacotamento:** `dist/index.js` + tipos `dist/index.d.ts`

---

## Instalação

```bash
# npm
npm install @egosbr/guard-brasil

# Bun
bun add @egosbr/guard-brasil
```

---

## Quick start

```ts
import { GuardBrasil } from '@egosbr/guard-brasil';

const guard = GuardBrasil.create();

const result = guard.inspect(respostaDoLLM);

if (!result.safe) {
  console.log(result.output);          // texto já mascarado/limpo
  console.log(result.lgpdDisclosure);  // nota de rodapé LGPD
  console.log(result.summary);         // resumo legível das ocorrências
}
```

### Nomes em texto livre (a partir da 0.3.0)

Até a 0.2.x o Guard só pegava nome com rótulo ("Nome:", "Dr. X", "Paciente: X"). Em chat aberto a pessoa se
apresenta em frase corrida — "sou a Maria Aparecida Silva" passava inteiro. Agora `maskPII`, `detectPII`,
`namedTokenize`, `tokenize`, `scanForPII` e `GuardBrasil.inspect` também mascaram nome de pessoa em português
**sem chamar LLM**, por contexto + léxico:

| Evidência | Exemplo |
|---|---|
| Gatilho de apresentação | `sou a …`, `me chamo …`, `meu nome é …`, `chamo-me …`, `aqui é o …` |
| Honorífico / cargo | `Dr. …`, `Sra. …`, `Prof. …`, `Dona …`, `Seu …`, `Juiz …` |
| Vocativo | `Olá, …`, `Bom dia, …`, `Prezado …`, `Obrigada, …!` |
| Sequência capitalizada com léxico | 2 a 6 palavras com inicial maiúscula (+ `da/de/do/dos/das`) em que ao menos uma é prenome ou sobrenome comum |
| Prenome isolado | `Maria`, `Pedro` (fora da lista de ambíguos: `Rosa`, `Vitória`, `Israel`…) |

**O que é preservado:** instituições, ruas, leis, cidades e cargos — `Lei Maria da Penha`, `Rua José Bonifácio, Patos de Minas`,
`Prefeitura Municipal`, `Fundação Oswaldo Cruz`, `Av. Getúlio Vargas`. Palavra desconhecida nunca dispara sozinha
(só dentro de gatilho, honorífico ou vocativo).

**Desligar:** `nomes: false`.

```ts
GuardBrasil.create({ nomes: false });                       // inspect
maskPII(texto, undefined, 'full', { nomes: false });        // maskPII
namedTokenize(texto, { nomes: false });                     // tokenização reversível
scanForPII(texto, { nomes: false });                        // varredura
```

Com lista explícita de padrões o nome só entra se pedido: `maskPII(texto, ['cpf'])` não toca em nome; `['cpf', 'nome']` toca.

**Fontes e limites (medidos em 2026-10-10):**

- Prenomes: os 500 mais frequentes do IBGE "Nomes no Brasil" (Censo 2010), embutidos em `src/lib/prenomes-ibge.ts` com fonte
  e data; regenerável com `bun run scripts/gerar-prenomes-ibge.ts`. A API do IBGE só devolve o top 20 por consulta, então o
  corte do 500 é **aproximado** (candidatos = top 20 de 27 UFs × 9 décadas × 2 sexos + uma lista semente; o IBGE ordena).
- Sobrenomes: lista compilada à mão, **não medida contra base** — o IBGE não publica ranking de sobrenomes nessa API.
- Prenome fora do top 500 (ex.: `Enio`) solto no meio da frase, sem gatilho/honorífico/vocativo, **não é pego**.
  Sobrenome sozinho também não.
- Falso positivo: 0 de 50 frases institucionais escritas à mão e 0 de 188 frases institucionais extraídas dos `.md` do
  próprio repositório (os nomes alterados ali eram pessoas de verdade); recall em 30 frases com pessoa: 30/30.
  Amostras pequenas e escritas pelo mesmo autor das regras (otimistas) — não generalizam para qualquer texto.
- Custo: linear no texto, ~0,4 a 1,5 s por 190 KB.
- Mascarar nome não anonimiza: o contexto ao redor ainda pode identificar a pessoa.

---

## Configuração

```ts
const guard = GuardBrasil.create({
  // Bloquear a saída inteira quando encontrar dado crítico (CPF, RG)
  blockOnCriticalPII: false,   // padrão: false (mascara em vez de bloquear)

  // Adicionar nota LGPD ao final de saídas mascaradas
  lgpdDisclosure: true,        // padrão: true

  // Nome de pessoa em texto livre PT-BR (sem LLM) — false desliga
  nomes: true,                 // padrão: true (0.3.0+)

  // Validação ética
  atrian: {
    blockedEntities: ['TERMO_BLOQUEADO'],   // strings exatas → bloqueio imediato
    knownAcronyms: ['LGPD', 'SINESP'],     // suprimir falsos positivos de siglas
    onViolation: (result, text) => {
      logger.warn('Violação ética', result);
    },
  },
});
```

---

## Cadeia de evidências

Anexe afirmações rastreáveis para auditoria:

```ts
const result = guard.inspect(resposta, {
  sessionId: 'sessao-42',
  claims: [
    {
      claim: 'Registro encontrado no sistema',
      source: 'api-interna-v2',
      excerpt: 'Item #2024-0098765 — status: encerrado',
      confidence: 'high',
    },
  ],
});

console.log(result.evidenceBlock); // bloco de evidências com hash de auditoria
```

---

## Categorias de violação ética

| Categoria | Nível | Exemplo |
|---|---|---|
| `absolute_claim` | aviso | `"com certeza"`, `"sem dúvida"`, `"sempre"` |
| `fabricated_data` | erro | citar fonte/dado que não existe |
| `false_promise` | erro | `"vamos resolver"`, `"isso será encaminhado"` |
| `blocked_entity` | crítico | qualquer string listada em `blockedEntities` |
| `invented_acronym` | aviso | siglas em maiúsculas não reconhecidas |

---

## Testes e demo

```bash
bun test src/guard.test.ts src/nomes.test.ts   # 98 pass, 0 fail (medido 2026-10-10)
bun run src/demo.ts          # demo interativa
```

---

## Limites e honestidade

- Opera **na camada de saída** — não verifica o que entra no modelo nem controla o comportamento dele.
- A detecção de nomes próprios é contextual e pode gerar falsos positivos ou negativos (limites medidos na seção "Nomes em texto livre").
- Conformidade com a LGPD envolve dimensões legais, organizacionais e técnicas que vão além do mascaramento automatizado.

---

## English summary

`@egosbr/guard-brasil` is a TypeScript library that adds a Brazilian-context safety layer to LLM outputs. It masks Brazilian PII (CPF, CNPJ, RG, judicial process numbers, vehicle plates, etc.) with check-digit validation, scores outputs for ethical violations, and builds tamper-evident evidence chains for audit. Install via npm or Bun. The Portuguese sections above are canonical.

---

*Atualizado em 17 de junho de 2026 · MIT License · [egos.ia.br](https://egos.ia.br)*

<!-- EGOS-FILOSOFIA-BEGIN — gerado por scripts/filosofia-ponteiro.ts · NÃO EDITAR À MÃO -->
---

### Filosofia

**A regra roda, a prova abre, você decide.** Este módulo segue os cinco pilares do EGOS —
todo número tem fonte · a IA rascunha e o humano decide · a regra vira trava automática ·
o que é seu fica seu · o que não está pronto se declara.

História, fontes e o que ainda está em aberto: [`FILOSOFIA.md`](../../FILOSOFIA.md)
<!-- EGOS-FILOSOFIA-END -->
