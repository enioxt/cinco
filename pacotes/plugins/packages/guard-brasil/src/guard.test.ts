/**
 * @egos/guard-brasil — Tests
 *
 * Tests the GuardBrasil facade end-to-end with realistic inputs.
 */

import { describe, expect, it } from 'bun:test';
import { GuardBrasil } from './guard.js';
import { detectPII, INFRASTRUCTURE_SECRET_PATTERNS } from './pii-patterns.js';
import { namedTokenize, namedRestore } from './lib/tokenizer.js';
import { applyNERRules } from './lib/ner-rules.js';
import { scanForPII } from './lib/pii-scanner.js';
import pkg from '../package.json';

// Fake CPF fixtures — constructed dynamically so source has no literal \d{3}\.\d{3}\.\d{3}-\d{2}
const mkCpf = (a: string, b: string, c: string, d: string) => [a, b, c].join('.') + '-' + d;
const FAKE_CPF_1 = mkCpf('123', '456', '789', '09');
const FAKE_CPF_2 = mkCpf('999', '888', '777', '66');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGuard(blockOnCriticalPII = false) {
  return GuardBrasil.create({ blockOnCriticalPII, lgpdDisclosure: true });
}

// ─── Clean output ─────────────────────────────────────────────────────────────

describe('GuardBrasil — clean output', () => {
  it('marks a clean response as safe', () => {
    const guard = makeGuard();
    const result = guard.inspect('O processo está em andamento. Aguarde contato.');
    expect(result.safe).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.masking.findings).toHaveLength(0);
    expect(result.atrian.passed).toBe(true);
    expect(result.lgpdDisclosure).toBe('');
  });
});

// ─── PII detection ────────────────────────────────────────────────────────────

describe('GuardBrasil — PII detection', () => {
  it('detects and masks CPF', () => {
    const guard = makeGuard();
    const result = guard.inspect(`O CPF do solicitante é ${FAKE_CPF_1}.`);
    expect(result.masking.findings.some(f => f.category === 'cpf')).toBe(true);
    expect(result.output).not.toContain(FAKE_CPF_1);
    expect(result.output).toContain('[CPF REMOVIDO]');
    expect(result.safe).toBe(false);
  });

  it('detects Registro Geral wording as RG', () => {
    const guard = makeGuard();
    const result = guard.inspect('Registro Geral 123456789 do paciente foi apresentado.');
    expect(result.masking.findings.some(f => f.category === 'rg')).toBe(true);
  });

  it('detects MASP', () => {
    const guard = makeGuard();
    const result = guard.inspect('Delegado MASP: 1234567 presente.');
    expect(result.masking.findings.some(f => f.category === 'masp')).toBe(true);
    expect(result.output).not.toContain('1234567');
  });

  it('detects REDS', () => {
    const guard = makeGuard();
    const result = guard.inspect('REDS 2024/0098765 foi registrado.');
    expect(result.masking.findings.some(f => f.category === 'reds')).toBe(true);
  });

  it('adds LGPD disclosure when PII found', () => {
    const guard = makeGuard();
    // Dynamic construction so source never has \d{3}\.\d{3}\.\d{3}-\d{2} literally
    const fakeCpfLgpd = ['111', '222', '333'].join('.') + '-44';
    const result = guard.inspect(`CPF: ${fakeCpfLgpd}`);
    expect(result.lgpdDisclosure).toContain('LGPD');
    expect(result.lgpdDisclosure).toContain('13.709/2018');
  });

  it('does NOT add LGPD disclosure for clean output', () => {
    const guard = makeGuard();
    const result = guard.inspect('Sem dados pessoais aqui.');
    expect(result.lgpdDisclosure).toBe('');
  });

  it('detects CEP without misclassifying it as phone', () => {
    const guard = makeGuard();
    const result = guard.inspect('CEP 01310100 informado para entrega.');
    expect(result.masking.findings.some(f => f.category === 'cep')).toBe(true);
    expect(result.masking.findings.some(f => f.category === 'phone')).toBe(false);
  });

  // R-SEC-001-CEP-DECIMAL-001 (2026-09-14): fato gerador — o pre-commit acusou
  // `const MASSA_ATOMICA_NA = 22.98976928;` (packages/nutrition-engine/src/
  // definicoes.ts:42) como "[PII] CEP (confiança: low)". O ponto decimal era
  // tratado como fronteira válida pelo `\b`, e os 8 dígitos após o ponto
  // fechavam a conta de "CEP sem separador".
  it('does NOT misclassify a decimal fraction as CEP (R-SEC-001-CEP-DECIMAL-001)', () => {
    const guard = makeGuard();
    const result = guard.inspect('const MASSA_ATOMICA_NA = 22.98976928;');
    expect(result.masking.findings.some(f => f.category === 'cep')).toBe(false);
  });

  it('still detects a real CEP with hyphen (regression for the fix above)', () => {
    const guard = makeGuard();
    const result = guard.inspect('Endereço: Rua X, CEP 38700-000, cidade Y.');
    expect(result.masking.findings.some(f => f.category === 'cep')).toBe(true);
  });

  it('does not classify bare numeric codes as phone', () => {
    const guard = makeGuard();
    const result = guard.inspect('O código de barras é 789456123.');
    expect(result.masking.findings.some(f => f.category === 'phone')).toBe(false);
  });
});

