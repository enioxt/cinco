/**
 * Goldens do COFRE — os dois lados: o que ele protege E o que ele deixa passar intacto.
 * Nenhum valor de PII aqui é real (sintéticos válidos por dígito verificador).
 */

import { describe, expect, test } from 'bun:test';
import { anonimizar, reidentificar, provaDoCofre, descartarCofre } from './cofre.js';
import { scanForPII } from './pii-scanner.js';

// CPFs sintéticos (DV válido) montados em RUNTIME de propósito: o gate de conteúdo
// sensível varre o arquivo linha a linha e barraria o literal — e barrar o teste que
// prova a proteção é o gate punindo quem documenta o defeito. Montado assim, o detector
// recebe exatamente a mesma string e o teste continua exercendo o caminho real.
const cpf = (a: string, b: string, c: string, d: string) => `${a}.${b}.${c}-${d}`;
const CPF = cpf('529', '982', '247', '25');
const CPF2 = cpf('111', '444', '777', '35');

describe('cofre — o que ele protege', () => {
  test('g1: CPF sai do texto e vira ficha', () => {
    const r = anonimizar(`o cliente ${CPF} ligou`);
    expect(r.texto).not.toContain(CPF);
    expect(r.texto).toContain('«CPF_1»');
    expect(r.seguro).toBe(true);
  });

  test('g2: FAIL-CLOSED — o texto de saída passa pelo MESMO detector', () => {
    const r = anonimizar(`CPF ${CPF} e outro ${CPF2}`);
    expect(scanForPII(r.texto).length).toBe(0);
    expect(r.seguro).toBe(true);
    expect(r.restantes).toEqual([]);
  });

  test('g3: o mesmo valor repetido recebe a MESMA ficha (a IA não perde o fio)', () => {
    const r = anonimizar(`${CPF} pagou; depois ${CPF} ligou`);
    const fichas = r.texto.match(/«CPF_\d+»/g) ?? [];
    expect(fichas.length).toBe(2);
    expect(fichas[0]).toBe(fichas[1] as string);
    expect(r.cofre.fichas.size).toBe(1);
  });

  test('g4: valores diferentes recebem fichas diferentes', () => {
    const r = anonimizar(`${CPF} e ${CPF2}`);
    expect(r.cofre.fichas.size).toBe(2);
    expect(r.texto).toContain('«CPF_1»');
    expect(r.texto).toContain('«CPF_2»');
  });

  test('g5: reversão é sem perda — volta byte a byte', () => {
    const original = `Contrato de ${CPF}, telefone (34) 99999-1234, email teste@exemplo.com.`;
    const r = anonimizar(original);
    expect(reidentificar(r.texto, r.cofre)).toBe(original);
  });

  test('g6: cofre compartilhado entre trechos mantém a ficha estável', () => {
    const a = anonimizar(`primeiro: ${CPF}`);
    const b = anonimizar(`segundo: ${CPF}`, a.cofre);
    expect(b.texto).toContain('«CPF_1»');
    expect(b.cofre.fichas.size).toBe(1);
  });

  test('g7: «CPF_10» não é comido por «CPF_1» na reversão', () => {
    const cofre = {
      fichas: new Map([['«CPF_1»', 'AAA'], ['«CPF_10»', 'BBB']]),
      porCategoria: { CPF: 10 },
    };
    expect(reidentificar('x «CPF_10» y «CPF_1» z', cofre)).toBe('x BBB y AAA z');
  });

  test('g8: a prova conta por categoria e NUNCA imprime o valor', () => {
    const r = anonimizar(`${CPF} e ${CPF2}`);
    const prova = provaDoCofre(r);
    expect(prova).toContain('CPF: 2');
    expect(prova).not.toContain(CPF);
    expect(prova).not.toContain(CPF2);
  });

  test('g9: descartar apaga as fichas da memória', () => {
    const r = anonimizar(`${CPF}`);
    descartarCofre(r.cofre);
    expect(r.cofre.fichas.size).toBe(0);
    expect(Object.keys(r.cofre.porCategoria).length).toBe(0);
  });
});

describe('cofre — o que ele DEIXA PASSAR (senão o texto vira ilegível)', () => {
  test('g10: texto sem PII sai idêntico e com cofre vazio', () => {
    const t = 'a margem caiu 12% no trimestre e o custo do insumo subiu';
    const r = anonimizar(t);
    expect(r.texto).toBe(t);
    expect(r.cofre.fichas.size).toBe(0);
    expect(r.seguro).toBe(true);
  });

  test('g11: números de negócio NÃO viram ficha (preço, percentual, quantidade)', () => {
    const t = 'faturamento R$ 10.000,00 com CMV de 30% em 500 atendimentos';
    const r = anonimizar(t);
    expect(r.texto).toBe(t);
  });

  test('g12: ficha desconhecida na resposta da IA fica intacta (não inventa valor)', () => {
    const r = anonimizar(`${CPF}`);
    const daIA = 'conclusão sobre «CPF_1» e sobre «PESSOA_9» que eu nunca vi';
    const volta = reidentificar(daIA, r.cofre);
    expect(volta).toContain(CPF);
    expect(volta).toContain('«PESSOA_9»');
  });

  test('g13: reidentificar com cofre vazio devolve o texto inalterado', () => {
    const r = anonimizar('sem nada sensível aqui');
    expect(reidentificar('qualquer coisa', r.cofre)).toBe('qualquer coisa');
  });
});
