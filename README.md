> **MIGRAÇÃO EGOS — 2026-10-01**
> Este repositório não é mais uma unidade canônica do EGOS.
> Nenhum roadmap, status, porta de entrada ou intenção futura vive aqui.
> O conteúdo válido está sendo absorvido por:
> - público compartilhável: [github.com/enioxt/cinco](https://github.com/enioxt/cinco) (site: [cinco.ia.br](https://cinco.ia.br))
> - o núcleo do EGOS é privado e não faz parte deste repositório.
> Até a migração terminar, este repositório é somente fonte histórica.

# @egosbr/governance-skill

**Enterprise governance patterns for LLM-driven projects** — Evidence-first validation, SSOT management, doc-drift protection, and claim-check enforcement.

> Exige evidência antes de uma afirmação de IA entrar em produção.

---

## Why this exists

Large LLM projects accumulate governance debt fast:

1. **Phantom claims** — SSOT tables score capabilities without evidence or validation
2. **Doc drift** — Documentation gets stale, links break, architecture doesn't match reality
3. **Hallucinated evidence** — AI-generated claims lack proof, leading to broken commitments
4. **Manual audit burden** — Scaling past ~50 docs requires human governance ops

`@egosbr/governance-skill` automates governance by injecting evidence-first patterns at pre-commit time.

---

## What it does

| Pattern | Check | Action |
|---------|-------|--------|
| **Evidence Gate** | Staged claims in markdown | Requires `VERIFIED_AT + method + evidence_path:line` tuples |
| **Doc-Drift Shield** | Broken refs, stale links | Blocks commit if refs broken + not marked `DOC-DRIFT-ACCEPTED` |
| **SSOT Validator** | Scored tables (%, Grade, Score) | Flags unverified scores + requires AUTO-GEN wrapper or evidence anchors |
| **Claim-Check CLI** | Cross-document consistency | Scans for phantom-prone patterns + outputs findings |

---

## Install

```bash
npm install @egosbr/governance-skill
```

Or from monorepo:
```bash
bun add @egosbr/governance-skill
```

---

## Quick start

### Hook-based (Pre-commit)

```bash
# Install as pre-commit hook
bun run governance-skill:install-hook

# .husky/pre-commit will now run evidence-gate
```

### CLI

```bash
# Audit repository for phantom claims
bun run governance-skill --scan . --json > audit.json

# Check specific file
bun run governance-skill --file docs/CAPABILITY_REGISTRY.md
```

### Programmatic

```ts
import {
  EvidenceGate,
  DocDriftShield,
  SSOTValidator,
  ClaimCheck,
} from '@egosbr/governance-skill';

// Before committing markdown files
const claims = [
  {
    text: 'Feature X is production-ready',
    file: 'docs/capabilities.md',
    line: 42,
  },
];

const gate = new EvidenceGate();
const result = gate.validate(claims);

if (!result.ok) {
  console.error(result.violations);
  // Violations: [{ claim, missing: ['VERIFIED_AT', 'evidence_path'] }]
}
```

---

## Patterns

### 1. Evidence Gate

Every claim in documentation must have:
- `VERIFIED_AT`: timestamp of last verification
- `method`: how it was verified (test, deploy log, curl, manual review)
- `evidence_path:line`: where the proof lives

**Example:**

```markdown
### API Performance

✅ **P99 latency < 100ms** 
- VERIFIED_AT: 2026-04-29
- method: Synthetic load test (k6, 10k req/s, 60s)
- evidence_path: `tests/performance/latency-sla.ts:42-68`

❌ **API processes 1M requests/day**
- evidence_path: MISSING → blocks commit
```

### 2. Doc-Drift Shield

Links and refs are verified on every commit. Broken links caught before merge.

```markdown
# Architecture Overview

See [Core Service](docs/modules/CORE.md) for details.
↑ This link will be checked. If CORE.md is deleted, commit fails unless:
<!-- DOC-DRIFT-ACCEPTED: Core docs merged into service-layer.md, refs updated -->
```

### 3. SSOT Validator

Scored tables get checked automatically.

**❌ Phantom (not allowed):**
```markdown
| Component | Completeness |
|-----------|--------------|
| Auth      | 85%          |
```

**✅ Valid (AUTO-GEN wrapped):**
```markdown
<!-- AUTO-GEN-BEGIN:auth-scores -->
| Component | Completeness | Verified | Evidence |
|-----------|--------------|----------|----------|
| Auth      | 85%          | 2026-04-29 | tests/auth/coverage-report.ts:112 |
<!-- AUTO-GEN-END -->
```

### 4. Claim-Check

Scan entire repo for phantom-prone patterns.

```bash
bun run governance-skill --scan ./docs --report phantoms

# Output
PHANTOM RISK: 5 unverified claims found
  - docs/roadmap.md:18: "H2 2026 feature release" (no VERIFIED_AT)
  - docs/performance.md:42: "99.99% uptime" (no evidence_path)
  ...

SUGGESTION: Add DOC-DRIFT-ACCEPTED comments or move to dedicated unverified section
```

---

## Configuration

```ts
const config = {
  // Strict mode: blocks all unverified claims
  strict: false,

  // Required fields for scored tables
  requiredFields: ['Verified', 'Evidence', 'Method'],

  // Ref check: validate links on commit
  checkRefs: true,

  // Grace period: allow unverified claims for N days (then block)
  gracePeriodDays: 7,

  // Exclude patterns
  exclude: ['node_modules/**', 'dist/**', '**/*.tmp'],
};
```

---

## Governance principles

1. **Evidence-first**: Claims without proof do not advance
2. **Automated checking**: No manual code review for governance
3. **Graceful blocking**: Clear error messages + remediation paths
4. **Zero false positives**: Tuned thresholds, not cargo-cult rules

---

## Real-world examples

These patterns were used in the EGOS core, which is private. The public part lives in [enioxt/cinco](https://github.com/enioxt/cinco).

---

## License

MIT — part of the EGOS ecosystem.

---

## See also

- [Guard Brasil](https://github.com/enioxt/guard-brasil-skill) — Brazilian AI safety layer
- EGOS (núcleo privado) — [parte pública em enioxt/cinco](https://github.com/enioxt/cinco)