// ─── ATRiAN validation ────────────────────────────────────────────────────────

describe('GuardBrasil — ATRiAN ethical validation', () => {
  it('flags absolute claim "com certeza"', () => {
    const guard = makeGuard();
    const result = guard.inspect('Com certeza o problema será resolvido.');
    expect(result.atrian.violations.some(v => v.category === 'absolute_claim')).toBe(true);
    // absolute claims are warnings, not errors — passes validation
    expect(result.atrian.score).toBeLessThan(100);
  });

  it('flags false promise', () => {
    const guard = makeGuard();
    const result = guard.inspect('Vamos resolver o caso imediatamente.');
    const hasFalsePromise = result.atrian.violations.some(v => v.category === 'false_promise');
    expect(hasFalsePromise).toBe(true);
    expect(result.atrian.passed).toBe(false);
  });

  it('flags fabricated data reference', () => {
    const guard = makeGuard();
    const result = guard.inspect('Segundo dados do Ministério da Justiça, 98% dos casos são resolvidos.');
    expect(result.atrian.violations.some(v => v.category === 'fabricated_data')).toBe(true);
    expect(result.atrian.passed).toBe(false);
  });

  it('blocks entity in blocklist', () => {
    const guard = GuardBrasil.create({ atrian: { blockedEntities: ['PROIBIDO'] } });
    const result = guard.inspect('Este sistema usa o módulo PROIBIDO para isso.');
    expect(result.atrian.violations.some(v => v.category === 'blocked_entity')).toBe(true);
    expect(result.atrian.passed).toBe(false);
    expect(result.output).toContain('***');
  });
});

// ─── blockOnCriticalPII ───────────────────────────────────────────────────────

describe('GuardBrasil — blockOnCriticalPII', () => {
  it('blocks output entirely when critical PII found and blockOnCriticalPII=true', () => {
    const guard = makeGuard(true);
    const result = guard.inspect(`O CPF do agente é ${FAKE_CPF_2}.`);
    expect(result.blocked).toBe(true);
    expect(result.output).toContain('[CONTEÚDO BLOQUEADO');
  });

  it('masks (not blocks) critical PII by default', () => {
    const guard = makeGuard(false);
    const result = guard.inspect(`CPF: ${FAKE_CPF_2}`);
    expect(result.blocked).toBe(false);
    expect(result.output).toContain('[CPF REMOVIDO]');
  });
});

// ─── Evidence chain ───────────────────────────────────────────────────────────

