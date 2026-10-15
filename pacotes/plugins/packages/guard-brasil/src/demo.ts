/**
 * EGOS Guard Brasil — Demo
 *
 * Simulates a real use case: an AI customer-service chatbot for a Brazilian
 * e-commerce store processes an LLM response containing:
 *   - CPF / credit-card / phone / e-mail / CEP identifiers (PII)
 *   - An absolute claim without hedging ("com certeza", "98%")
 *   - A false promise of action
 *
 * The Guard Brasil layer intercepts, masks, validates, and audits it before
 * anything reaches the customer.
 */

import { GuardBrasil } from './guard.js';

const SEPARATOR = '─'.repeat(72);

// Simulated LLM output — this is what the model returned before safety checks
const RAW_LLM_RESPONSE = `
Prezado cliente Marcos Antônio de Souza (CPF 123.456.789-09), confirmamos o
pedido no cartão final 4532 8801 2345 6789, com entrega no CEP 30140-071.
Qualquer dúvida, ligue (31) 98765-4321 ou escreva para marcos.souza@email.com.

Com certeza seu pedido chega até amanhã — vamos priorizar o envio agora mesmo.

Segundo dados internos, 98% das entregas nessa região saem em 24 horas.
`.trim();

console.log(SEPARATOR);
console.log('EGOS Guard Brasil — Demo v0.1.0');
console.log(SEPARATOR);
console.log('\n📥 RAW LLM OUTPUT (before safety checks):\n');
console.log(RAW_LLM_RESPONSE);

// Create guard instance
const guard = GuardBrasil.create({
  lgpdDisclosure: true,
  blockOnCriticalPII: false, // mask, don't block
  atrian: {
    onViolation: (result) => {
      console.log(`\n⚠️  ATRiAN violation callback: score=${result.score}, violations=${result.violations.length}`);
    },
  },
});

// Inspect with evidence claims
const result = guard.inspect(RAW_LLM_RESPONSE, {
  sessionId: 'demo-loja-001',
  claims: [
    {
      claim: 'Pedido confirmado e em preparação para envio',
      source: 'sistema-de-pedidos-v2',
      excerpt: 'Pedido #88012345 confirmado em 21/07',
      confidence: 'high',
    },
  ],
});

console.log('\n' + SEPARATOR);
console.log('📊 INSPECTION RESULTS');
console.log(SEPARATOR);

console.log(`\n🔒 Safe to publish: ${result.safe ? '✅ YES' : '❌ NO'}`);
console.log(`🚫 Blocked entirely: ${result.blocked ? 'YES' : 'NO'}`);
console.log(`📋 Summary: ${result.summary}`);

console.log('\n' + SEPARATOR);
console.log('🧬 ATRiAN ETHICAL VALIDATION');
console.log(SEPARATOR);
console.log(`Score: ${result.atrian.score}/100`);
console.log(`Passed: ${result.atrian.passed ? '✅' : '❌'}`);
if (result.atrian.violations.length > 0) {
  console.log('\nViolations:');
  for (const v of result.atrian.violations) {
    const icon = { info: 'ℹ️', warning: '⚠️', error: '🔴', critical: '🚨' }[v.level];
    console.log(`  ${icon} [${v.level.toUpperCase()}] ${v.category}: "${v.matched}"`);
    console.log(`     → ${v.message}`);
  }
}

console.log('\n' + SEPARATOR);
console.log('🔍 PII FINDINGS');
console.log(SEPARATOR);
console.log(`Sensitivity Level: ${result.masking.sensitivityLevel.toUpperCase()}`);
console.log(`Findings: ${result.masking.findings.length}`);
if (result.masking.findings.length > 0) {
  for (const f of result.masking.findings) {
    console.log(`  • [${f.label}] "${f.matched}" → ${f.suggestion}`);
  }
}

console.log('\n' + SEPARATOR);
console.log('✅ SAFE OUTPUT (after masking)');
console.log(SEPARATOR);
console.log('\n' + result.output);

if (result.lgpdDisclosure) {
  console.log('\n' + result.lgpdDisclosure);
}

if (result.evidenceBlock) {
  console.log('\n' + SEPARATOR);
  console.log('📎 EVIDENCE CHAIN');
  console.log(SEPARATOR);
  console.log('\n' + result.evidenceBlock);
}

console.log('\n' + SEPARATOR);
console.log('✓ Guard Brasil demo complete.');
console.log(SEPARATOR + '\n');