describe('GuardBrasil — evidence chain', () => {
  it('builds evidence chain when claims provided', () => {
    const guard = makeGuard();
    const result = guard.inspect('O suspeito foi identificado.', {
      sessionId: 'test-session',
      claims: [
        {
          claim: 'Suspeito identificado via sistema',
          source: 'boletim-interno',
          excerpt: 'registro #42',
          confidence: 'high',
        },
      ],
    });
    expect(result.evidenceChain).toBeDefined();
    expect(result.evidenceChain?.claims).toHaveLength(1);
    expect(result.evidenceChain?.auditHash).toMatch(/^ev-[0-9a-f]{64}$/);
    expect(result.evidenceBlock).toContain('[Evidências');
  });

  it('does not build evidence chain without claims', () => {
    const guard = makeGuard();
    const result = guard.inspect('Texto simples.');
    expect(result.evidenceChain).toBeUndefined();
    expect(result.evidenceBlock).toBeUndefined();
  });
});

describe('GuardBrasil — inspection receipt', () => {
  it('builds inspection hashes even without source provenance', () => {
    const guard = makeGuard();
    const result = guard.inspect('Texto simples.');
    expect(result.receipt.inputHash).toHaveLength(64);
    expect(result.receipt.outputHash).toHaveLength(64);
    expect(result.receipt.inspectionHash).toHaveLength(64);
    expect(result.receipt.provenanceLevel).toBe('inspection_only');
  });

  it('o recibo traz a versão do package.json (não uma constante esquecida)', () => {
    const result = makeGuard().inspect('Texto simples.');
    expect(result.receipt.guardVersion).toBe(pkg.version);
  });

  it('binds source provenance when source metadata is provided', () => {
    const guard = makeGuard();
    const result = guard.inspect(`CPF ${FAKE_CPF_1}`, {
      provenance: {
        sourceUrl: 'https://dados.exemplo.gov.br/arquivo.csv',
        sourceMethod: 'api',
        rawRow: { id: 7, cpf: FAKE_CPF_1 },
        query: 'cpf=12345678909',
        recordId: 'row-7',
      },
    });
    expect(result.receipt.provenanceLevel).toBe('source_row_bound');
    expect(result.receipt.source?.source_fingerprint).toHaveLength(64);
    expect(result.receipt.source?.raw_line_hash).toHaveLength(64);
    expect(result.receipt.source?.queryHash).toHaveLength(64);
  });
});

// ─── Combined scenario ────────────────────────────────────────────────────────

describe('GuardBrasil — combined scenario', () => {
  it('handles text with PII + ATRiAN violations simultaneously', () => {
    const guard = makeGuard();
    const text = `Com certeza o investigador de CPF ${FAKE_CPF_1} resolverá o caso. Vamos encaminhar isso agora.`;
    const result = guard.inspect(text);

    expect(result.safe).toBe(false);
    expect(result.output).not.toContain(FAKE_CPF_1);
    expect(result.atrian.violations.length).toBeGreaterThan(0);
    expect(result.summary).toContain('ATRiAN');
    expect(result.summary).toContain('PII');
    expect(result.lgpdDisclosure).toContain('LGPD');
  });
});

// ─── Missing PII patterns — full coverage ─────────────────────────────────────

describe('GuardBrasil — CNPJ detection', () => {
  it('detects and masks CNPJ formatted with dots and slash', () => {
    const guard = makeGuard();
    const result = guard.inspect('Empresa: 12.345.678/0001-90 solicitou acesso.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('12.345.678/0001-90');
    expect(result.output).toContain('[CNPJ REMOVIDO]');
  });

  it('detects CNPJ without separators', () => {
    const guard = makeGuard();
    const result = guard.inspect('CNPJ 12345678000190 do fornecedor.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('12345678000190');
  });

  it('REGRESSÃO — não confunde mantissa de float com CNPJ sem separador', () => {
    // Achado 2026-07-26 (packages/cost-engine): o regex original tinha todos
    // os separadores opcionais, e "1000 * 0.07 devolve 69.99999999999966"
    // disparava CNPJ — o ponto decimal cria boundary válido e a mantissa de
    // 14+ dígitos casa como CNPJ cru. R-SEC-001 bloqueava commit de código
    // legítimo por isso.
    const guard = makeGuard();
    const r1 = guard.inspect('`1000 * 0.07` devolve 69.99999999999966, e o banco guarda NUMERIC.');
    const r2 = guard.inspect('`1.005 * 100` === 100.49999999999999 por resíduo binário.');
    expect(r1.safe).toBe(true);
    expect(r2.safe).toBe(true);
  });
});

describe('GuardBrasil — CNH detection', () => {
  it('detects CNH preceded by keyword', () => {
    const guard = makeGuard();
    const result = guard.inspect('Habilitação: 12345678901 — condutor aprovado.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('12345678901');
    expect(result.output).toContain('[CNH REMOVIDO]');
  });

  it('detects CNH with keyword abbreviation', () => {
    const guard = makeGuard();
    const result = guard.inspect('CNH 98765432100 foi verificada.');
    expect(result.safe).toBe(false);
    expect(result.output).toContain('[CNH REMOVIDO]');
  });
});

describe('GuardBrasil — Phone detection', () => {
  it('detects mobile phone with DDD', () => {
    const guard = makeGuard();
    const result = guard.inspect('Contato: (31) 99999-8888 para mais informações.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('99999-8888');
    expect(result.output).toContain('[TELEFONE REMOVIDO]');
  });

  it('detects landline phone with +55 prefix', () => {
    const guard = makeGuard();
    const result = guard.inspect('Fone: +55 11 3333-4444');
    expect(result.safe).toBe(false);
    expect(result.output).toContain('[TELEFONE REMOVIDO]');
  });
});

describe('GuardBrasil — Email detection', () => {
  it('detects and masks email addresses', () => {
    const guard = makeGuard();
    const result = guard.inspect('Enviar para joao.silva@empresa.com.br urgente.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('joao.silva@empresa.com.br');
    expect(result.output).toContain('[EMAIL REMOVIDO]');
  });

  it('detects multiple emails in same text', () => {
    const guard = makeGuard();
    const result = guard.inspect('CC: a@b.com e c@d.org');
    expect(result.safe).toBe(false);
    const findings = result.output.match(/\[EMAIL REMOVIDO\]/g) ?? [];
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });
});

describe('GuardBrasil — SUS detection', () => {
  it('detects Cartão Nacional de Saúde (15 digits)', () => {
    const guard = makeGuard();
    const result = guard.inspect('Cartão SUS do paciente: 100 0000 0000 0001.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('100 0000 0000 0001');
    expect(result.output).toContain('[SUS REMOVIDO]');
  });
});

describe('GuardBrasil — NIS/PIS detection', () => {
  it('detects NIS/PIS number', () => {
    const guard = makeGuard();
    const result = guard.inspect('NIS do beneficiário: 123.45678.90-1');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('123.45678.90-1');
    expect(result.output).toContain('[NIS REMOVIDO]');
  });
});

describe('GuardBrasil — Processo Judicial detection', () => {
  it('detects CNJ process number', () => {
    const guard = makeGuard();
    const result = guard.inspect('Processo 1234567-89.2024.8.13.0001 em tramitação.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('1234567-89.2024.8.13.0001');
    expect(result.output).toContain('[PROCESSO REMOVIDO]');
  });
});

describe('GuardBrasil — Health condition detection (LGPD art.11)', () => {
  it('detects and masks a health condition disclosure end-to-end', () => {
    const guard = makeGuard();
    const result = guard.inspect('Paciente é portador de diabetes tipo 2, retornar ao ambulatório.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('diabetes');
    expect(result.output).toContain('[DADO DE SAÚDE REMOVIDO]');
    expect(result.masking.findings.some(f => f.category === 'health_data')).toBe(true);
  });

  it('detects "diagnosticado com" disclosure', () => {
    const guard = makeGuard();
    const result = guard.inspect('Paciente diagnosticado com câncer de pulmão.');
    expect(result.output).toContain('[DADO DE SAÚDE REMOVIDO]');
  });
});

describe('GuardBrasil — Date of birth detection', () => {
  it('detects and masks a labeled date of birth', () => {
    const guard = makeGuard();
    const result = guard.inspect('Data de nascimento: 15/03/1990.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('15/03/1990');
    expect(result.output).toContain('[DATA REMOVIDA]');
  });
});

describe('GuardBrasil — Vehicle plate detection', () => {
  it('detects old Brazilian plate format (AAA-0000)', () => {
    const guard = makeGuard();
    const result = guard.inspect('Veículo placa ABC-1234 envolvido no incidente.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('ABC-1234');
    expect(result.output).toContain('[PLACA REMOVIDA]');
  });

  it('detects Mercosul plate format (AAA0A00)', () => {
    const guard = makeGuard();
    const result = guard.inspect('Placa Mercosul: BCD1E23 do suspeito.');
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain('BCD1E23');
    expect(result.output).toContain('[PLACA REMOVIDA]');
  });

  // GUARD-PLACA-FN-001 (2026-07-27): a placa Mercosul escrita COM hífen — que é
  // como ela aparece em boletim de ocorrência, por hábito do formato antigo —
  // escapava dos dois patterns. Achado durante uma auditoria de PII (AUDIT-PII-001), com o
  // texto seguindo para provider externo sem masking.
  it('detects Mercosul plate written with a hyphen (FN-001)', () => {
    const guard = makeGuard();
    for (const phrase of ['Veículo abordado: placa ABC-1D23.', 'placa BCD 1E23 conferida']) {
      const result = guard.inspect(phrase);
      expect(result.output).toContain('[PLACA REMOVIDA]');
    }
  });

  // GUARD-PLACA-FP-001 (2026-06-21): "por 1000" e preços não podem virar placa.
  // Origem: bot de vendas Atende — "me vê ela por 1000?" virava [PLACA REMOVIDA]
  // antes do LLM (3 letras minúsculas + 4 dígitos casavam a regex com flag `i`).
  it('does NOT mask lowercase word + price as plate (FP-003)', () => {
    const guard = makeGuard();
    for (const phrase of ['me vê ela por 1000?', 'faz por 1500', 'sai por 1200 reais', 'a geladeira de 1200']) {
      const result = guard.inspect(phrase);
      expect(result.output).not.toContain('[PLACA REMOVIDA]');
    }
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('GuardBrasil — edge cases', () => {
  it('handles empty string without throwing', () => {
    const guard = makeGuard();
    const result = guard.inspect('');
    expect(result.safe).toBe(true);
    expect(result.output).toBe('');
    expect(result.masking.findings).toHaveLength(0);
  });

  it('handles very long input (10k chars) without performance failure', () => {
    const guard = makeGuard();
    const clean = 'Lorem ipsum dolor sit amet. '.repeat(357); // ~10k chars
    const start = Date.now();
    const result = guard.inspect(clean);
    expect(Date.now() - start).toBeLessThan(500);
    expect(result.safe).toBe(true);
  });

  it('handles PII embedded in large text', () => {
    const guard = makeGuard();
    const prefix = 'a'.repeat(5000);
    const suffix = 'b'.repeat(5000);
    const result = guard.inspect(`${prefix} CPF ${FAKE_CPF_1} ${suffix}`);
    expect(result.safe).toBe(false);
    expect(result.output).not.toContain(FAKE_CPF_1);
  });

  it('handles Unicode and accented characters without false positives', () => {
    const guard = makeGuard();
    const result = guard.inspect('Ação judicial — réu: João Ângelo Ávila Ção. Artigo 5º.');
    // This clean text with accents should not trigger PII
    expect(result.masking.findings.filter(f => f.category === 'cpf').length).toBe(0);
    expect(result.masking.findings.filter(f => f.category === 'cnpj').length).toBe(0);
  });

  it('does not mask numbers that are not PII (e.g. years, counts)', () => {
    const guard = makeGuard();
    const result = guard.inspect('Em 2024, foram registrados 1500 ocorrências no total.');
    expect(result.safe).toBe(true);
  });
});

describe('Infrastructure Secret Patterns — detectPII with INFRASTRUCTURE_SECRET_PATTERNS', () => {
  it('detects AWS Access Key', () => {
    const fakeAwsKey = 'AKIA' + 'IOSFODNN7EXAMPLE';
    const matches = detectPII(`key: ${fakeAwsKey}`, INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'aws_key')).toBe(true);
    expect(matches[0].matched).toBe('AKIA' + 'IOSFODNN7EXAMPLE');
  });

  it('detects GitHub personal access token (ghp_)', () => {
    const fakeGhToken = 'ghp_' + 'aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890';
    const matches = detectPII(`token: ${fakeGhToken}`, INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'github_token')).toBe(true);
  });

  it('detects Stripe live secret key', () => {
    const fakeStripe = ['sk', 'live', '51AbcDefGhIjKlMnOpQrStUv'].join('_');
    const matches = detectPII(`STRIPE_SECRET_KEY=${fakeStripe}`, INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'stripe_key')).toBe(true);
  });

  it('detects PostgreSQL connection string with credentials', () => {
    // Dynamic construction to avoid GitGuardian false positives on literal credential strings
    const fakeDbUrl = ['postgres', '//admin', 's3cr3t@db.example.internal', '5432/app'].join(':');
    const matches = detectPII(fakeDbUrl, INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'db_connection')).toBe(true);
  });

  it('detects api_key assignment in config', () => {
    const matches = detectPII("api_key = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'", INFRASTRUCTURE_SECRET_PATTERNS); // gitleaks:allow — chave fictícia de fixture de teste
    expect(matches.some(m => m.patternId === 'api_key_assignment')).toBe(true);
  });

  it('detects PEM private key header', () => {
    // Dynamic construction — avoid audit-secrets false positive on literal PEM header
    const pemHeader = ['-----', 'BEGIN RSA PRIVATE KEY', '-----'].join('');
    const matches = detectPII(pemHeader, INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'private_key')).toBe(true);
  });

  it('detects OpenSSH private key header', () => {
    const sshHeader = ['-----', 'BEGIN OPENSSH PRIVATE KEY', '-----'].join('');
    const matches = detectPII(sshHeader, INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches.some(m => m.patternId === 'private_key')).toBe(true);
  });

  it('does NOT flag normal text as a secret', () => {
    const matches = detectPII('O sistema está funcionando normalmente.', INFRASTRUCTURE_SECRET_PATTERNS);
    expect(matches).toHaveLength(0);
  });
});

// ─── namedTokenize — DataVirtus-compatible reversible redaction ───────────────

describe('namedTokenize — readable placeholders', () => {
  it('replaces CPF with [CPF_0001] and restores correctly', () => {
    // Dynamic construction to avoid pre-commit PII scanner false positive on fixture
    const fakeCpf = '123' + '.456.789-09';
    const text = `O CPF do suspeito é ${fakeCpf}.`;
    const { tokenized, vault } = namedTokenize(text);
    expect(tokenized).toContain('[CPF_0001]');
    expect(tokenized).not.toContain(fakeCpf);
    const restored = namedRestore(tokenized, vault);
    expect(restored).toContain(fakeCpf);
  });

  it('multiple distinct CPFs get sequential tokens', () => {
    // Dynamic construction: join array so source never has \d{3}\. directly
    const mkCpf = (a: string, b: string, c: string, d: string) => [a, b, c].join('.') + '-' + d;
    const cpf1 = mkCpf('111', '222', '333', '44');
    const cpf2 = mkCpf('555', '666', '777', '88');
    const text = `Autor: CPF ${cpf1}. Vítima: CPF ${cpf2}.`;
    const { tokenized } = namedTokenize(text);
    expect(tokenized).toContain('[CPF_0001]');
    expect(tokenized).toContain('[CPF_0002]');
  });

  it('same value repeated → same token (idempotent)', () => {
    const fakeCpf = '123' + '.456.789-09';
    const text = `CPF ${fakeCpf} e novamente CPF ${fakeCpf}.`;
    const { tokenized } = namedTokenize(text);
    const occurrences = (tokenized.match(/\[CPF_0001\]/g) ?? []).length;
    expect(occurrences).toBe(2);
    expect(tokenized).not.toContain('[CPF_0002]');
  });

  it('REDS gets [REDS_0001] token', () => {
    const text = 'Registro REDS 2024-00123456789-001 autuado.';
    const { tokenized, vault } = namedTokenize(text);
    expect(tokenized).toContain('[REDS_0001]');
    const restored = namedRestore(tokenized, vault);
    expect(restored).toContain('2024-00123456789-001');
  });

  it('clean text returns unchanged tokenized', () => {
    const text = 'Nenhum dado sensível aqui.';
    const { tokenized, vault } = namedTokenize(text);
    expect(tokenized).toBe(text);
    expect(vault.count).toBe(0);
  });
});

// ─── NER Rules A–J — structured name detection ────────────────────────────────

describe('NER Rules A–J — name detection in police documents', () => {
  it('Rule A — detects name after "Nome:"', () => {
    const findings = applyNERRules('Nome: João Silva Santos');
    expect(findings.some(f => f.matched.includes('João'))).toBe(true);
  });

  it('Rule B — detects name after honorific "Dr."', () => {
    const findings = applyNERRules('Responsável: Dr. Carlos Alberto Lima');
    expect(findings.some(f => f.matched.includes('Carlos'))).toBe(true);
  });

  it('Rule D — detects name after "Investigado:"', () => {
    const findings = applyNERRules('Investigado: Pedro Henrique Costa');
    expect(findings.some(f => f.matched.includes('Pedro'))).toBe(true);
  });

  it('Rule I — detects name after "Delegada:"', () => {
    const findings = applyNERRules('Delegada: Ana Paula Ferreira assinou o BO.');
    expect(findings.some(f => f.matched.includes('Ana'))).toBe(true);
  });

  it('Rule E — detects name in signature block ("Assinado por:")', () => {
    const findings = applyNERRules('Assinado por: Marcos Vinícius Rocha');
    expect(findings.some(f => f.matched.includes('Marcos'))).toBe(true);
  });

  it('Rule F — detects name via kinship reference ("filha de")', () => {
    const findings = applyNERRules('Ela é filha de Maria Aparecida Souza.');
    expect(findings.some(f => f.matched.includes('Maria'))).toBe(true);
  });

  it('Rule G — detects name in parentheses after role token', () => {
    const findings = applyNERRules('delegado (Marcos Vinícius Rocha) assinou o auto.');
    expect(findings.some(f => f.matched.includes('Marcos'))).toBe(true);
  });

  it('Rule H — detects names in a numbered witness list', () => {
    const findings = applyNERRules('Lista de testemunhas:\n1. João da Silva\n2. Maria Santos Pereira');
    expect(findings.some(f => f.matched.includes('João'))).toBe(true);
    expect(findings.some(f => f.matched.includes('Maria Santos'))).toBe(true);
  });

  it('Rule J — detects name after "Requerente:"', () => {
    const findings = applyNERRules('Requerente: Sabrina Costa Lima');
    expect(findings.some(f => f.matched.includes('Sabrina'))).toBe(true);
  });

  it('Rule C — detects ALL-CAPS proper name in police header', () => {
    const findings = applyNERRules('Suspeito identificado como JOAO DA SILVA SANTOS no boletim.');
    expect(findings.some(f => f.matched === 'JOAO DA SILVA SANTOS')).toBe(true);
  });

  it('does NOT flag CPF/REDS acronyms as ALL-CAPS names (Rule C stop list)', () => {
    const findings = applyNERRules(`CPF do autor: ${FAKE_CPF_1}. REDS registrado.`);
    const false_positives = findings.filter(f => f.matched === 'CPF' || f.matched === 'REDS');
    expect(false_positives).toHaveLength(0);
  });
});

// ─── deduplicateFindings — longer match wins at same position ─────────────────

describe('deduplicateFindings — custom pattern priority', () => {
  it('longer match at same start position survives deduplication', () => {
    // Two patterns that start at the same position; longer one should win
    const text = 'BO 2024/001234 registrado.';
    const findings = scanForPII(text);
    // Should not produce two overlapping findings
    for (let i = 0; i < findings.length - 1; i++) {
      expect(findings[i].end).toBeLessThanOrEqual(findings[i + 1].start);
    }
  });
});

// ─── GUARD-SAUDE-001 / GUARD-ATRIAN-SAFE-001 (2026-10-14) ─────────────────────
// VERMELHO-ANTES: os 3 primeiros casos de saúde e o de afirmação absoluta saíam safe:true no motor
// (medido no review do PR #803 — caso `saude` e `atrian-absoluto` de plugins/guard-brasil/review-cases.json).
describe('GuardBrasil — dado de saúde em PT-BR (CID, diagnóstico, medicamento, condição)', () => {
  const g = () => GuardBrasil.create({ telemetry: false });
  const sensiveis: Array<[string, string]> = [
    ['A paciente de teste informou diagnóstico de diabetes.', 'diabetes'],
    ['Afastado com CID F32.1 por 15 dias.', 'F32.1'],
    ['Atestado CID-10: E11 apresentado.', 'E11'],
    ['Ele toma fluoxetina 20mg desde março.', 'fluoxetina'],
    ['Paciente com HIV em uso de antirretrovirais.', 'HIV'],
    ['Ela sofre de depressão há anos.', 'depressão'],
    ['O paciente está com câncer de mama.', 'câncer'],
    ['Ela está grávida de 3 meses.', 'grávida'],
    ['Faz hemodiálise três vezes por semana.', 'hemodiálise'],
  ];
  for (const [texto, termo] of sensiveis) {
    it(`mascara: ${texto}`, () => {
      const r = g().inspect(texto);
      expect(r.safe).toBe(false);
      expect(r.masking.findings.some(f => f.category === 'health_data')).toBe(true);
      expect(r.masking.sensitivityLevel).toBe('high');
      expect(r.output).not.toContain(termo);
      expect(r.output).toContain('[DADO DE SAÚDE REMOVIDO]');
    });
  }
  // Falso-positivo: termo clínico sem pessoa, órgão de saúde, plano de saúde, datas e leis — não é dado de alguém.
  const limpos = [
    'A taxa de depressão cresceu no Brasil.',
    'A empresa tem um plano de saúde para os funcionários.',
    'A Lei 8.080/1990 dispõe sobre o SUS.',
    'A classificação CID-10 é publicada pela OMS.',
    'O relatório tem 40 páginas e uma tabela.',
    'Em 2024, foram registrados 1500 atendimentos no total.',
  ];
  for (const texto of limpos) {
    it(`não inventa dado de saúde: ${texto}`, () => {
      expect(g().inspect(texto).masking.findings.filter(f => f.category === 'health_data')).toEqual([]);
    });
  }
});

describe('GuardBrasil — afirmação absoluta do ATRiAN derruba safe', () => {
  it('"Com certeza ... nunca falha" → safe:false com absolute_claim no summary', () => {
    const r = GuardBrasil.create({ telemetry: false }).inspect('Com certeza esse procedimento resolve qualquer caso e nunca falha.');
    expect(r.masking.findings).toEqual([]);
    expect(r.atrian.violations.some(v => v.category === 'absolute_claim')).toBe(true);
    expect(r.safe).toBe(false);
    expect(r.summary).toContain('absolute_claim');
  });
  it('sigla possivelmente inventada sozinha continua só aviso (não derruba safe)', () => {
    const r = GuardBrasil.create({ telemetry: false }).inspect('O XPTOZ publicou a nota.');
    expect(r.atrian.violations.every(v => v.category === 'invented_acronym')).toBe(true);
    expect(r.safe).toBe(true);
  });
});
